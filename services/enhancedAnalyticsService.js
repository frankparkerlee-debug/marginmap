import db from '../db/index.js';

/**
 * Enhanced Analytics Service
 * Supports business-type-aware margin analysis with expense tracking
 */

/**
 * Get active business type from settings
 */
export function getBusinessType() {
  const setting = db.prepare(`
    SELECT value FROM settings WHERE key = 'business_type'
  `).get();

  return setting ? setting.value : 'manufacturer';
}

/**
 * Get dynamic margin benchmark for a category and business type
 */
export function getMarginBenchmark(category, businessType = null) {
  if (!businessType) {
    businessType = getBusinessType();
  }

  const benchmark = db.prepare(`
    SELECT * FROM margin_benchmarks
    WHERE category = ? AND business_type = ?
  `).get(category, businessType);

  if (benchmark) {
    return {
      min: benchmark.target_margin_min,
      max: benchmark.target_margin_max,
      target: benchmark.industry_average || ((benchmark.target_margin_min + benchmark.target_margin_max) / 2),
      industryAverage: benchmark.industry_average
    };
  }

  // Fallback to default if no benchmark found
  return {
    min: 35,
    max: 55,
    target: 45,
    industryAverage: 45
  };
}

/**
 * Get expense categories for business type
 */
export function getExpenseCategories(businessType = null) {
  if (!businessType) {
    businessType = getBusinessType();
  }

  return db.prepare(`
    SELECT * FROM expense_categories
    WHERE business_type = ? AND is_active = 1
    ORDER BY category_name
  `).all(businessType);
}

/**
 * Get total expenses for a transaction
 */
export function getTransactionExpenses(transactionId) {
  const expenses = db.prepare(`
    SELECT te.*, ec.category_name, ec.category_code, ec.business_type
    FROM transaction_expenses te
    JOIN expense_categories ec ON te.expense_category_id = ec.id
    WHERE te.transaction_id = ?
  `).all(transactionId);

  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return {
    total,
    breakdown: expenses
  };
}

/**
 * Calculate comprehensive margin including expenses
 */
export function calculateEnhancedMargin(transactions, businessType = null) {
  if (!transactions || transactions.length === 0) {
    return {
      revenue: 0,
      cogs: 0,
      totalExpenses: 0,
      expenseBreakdown: {},
      grossProfit: 0,
      netProfit: 0,
      grossMarginPercent: 0,
      netMarginPercent: 0,
      totalUnits: 0
    };
  }

  if (!businessType) {
    businessType = getBusinessType();
  }

  let revenue = 0;
  let cogs = 0;
  let totalUnits = 0;
  let totalExpenses = 0;
  const expenseBreakdown = {};

  for (const t of transactions) {
    const netQty = t.qty_sold - (t.returned_units || 0);
    const netPrice = t.unit_price - (t.unit_discount || 0);

    revenue += netQty * netPrice;
    cogs += netQty * t.unit_cost;
    totalUnits += netQty;

    // Get expenses for this transaction
    const txExpenses = getTransactionExpenses(t.id);
    totalExpenses += txExpenses.total;

    // Accumulate expense breakdown by category
    for (const exp of txExpenses.breakdown) {
      if (!expenseBreakdown[exp.category_code]) {
        expenseBreakdown[exp.category_code] = {
          name: exp.category_name,
          total: 0,
          businessType: exp.business_type
        };
      }
      expenseBreakdown[exp.category_code].total += exp.amount;
    }
  }

  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - totalExpenses;
  const grossMarginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMarginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    revenue: Math.round(revenue * 100) / 100,
    cogs: Math.round(cogs * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    expenseBreakdown,
    grossProfit: Math.round(grossProfit * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    grossMarginPercent: Math.round(grossMarginPercent * 100) / 100,
    netMarginPercent: Math.round(netMarginPercent * 100) / 100,
    totalUnits: Math.round(totalUnits)
  };
}

/**
 * Enhanced SKU profitability with business-type-aware benchmarks
 */
export function enhancedSkuProfitability(skuCode) {
  const transactions = db.prepare(`
    SELECT * FROM transactions WHERE sku_code = ?
  `).all(skuCode);

  if (transactions.length === 0) {
    return null;
  }

  const skuName = transactions[0].sku_name;
  const category = transactions[0].category;
  const businessType = getBusinessType();

  // Get dynamic benchmark for this category
  const benchmark = getMarginBenchmark(category, businessType);

  // Calculate enhanced metrics
  const metrics = calculateEnhancedMargin(transactions, businessType);

  // Calculate margin erosion factors
  let totalRevenue = 0;
  let totalDiscount = 0;
  let totalReturns = 0;
  let totalReturnValue = 0;

  for (const t of transactions) {
    const netQty = t.qty_sold - (t.returned_units || 0);
    const netPrice = t.unit_price - (t.unit_discount || 0);

    totalRevenue += netQty * netPrice;
    totalDiscount += t.qty_sold * (t.unit_discount || 0);
    totalReturns += t.returned_units || 0;
    totalReturnValue += (t.returned_units || 0) * t.unit_price;
  }

  const returnRate = (metrics.totalUnits + totalReturns) > 0
    ? (totalReturns / (metrics.totalUnits + totalReturns)) * 100
    : 0;

  // Margin erosion analysis
  const erosionFactors = {
    discounts: {
      amount: Math.round(totalDiscount * 100) / 100,
      percent: totalRevenue > 0 ? (totalDiscount / totalRevenue) * 100 : 0
    },
    returns: {
      amount: Math.round(totalReturnValue * 100) / 100,
      percent: totalRevenue > 0 ? (totalReturnValue / (totalRevenue + totalReturnValue)) * 100 : 0,
      rate: Math.round(returnRate * 100) / 100
    },
    expenses: {
      amount: metrics.totalExpenses,
      percent: totalRevenue > 0 ? (metrics.totalExpenses / totalRevenue) * 100 : 0,
      breakdown: metrics.expenseBreakdown
    }
  };

  // Calculate performance vs benchmark
  const performanceVsBenchmark = {
    netMargin: metrics.netMarginPercent,
    targetMargin: benchmark.target,
    minMargin: benchmark.min,
    maxMargin: benchmark.max,
    gap: benchmark.target - metrics.netMarginPercent,
    status: metrics.netMarginPercent >= benchmark.min
      ? (metrics.netMarginPercent >= benchmark.target ? 'excellent' : 'acceptable')
      : 'below_target'
  };

  return {
    skuCode,
    skuName,
    category,
    businessType,
    ...metrics,
    erosionFactors,
    benchmark,
    performanceVsBenchmark
  };
}

/**
 * Enhanced customer profitability with expense attribution
 */
export function enhancedCustomerProfitability(customerName) {
  const transactions = db.prepare(`
    SELECT * FROM transactions WHERE customer_name = ?
  `).all(customerName);

  if (transactions.length === 0) {
    return null;
  }

  const businessType = getBusinessType();
  const metrics = calculateEnhancedMargin(transactions, businessType);

  // Get top SKUs by revenue and net margin
  const skuMap = {};

  for (const t of transactions) {
    if (!skuMap[t.sku_code]) {
      skuMap[t.sku_code] = {
        skuCode: t.sku_code,
        skuName: t.sku_name,
        category: t.category,
        transactions: []
      };
    }
    skuMap[t.sku_code].transactions.push(t);
  }

  const skus = Object.values(skuMap).map(sku => {
    const skuMetrics = calculateEnhancedMargin(sku.transactions, businessType);
    return {
      skuCode: sku.skuCode,
      skuName: sku.skuName,
      category: sku.category,
      revenue: skuMetrics.revenue,
      netProfit: skuMetrics.netProfit,
      netMargin: skuMetrics.netMarginPercent
    };
  });

  const topSkusByRevenue = skus.sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const topSkusByMargin = skus.sort((a, b) => b.netMargin - a.netMargin).slice(0, 5);

  return {
    customerName,
    businessType,
    ...metrics,
    transactionCount: transactions.length,
    topSkusByRevenue,
    topSkusByMargin
  };
}

/**
 * Enhanced dashboard metrics with business-type awareness
 */
export function getEnhancedDashboardMetrics() {
  const transactions = db.prepare('SELECT * FROM transactions').all();
  const businessType = getBusinessType();

  if (transactions.length === 0) {
    return {
      businessType,
      overview: {
        revenue: 0,
        cogs: 0,
        totalExpenses: 0,
        grossProfit: 0,
        netProfit: 0,
        grossMarginPercent: 0,
        netMarginPercent: 0
      },
      expenseBreakdown: {},
      topLowMarginSkus: [],
      topHighExpenseSkus: [],
      topLowMarginCustomers: [],
      marginTrend: []
    };
  }

  const overview = calculateEnhancedMargin(transactions, businessType);

  // Get all unique SKUs and calculate their enhanced margins
  const skuCodes = [...new Set(transactions.map(t => t.sku_code))];
  const skuMetrics = skuCodes.map(code => {
    const data = enhancedSkuProfitability(code);
    return {
      skuCode: code,
      skuName: data.skuName,
      category: data.category,
      netMarginPercent: data.netMarginPercent,
      revenue: data.revenue,
      totalExpenses: data.totalExpenses,
      performanceStatus: data.performanceVsBenchmark.status
    };
  });

  const topLowMarginSkus = skuMetrics
    .sort((a, b) => a.netMarginPercent - b.netMarginPercent)
    .slice(0, 5);

  const topHighExpenseSkus = skuMetrics
    .sort((a, b) => b.totalExpenses - a.totalExpenses)
    .slice(0, 5);

  // Get all unique customers and calculate their margins
  const customers = [...new Set(transactions.map(t => t.customer_name))];
  const customerMetrics = customers.map(name => {
    const data = enhancedCustomerProfitability(name);
    return {
      customerName: name,
      netMarginPercent: data.netMarginPercent,
      revenue: data.revenue
    };
  });

  const topLowMarginCustomers = customerMetrics
    .sort((a, b) => a.netMarginPercent - b.netMarginPercent)
    .slice(0, 5);

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
      const dayMetrics = calculateEnhancedMargin(dayTransactions, businessType);
      return {
        date,
        grossMarginPercent: dayMetrics.grossMarginPercent,
        netMarginPercent: dayMetrics.netMarginPercent,
        revenue: dayMetrics.revenue
      };
    });

  return {
    businessType,
    overview,
    expenseBreakdown: overview.expenseBreakdown,
    topLowMarginSkus,
    topHighExpenseSkus,
    topLowMarginCustomers,
    marginTrend
  };
}

/**
 * Calculate internal benchmarks by comparing to top performers in same category
 */
export function calculateInternalBenchmark(sku, allSkus) {
  // Filter to same category
  const sameCategorySkus = allSkus.filter(s =>
    s.category === sku.category && s.skuCode !== sku.skuCode
  );

  if (sameCategorySkus.length === 0) {
    return null; // Not enough data for comparison
  }

  // Sort by net margin
  const sorted = sameCategorySkus.sort((a, b) =>
    b.netMarginPercent - a.netMarginPercent
  );

  // Get top 10% performers (minimum 1, maximum 5)
  const top10PercentCount = Math.max(1, Math.min(5, Math.ceil(sorted.length * 0.1)));
  const topPerformers = sorted.slice(0, top10PercentCount);

  // Calculate average of top performers
  const avgTopPerformer = topPerformers.reduce((sum, s) =>
    sum + s.netMarginPercent, 0
  ) / topPerformers.length;

  // Best single performer
  const best = sorted[0];

  // Calculate potential revenue gain if this SKU hit top performer average
  const marginGap = avgTopPerformer - sku.netMarginPercent;
  const potentialProfit = (sku.revenue * marginGap) / 100;

  return {
    bestInCategory: {
      skuCode: best.skuCode,
      skuName: best.skuName,
      netMargin: best.netMarginPercent
    },
    topPerformerAvg: avgTopPerformer,
    yourMargin: sku.netMarginPercent,
    gap: marginGap,
    potentialProfit: Math.round(potentialProfit),
    sampleSize: sameCategorySkus.length,
    percentileRank: calculatePercentileRank(sku.netMarginPercent, sameCategorySkus)
  };
}

/**
 * Calculate percentile rank (what % of products are worse than this one)
 */
function calculatePercentileRank(value, allValues) {
  const margins = allValues.map(v => v.netMarginPercent).sort((a, b) => a - b);
  const countBelow = margins.filter(m => m < value).length;
  return Math.round((countBelow / margins.length) * 100);
}

/**
 * Get all SKUs with enhanced metrics
 */
export function getAllEnhancedSkus() {
  const transactions = db.prepare('SELECT * FROM transactions').all();
  const skuCodes = [...new Set(transactions.map(t => t.sku_code))];

  const skus = skuCodes.map(code => {
    return enhancedSkuProfitability(code);
  }).sort((a, b) => b.revenue - a.revenue);

  // Add internal benchmarks to each SKU
  return skus.map(sku => {
    const internalBenchmark = calculateInternalBenchmark(sku, skus);
    return {
      ...sku,
      internalBenchmark
    };
  });
}

/**
 * Get all customers with enhanced metrics
 */
export function getAllEnhancedCustomers() {
  const transactions = db.prepare('SELECT * FROM transactions').all();
  const customers = [...new Set(transactions.map(t => t.customer_name))];

  return customers.map(name => {
    return enhancedCustomerProfitability(name);
  }).sort((a, b) => b.revenue - a.revenue);
}

/**
 * Margin erosion summary across all products
 */
export function getMarginErosionSummary() {
  const transactions = db.prepare('SELECT * FROM transactions').all();
  const businessType = getBusinessType();

  if (transactions.length === 0) {
    return {
      totalRevenue: 0,
      erosionFactors: {},
      topErosionSources: []
    };
  }

  let totalRevenue = 0;
  let totalDiscounts = 0;
  let totalReturns = 0;
  let totalExpenses = 0;
  const expenseByCategory = {};

  for (const t of transactions) {
    const netQty = t.qty_sold - (t.returned_units || 0);
    const netPrice = t.unit_price - (t.unit_discount || 0);

    totalRevenue += netQty * netPrice;
    totalDiscounts += t.qty_sold * (t.unit_discount || 0);
    totalReturns += (t.returned_units || 0) * t.unit_price;

    const txExpenses = getTransactionExpenses(t.id);
    totalExpenses += txExpenses.total;

    for (const exp of txExpenses.breakdown) {
      if (!expenseByCategory[exp.category_name]) {
        expenseByCategory[exp.category_name] = 0;
      }
      expenseByCategory[exp.category_name] += exp.amount;
    }
  }

  const erosionFactors = {
    discounts: {
      amount: Math.round(totalDiscounts * 100) / 100,
      percent: totalRevenue > 0 ? (totalDiscounts / totalRevenue) * 100 : 0
    },
    returns: {
      amount: Math.round(totalReturns * 100) / 100,
      percent: totalRevenue > 0 ? (totalReturns / totalRevenue) * 100 : 0
    },
    expenses: {
      amount: Math.round(totalExpenses * 100) / 100,
      percent: totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0,
      byCategory: expenseByCategory
    }
  };

  // Create sorted list of erosion sources
  const topErosionSources = [
    { source: 'Discounts', amount: totalDiscounts, percent: erosionFactors.discounts.percent },
    { source: 'Returns', amount: totalReturns, percent: erosionFactors.returns.percent },
    { source: 'Operating Expenses', amount: totalExpenses, percent: erosionFactors.expenses.percent }
  ].sort((a, b) => b.amount - a.amount);

  return {
    businessType,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    erosionFactors,
    topErosionSources
  };
}
