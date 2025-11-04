import db, { queries } from '../db/index.js';
import { skuProfitability, customerProfitability, calculateLeakage } from './analyticsService.js';
import {
  enhancedSkuProfitability,
  enhancedCustomerProfitability,
  getBusinessType,
  getMarginBenchmark
} from './enhancedAnalyticsService.js';

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

  const businessType = getBusinessType();
  const skuCodes = [...new Set(transactions.map(t => t.sku_code))];
  const customers = [...new Set(transactions.map(t => t.customer_name))];
  const regions = [...new Set(transactions.map(t => t.region).filter(r => r))];

  // 1. Analyze SKUs with enhanced business-type-aware metrics
  for (const skuCode of skuCodes) {
    const skuData = enhancedSkuProfitability(skuCode);

    if (!skuData) continue;

    const benchmark = skuData.benchmark;
    const performance = skuData.performanceVsBenchmark;

    // Low margin detection (against dynamic benchmark)
    if (performance.status === 'below_target') {
      const marginGap = performance.gap;
      const dollarImpact = (marginGap / 100) * skuData.revenue;

      recommendations.push({
        category: 'pricing',
        issue_text: `SKU ${skuCode} (${skuData.skuName}) has ${skuData.netMarginPercent.toFixed(1)}% net margin, below ${benchmark.target.toFixed(1)}% target for ${skuData.category}`,
        suggested_action: `Increase price or reduce costs to reach target margin. ${businessType === 'manufacturer' ? 'Focus on production efficiency.' : businessType === 'wholesaler' ? 'Optimize logistics costs.' : 'Review marketing spend.'}`,
        dollar_impact: Math.round(dollarImpact),
        impact_percent: marginGap,
        priority: dollarImpact > 10000 ? 'high' : dollarImpact > 5000 ? 'medium' : 'low',
        sku_code: skuCode
      });
    }

    // High expense detection (business-type specific)
    const expensePercent = skuData.revenue > 0 ? (skuData.totalExpenses / skuData.revenue) * 100 : 0;
    if (expensePercent > 15) {
      const erosion = skuData.erosionFactors.expenses;
      const topExpenseCategories = Object.entries(erosion.breakdown)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 2)
        .map(([code, data]) => data.name);

      if (topExpenseCategories.length > 0) {
        recommendations.push({
          category: 'cost_reduction',
          issue_text: `SKU ${skuCode} has ${expensePercent.toFixed(1)}% expense ratio - ${topExpenseCategories.join(', ')} driving costs`,
          suggested_action: `Reduce operating expenses, targeting 20% savings in ${topExpenseCategories[0]}`,
          dollar_impact: Math.round(skuData.totalExpenses * 0.2),
          impact_percent: expensePercent,
          priority: skuData.totalExpenses > 5000 ? 'high' : 'medium',
          sku_code: skuCode
        });
      }
    }

    // High return rate detection
    const returnRate = skuData.erosionFactors.returns.rate;
    if (returnRate > 5) {
      const returnImpact = skuData.erosionFactors.returns.amount;

      recommendations.push({
        category: 'returns',
        issue_text: `SKU ${skuCode} has ${returnRate.toFixed(1)}% return rate`,
        suggested_action: `Investigate quality issues - returns costing $${Math.round(returnImpact)}. ${businessType === 'manufacturer' ? 'Review production quality control.' : 'Assess packaging and shipping.'}`,
        dollar_impact: Math.round(returnImpact * 0.5),
        impact_percent: returnRate,
        priority: returnRate > 10 ? 'high' : 'medium',
        sku_code: skuCode
      });
    }

    // High discount detection
    const discountData = skuData.erosionFactors.discounts;
    if (discountData.percent > 5) {
      recommendations.push({
        category: 'discount',
        issue_text: `SKU ${skuCode} has ${discountData.percent.toFixed(1)}% discount erosion ($${Math.round(discountData.amount)})`,
        suggested_action: `Reduce promotional discounting frequency - recover $${Math.round(discountData.amount * 0.5)}`,
        dollar_impact: Math.round(discountData.amount * 0.5),
        impact_percent: discountData.percent,
        priority: discountData.percent > 10 ? 'high' : 'medium',
        sku_code: skuCode
      });
    }
  }

  // 2. Analyze customer profitability with enhanced metrics
  for (const customerName of customers) {
    const custData = enhancedCustomerProfitability(customerName);

    if (!custData) continue;

    // Calculate average benchmark for customer's product mix
    const customerTransactions = transactions.filter(t => t.customer_name === customerName);
    const categories = [...new Set(customerTransactions.map(t => t.category))];
    const avgBenchmark = categories.reduce((sum, cat) => {
      const bm = getMarginBenchmark(cat, businessType);
      return sum + bm.target;
    }, 0) / (categories.length || 1);

    // Low margin customer
    if (custData.netMarginPercent < avgBenchmark - 5 && custData.revenue > 5000) {
      const marginGap = avgBenchmark - custData.netMarginPercent;
      const dollarImpact = (marginGap / 100) * custData.revenue;

      recommendations.push({
        category: 'customer',
        issue_text: `${customerName} has ${custData.netMarginPercent.toFixed(1)}% net margin vs ${avgBenchmark.toFixed(1)}% target`,
        suggested_action: `Renegotiate pricing or reduce service costs. Opportunity for $${Math.round(dollarImpact * 0.5)} improvement`,
        dollar_impact: Math.round(dollarImpact * 0.5),
        impact_percent: marginGap,
        priority: dollarImpact > 10000 ? 'high' : dollarImpact > 5000 ? 'medium' : 'low',
        customer_name: customerName
      });
    }

    // High expense customer
    const custExpensePercent = custData.revenue > 0 ? (custData.totalExpenses / custData.revenue) * 100 : 0;
    if (custExpensePercent > 15 && custData.totalExpenses > 2000) {
      const topExpenseCategories = Object.entries(custData.expenseBreakdown)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 2)
        .map(([code, data]) => data.name);

      if (topExpenseCategories.length > 0) {
        recommendations.push({
          category: 'customer_costs',
          issue_text: `${customerName} has ${custExpensePercent.toFixed(1)}% expense ratio`,
          suggested_action: `Optimize ${topExpenseCategories.join(', ')} - potential $${Math.round(custData.totalExpenses * 0.15)} savings`,
          dollar_impact: Math.round(custData.totalExpenses * 0.15),
          impact_percent: custExpensePercent,
          priority: custData.totalExpenses > 10000 ? 'high' : 'medium',
          customer_name: customerName
        });
      }
    }
  }

  // 3. Business-type-specific recommendations
  if (businessType === 'manufacturer') {
    const prodLoss = db.prepare(`
      SELECT SUM(te.amount) as total
      FROM transaction_expenses te
      JOIN expense_categories ec ON te.expense_category_id = ec.id
      WHERE ec.business_type = 'manufacturer' AND ec.category_code = 'production_loss'
    `).get();

    if (prodLoss && prodLoss.total > 0) {
      const totalRevenue = transactions.reduce((sum, t) => {
        const netQty = t.qty_sold - (t.returned_units || 0);
        const netPrice = t.unit_price - (t.unit_discount || 0);
        return sum + (netQty * netPrice);
      }, 0);

      const lossPercent = totalRevenue > 0 ? (prodLoss.total / totalRevenue) * 100 : 0;

      if (lossPercent > 5) {
        recommendations.push({
          category: 'manufacturing',
          issue_text: `Production loss/damage is ${lossPercent.toFixed(1)}% of revenue ($${Math.round(prodLoss.total)})`,
          suggested_action: `Implement quality control improvements - target 30% waste reduction`,
          dollar_impact: Math.round(prodLoss.total * 0.3),
          impact_percent: lossPercent,
          priority: 'high'
        });
      }
    }
  } else if (businessType === 'wholesaler') {
    const logisticsCosts = db.prepare(`
      SELECT SUM(te.amount) as total
      FROM transaction_expenses te
      JOIN expense_categories ec ON te.expense_category_id = ec.id
      WHERE ec.business_type = 'wholesaler' AND ec.category_code IN ('logistics', 'distribution')
    `).get();

    if (logisticsCosts && logisticsCosts.total > 0) {
      const totalRevenue = transactions.reduce((sum, t) => {
        const netQty = t.qty_sold - (t.returned_units || 0);
        const netPrice = t.unit_price - (t.unit_discount || 0);
        return sum + (netQty * netPrice);
      }, 0);

      const logisticsPercent = totalRevenue > 0 ? (logisticsCosts.total / totalRevenue) * 100 : 0;

      if (logisticsPercent > 8) {
        recommendations.push({
          category: 'logistics',
          issue_text: `Logistics costs are ${logisticsPercent.toFixed(1)}% of revenue ($${Math.round(logisticsCosts.total)})`,
          suggested_action: `Optimize shipping routes and consolidate shipments - 15% savings potential`,
          dollar_impact: Math.round(logisticsCosts.total * 0.15),
          impact_percent: logisticsPercent,
          priority: 'medium'
        });
      }
    }
  } else if (businessType === 'retailer') {
    const marketingCosts = db.prepare(`
      SELECT SUM(te.amount) as total
      FROM transaction_expenses te
      JOIN expense_categories ec ON te.expense_category_id = ec.id
      WHERE ec.business_type = 'retailer' AND ec.category_code = 'advertising'
    `).get();

    if (marketingCosts && marketingCosts.total > 0) {
      const totalRevenue = transactions.reduce((sum, t) => {
        const netQty = t.qty_sold - (t.returned_units || 0);
        const netPrice = t.unit_price - (t.unit_discount || 0);
        return sum + (netQty * netPrice);
      }, 0);

      const marketingPercent = totalRevenue > 0 ? (marketingCosts.total / totalRevenue) * 100 : 0;

      if (marketingPercent > 12) {
        recommendations.push({
          category: 'marketing',
          issue_text: `Advertising costs are ${marketingPercent.toFixed(1)}% of revenue ($${Math.round(marketingCosts.total)})`,
          suggested_action: `Focus ad spend on high-margin products - improve ROAS by 20%`,
          dollar_impact: Math.round(marketingCosts.total * 0.2),
          impact_percent: marketingPercent,
          priority: 'medium'
        });
      }
    }
  }

  // 4. Regional analysis
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

  const avgReturnRate = regionMetrics.reduce((sum, r) => sum + r.returnRate, 0) / (regionMetrics.length || 1);

  for (const regionData of regionMetrics) {
    if (regionData.returnRate > avgReturnRate * 1.5 && regionData.returnRate > 5) {
      const excessReturns = regionData.returnRate - avgReturnRate;

      recommendations.push({
        category: 'region',
        issue_text: `${regionData.region} has ${regionData.returnRate.toFixed(1)}% return rate vs ${avgReturnRate.toFixed(1)}% average`,
        suggested_action: `Investigate fulfillment or product-market fit in ${regionData.region}`,
        dollar_impact: Math.round(regionData.returnLeakage * 0.5),
        impact_percent: excessReturns,
        priority: regionData.returnLeakage > 5000 ? 'high' : 'medium',
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
