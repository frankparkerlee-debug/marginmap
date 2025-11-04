import db from '../db/index.js';

/**
 * Core analytics service for MarginMap
 * Calculates profitability metrics, margin leakage, and performance indicators
 */

export function calculateGrossMargin(transactions) {
  if (!transactions || transactions.length === 0) {
    return {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      grossMarginPercent: 0,
      totalUnits: 0
    };
  }

  let revenue = 0;
  let cogs = 0;
  let totalUnits = 0;

  for (const t of transactions) {
    const netQty = t.qty_sold - (t.returned_units || 0);
    const netPrice = t.unit_price - (t.unit_discount || 0);

    revenue += netQty * netPrice;
    cogs += netQty * t.unit_cost;
    totalUnits += netQty;
  }

  const grossProfit = revenue - cogs;
  const grossMarginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  return {
    revenue: Math.round(revenue * 100) / 100,
    cogs: Math.round(cogs * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossMarginPercent: Math.round(grossMarginPercent * 100) / 100,
    totalUnits: Math.round(totalUnits)
  };
}

export function calculateLeakage(transactions) {
  if (!transactions || transactions.length === 0) {
    return {
      totalLeakage: 0,
      discountLeakage: 0,
      returnLeakage: 0,
      leakagePercent: 0
    };
  }

  let discountLeakage = 0;
  let returnLeakage = 0;
  let potentialRevenue = 0;

  for (const t of transactions) {
    // Discount leakage: money lost to discounts
    discountLeakage += t.qty_sold * (t.unit_discount || 0);

    // Return leakage: revenue lost from returns
    const returnedValue = (t.returned_units || 0) * t.unit_price;
    returnLeakage += returnedValue;

    // Potential revenue without discounts
    potentialRevenue += t.qty_sold * t.unit_price;
  }

  const totalLeakage = discountLeakage + returnLeakage;
  const leakagePercent = potentialRevenue > 0 ? (totalLeakage / potentialRevenue) * 100 : 0;

  return {
    totalLeakage: Math.round(totalLeakage * 100) / 100,
    discountLeakage: Math.round(discountLeakage * 100) / 100,
    returnLeakage: Math.round(returnLeakage * 100) / 100,
    leakagePercent: Math.round(leakagePercent * 100) / 100
  };
}

export function skuProfitability(skuCode) {
  const transactions = db.prepare(`
    SELECT * FROM transactions WHERE sku_code = ?
  `).all(skuCode);

  if (transactions.length === 0) {
    return null;
  }

  const skuName = transactions[0].sku_name;
  const category = transactions[0].category;

  let totalRevenue = 0;
  let totalCogs = 0;
  let totalUnits = 0;
  let totalReturns = 0;
  let totalDiscount = 0;

  const customerBreakdown = {};
  const regionBreakdown = {};

  for (const t of transactions) {
    const netQty = t.qty_sold - (t.returned_units || 0);
    const netPrice = t.unit_price - (t.unit_discount || 0);

    totalRevenue += netQty * netPrice;
    totalCogs += netQty * t.unit_cost;
    totalUnits += netQty;
    totalReturns += t.returned_units || 0;
    totalDiscount += t.qty_sold * (t.unit_discount || 0);

    // Customer breakdown
    if (!customerBreakdown[t.customer_name]) {
      customerBreakdown[t.customer_name] = { revenue: 0, units: 0, margin: 0 };
    }
    customerBreakdown[t.customer_name].revenue += netQty * netPrice;
    customerBreakdown[t.customer_name].units += netQty;

    // Region breakdown
    if (t.region) {
      if (!regionBreakdown[t.region]) {
        regionBreakdown[t.region] = { revenue: 0, units: 0, margin: 0 };
      }
      regionBreakdown[t.region].revenue += netQty * netPrice;
      regionBreakdown[t.region].units += netQty;
    }
  }

  const grossProfit = totalRevenue - totalCogs;
  const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const returnRate = (totalUnits + totalReturns) > 0 ? (totalReturns / (totalUnits + totalReturns)) * 100 : 0;

  // Calculate margins for breakdowns
  Object.keys(customerBreakdown).forEach(customer => {
    const customerData = customerBreakdown[customer];
    const custTransactions = transactions.filter(t => t.customer_name === customer);
    const custMetrics = calculateGrossMargin(custTransactions);
    customerData.margin = custMetrics.grossMarginPercent;
  });

  Object.keys(regionBreakdown).forEach(region => {
    const regionData = regionBreakdown[region];
    const regionTransactions = transactions.filter(t => t.region === region);
    const regionMetrics = calculateGrossMargin(regionTransactions);
    regionData.margin = regionMetrics.grossMarginPercent;
  });

  return {
    skuCode,
    skuName,
    category,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCogs: Math.round(totalCogs * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    marginPercent: Math.round(marginPercent * 100) / 100,
    totalUnits: Math.round(totalUnits),
    totalReturns: Math.round(totalReturns),
    returnRate: Math.round(returnRate * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    customerBreakdown,
    regionBreakdown
  };
}

export function customerProfitability(customerName) {
  const transactions = db.prepare(`
    SELECT * FROM transactions WHERE customer_name = ?
  `).all(customerName);

  if (transactions.length === 0) {
    return null;
  }

  const metrics = calculateGrossMargin(transactions);
  const leakage = calculateLeakage(transactions);

  // Get top SKUs by revenue and margin
  const skuMap = {};

  for (const t of transactions) {
    if (!skuMap[t.sku_code]) {
      skuMap[t.sku_code] = {
        skuCode: t.sku_code,
        skuName: t.sku_name,
        category: t.category,
        revenue: 0,
        cogs: 0,
        units: 0
      };
    }

    const netQty = t.qty_sold - (t.returned_units || 0);
    const netPrice = t.unit_price - (t.unit_discount || 0);

    skuMap[t.sku_code].revenue += netQty * netPrice;
    skuMap[t.sku_code].cogs += netQty * t.unit_cost;
    skuMap[t.sku_code].units += netQty;
  }

  const skus = Object.values(skuMap).map(sku => ({
    ...sku,
    margin: sku.revenue > 0 ? ((sku.revenue - sku.cogs) / sku.revenue) * 100 : 0
  }));

  const topSkusByRevenue = skus.sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const topSkusByMargin = skus.sort((a, b) => b.margin - a.margin).slice(0, 5);

  return {
    customerName,
    ...metrics,
    ...leakage,
    transactionCount: transactions.length,
    topSkusByRevenue,
    topSkusByMargin
  };
}

export function getDashboardMetrics() {
  const transactions = db.prepare('SELECT * FROM transactions').all();

  if (transactions.length === 0) {
    return {
      overview: { revenue: 0, cogs: 0, grossProfit: 0, grossMarginPercent: 0 },
      leakage: { totalLeakage: 0, discountLeakage: 0, returnLeakage: 0 },
      topLowMarginSkus: [],
      topLowMarginCustomers: [],
      marginTrend: []
    };
  }

  const overview = calculateGrossMargin(transactions);
  const leakage = calculateLeakage(transactions);

  // Get all unique SKUs and calculate their margins
  const skuCodes = [...new Set(transactions.map(t => t.sku_code))];
  const skuMargins = skuCodes.map(code => {
    const data = skuProfitability(code);
    return {
      skuCode: code,
      skuName: data.skuName,
      marginPercent: data.marginPercent,
      revenue: data.totalRevenue
    };
  }).sort((a, b) => a.marginPercent - b.marginPercent);

  const topLowMarginSkus = skuMargins.slice(0, 5);

  // Get all unique customers and calculate their margins
  const customers = [...new Set(transactions.map(t => t.customer_name))];
  const customerMargins = customers.map(name => {
    const data = customerProfitability(name);
    return {
      customerName: name,
      marginPercent: data.grossMarginPercent,
      revenue: data.revenue
    };
  }).sort((a, b) => a.marginPercent - b.marginPercent);

  const topLowMarginCustomers = customerMargins.slice(0, 5);

  // Calculate margin trend over time
  const dateMap = {};
  for (const t of transactions) {
    if (!dateMap[t.date]) {
      dateMap[t.date] = [];
    }
    dateMap[t.date].push(t);
  }

  const marginTrend = Object.keys(dateMap)
    .sort()
    .map(date => {
      const dayTransactions = dateMap[date];
      const dayMetrics = calculateGrossMargin(dayTransactions);
      return {
        date,
        marginPercent: dayMetrics.grossMarginPercent,
        revenue: dayMetrics.revenue
      };
    });

  return {
    overview,
    leakage,
    topLowMarginSkus,
    topLowMarginCustomers,
    marginTrend
  };
}

export function getAllSkus() {
  const transactions = db.prepare('SELECT * FROM transactions').all();
  const skuCodes = [...new Set(transactions.map(t => t.sku_code))];

  const targetMargin = parseFloat(process.env.TARGET_MARGIN_PERCENT || 55);

  return skuCodes.map(code => {
    const data = skuProfitability(code);
    return {
      ...data,
      belowTarget: data.marginPercent < targetMargin
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export function getAllCustomers() {
  const transactions = db.prepare('SELECT * FROM transactions').all();
  const customers = [...new Set(transactions.map(t => t.customer_name))];

  return customers.map(name => {
    return customerProfitability(name);
  }).sort((a, b) => b.revenue - a.revenue);
}
