import db, { queries } from '../db/index.js';
import { skuProfitability, customerProfitability, calculateLeakage } from './analyticsService.js';

/**
 * AI Recommendation Engine for MarginMap
 * Analyzes transaction data to generate actionable profit improvement recommendations
 */

export function generateRecommendations() {
  const recommendations = [];
  const transactions = db.prepare('SELECT * FROM transactions').all();

  if (transactions.length === 0) {
    return [];
  }

  const targetMargin = parseFloat(process.env.TARGET_MARGIN_PERCENT || 55);

  // Get unique SKUs, customers, and regions
  const skuCodes = [...new Set(transactions.map(t => t.sku_code))];
  const customers = [...new Set(transactions.map(t => t.customer_name))];
  const regions = [...new Set(transactions.map(t => t.region).filter(r => r))];

  // 1. Analyze low-margin SKUs
  for (const skuCode of skuCodes) {
    const skuData = skuProfitability(skuCode);

    if (skuData.marginPercent < targetMargin) {
      const marginGap = targetMargin - skuData.marginPercent;
      const requiredPriceIncrease = (marginGap / 100) * skuData.totalRevenue / skuData.totalUnits;
      const dollarImpact = (marginGap / 100) * skuData.totalRevenue;

      recommendations.push({
        category: 'pricing',
        priority: dollarImpact > 10000 ? 'high' : dollarImpact > 5000 ? 'medium' : 'low',
        issue_text: `SKU ${skuCode} (${skuData.skuName}) margin is ${skuData.marginPercent.toFixed(1)}%, below target ${targetMargin}%`,
        suggested_action: `Increase price by $${requiredPriceIncrease.toFixed(2)} per unit to reach target margin. This affects ${skuData.totalUnits} units.`,
        dollar_impact: Math.round(dollarImpact),
        impact_percent: marginGap,
        sku_code: skuCode
      });
    }

    // 2. Analyze high discount rates
    if (skuData.totalDiscount > 0) {
      const avgDiscount = skuData.totalDiscount / skuData.totalUnits;
      const discountPercent = (avgDiscount / (skuData.totalRevenue / skuData.totalUnits + avgDiscount)) * 100;

      if (discountPercent > 10) {
        recommendations.push({
          category: 'discount',
          priority: skuData.totalDiscount > 5000 ? 'high' : 'medium',
          issue_text: `SKU ${skuCode} (${skuData.skuName}) has ${discountPercent.toFixed(1)}% average discount rate, eroding $${skuData.totalDiscount.toFixed(0)} in margin`,
          suggested_action: `Reduce promotional discounting or implement tiered pricing. Reducing discount by 5% recovers $${(skuData.totalDiscount * 0.5).toFixed(0)}.`,
          dollar_impact: Math.round(skuData.totalDiscount * 0.5),
          impact_percent: discountPercent / 2,
          sku_code: skuCode
        });
      }
    }

    // 3. Analyze high return rates
    if (skuData.returnRate > 5) {
      const returnCost = skuData.totalReturns * (skuData.totalCogs / skuData.totalUnits);

      recommendations.push({
        category: 'returns',
        priority: returnCost > 3000 ? 'high' : 'medium',
        issue_text: `SKU ${skuCode} (${skuData.skuName}) has ${skuData.returnRate.toFixed(1)}% return rate (${skuData.totalReturns} units returned)`,
        suggested_action: `Investigate quality issues, packaging, or fulfillment. Reducing returns by 50% saves $${(returnCost * 0.5).toFixed(0)}.`,
        dollar_impact: Math.round(returnCost * 0.5),
        impact_percent: skuData.returnRate / 2,
        sku_code: skuCode
      });
    }

    // 4. Analyze customer-specific margin erosion
    const customerEntries = Object.entries(skuData.customerBreakdown);
    const avgSkuMargin = skuData.marginPercent;

    for (const [customerName, custData] of customerEntries) {
      if (custData.margin < avgSkuMargin - 10 && custData.revenue > 1000) {
        const marginDiff = avgSkuMargin - custData.margin;
        const potentialGain = (marginDiff / 100) * custData.revenue;

        recommendations.push({
          category: 'customer_pricing',
          priority: potentialGain > 5000 ? 'high' : 'medium',
          issue_text: `${customerName} purchases ${skuCode} (${skuData.skuName}) at ${custData.margin.toFixed(1)}% margin vs. ${avgSkuMargin.toFixed(1)}% average`,
          suggested_action: `Renegotiate pricing with ${customerName} or reduce customer-specific discounts. Aligning to average margin adds $${potentialGain.toFixed(0)}.`,
          dollar_impact: Math.round(potentialGain),
          impact_percent: marginDiff,
          sku_code: skuCode,
          customer_name: customerName
        });
      }
    }
  }

  // 5. Analyze customer profitability
  for (const customerName of customers) {
    const custData = customerProfitability(customerName);
    const avgMargin = 50; // Could calculate from all customers

    if (custData.grossMarginPercent < avgMargin - 5 && custData.revenue > 5000) {
      const marginGap = avgMargin - custData.grossMarginPercent;
      const dollarImpact = (marginGap / 100) * custData.revenue;

      recommendations.push({
        category: 'customer',
        priority: dollarImpact > 10000 ? 'high' : 'medium',
        issue_text: `${customerName} has ${custData.grossMarginPercent.toFixed(1)}% blended margin, below average of ${avgMargin}%`,
        suggested_action: `Review overall pricing strategy with ${customerName}. Improving margin by ${(marginGap / 2).toFixed(1)}% adds $${(dollarImpact / 2).toFixed(0)}.`,
        dollar_impact: Math.round(dollarImpact / 2),
        impact_percent: marginGap / 2,
        customer_name: customerName
      });
    }

    // High leakage customers
    if (custData.totalLeakage > 5000) {
      recommendations.push({
        category: 'leakage',
        priority: custData.totalLeakage > 15000 ? 'high' : 'medium',
        issue_text: `${customerName} accounts for $${custData.totalLeakage.toFixed(0)} in margin leakage (${custData.leakagePercent.toFixed(1)}% of potential revenue)`,
        suggested_action: `Reduce discounts ($${custData.discountLeakage.toFixed(0)}) and investigate high returns ($${custData.returnLeakage.toFixed(0)}) with ${customerName}.`,
        dollar_impact: Math.round(custData.totalLeakage * 0.4),
        impact_percent: custData.leakagePercent * 0.4,
        customer_name: customerName
      });
    }
  }

  // 6. Analyze regional performance
  const regionMap = {};
  for (const t of transactions) {
    if (t.region) {
      if (!regionMap[t.region]) {
        regionMap[t.region] = [];
      }
      regionMap[t.region].push(t);
    }
  }

  const regionMetrics = Object.entries(regionMap).map(([region, txns]) => {
    const leakage = calculateLeakage(txns);
    const returns = txns.reduce((sum, t) => sum + (t.returned_units || 0), 0);
    const totalUnits = txns.reduce((sum, t) => sum + t.qty_sold, 0);
    const returnRate = totalUnits > 0 ? (returns / totalUnits) * 100 : 0;

    return { region, returnRate, ...leakage };
  });

  const avgReturnRate = regionMetrics.reduce((sum, r) => sum + r.returnRate, 0) / regionMetrics.length;

  for (const regionData of regionMetrics) {
    if (regionData.returnRate > avgReturnRate * 1.5 && regionData.returnRate > 5) {
      const excessReturns = regionData.returnRate - avgReturnRate;

      recommendations.push({
        category: 'region',
        priority: regionData.returnLeakage > 5000 ? 'high' : 'medium',
        issue_text: `${regionData.region} region has ${regionData.returnRate.toFixed(1)}% return rate vs. ${avgReturnRate.toFixed(1)}% national average`,
        suggested_action: `Investigate fulfillment, packaging, or product-market fit in ${regionData.region}. Reducing returns to average saves $${(regionData.returnLeakage * 0.5).toFixed(0)}.`,
        dollar_impact: Math.round(regionData.returnLeakage * 0.5),
        impact_percent: excessReturns,
        region: regionData.region
      });
    }
  }

  // Sort by dollar impact (descending)
  recommendations.sort((a, b) => b.dollar_impact - a.dollar_impact);

  return recommendations;
}

export function saveRecommendations() {
  const recommendations = generateRecommendations();

  // Clear old open recommendations
  db.prepare("UPDATE recommendations SET status = 'archived' WHERE status = 'open'").run();

  // Insert new recommendations
  const insertStmt = db.prepare(`
    INSERT INTO recommendations (
      category, issue_text, suggested_action, dollar_impact,
      impact_percent, priority, sku_code, customer_name, region
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((recs) => {
    for (const rec of recs) {
      insertStmt.run(
        rec.category,
        rec.issue_text,
        rec.suggested_action,
        rec.dollar_impact,
        rec.impact_percent,
        rec.priority,
        rec.sku_code || null,
        rec.customer_name || null,
        rec.region || null
      );
    }
  });

  insertMany(recommendations);

  return recommendations;
}

export function getActiveRecommendations() {
  return db.prepare(`
    SELECT * FROM recommendations
    WHERE status = 'open'
    ORDER BY dollar_impact DESC, created_at DESC
  `).all();
}
