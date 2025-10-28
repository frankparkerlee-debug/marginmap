const dayjs = require('dayjs');
const { all, run } = require('../db');

const DEFAULT_MARGIN_TARGET = Number(process.env.DEFAULT_MARGIN_TARGET || 0.6);

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

function calculateGrossMargin(dataset = []) {
  const revenue = dataset.reduce((sum, row) => sum + toNumber(row.unit_price_paid) * toNumber(row.qty), 0);
  const cogs = dataset.reduce((sum, row) => sum + toNumber(row.unit_cost) * toNumber(row.qty), 0);
  const grossMargin = revenue - cogs;
  const grossMarginPercent = revenue === 0 ? 0 : grossMargin / revenue;
  return {
    revenue,
    cogs,
    gross_margin: grossMargin,
    gross_margin_percent: grossMarginPercent
  };
}

function calculateLeakage(dataset = []) {
  const leakage = dataset.reduce((sum, row) => {
    const billed = toNumber(row.unit_price_billed);
    const paid = toNumber(row.unit_price_paid);
    const qty = toNumber(row.qty);
    if (paid < billed) {
      return sum + (billed - paid) * qty;
    }
    return sum;
  }, 0);
  return { total_leakage: leakage };
}

async function listTransactionsByDateRange(start, end) {
  return all(
    `SELECT * FROM transactions
     WHERE date(date_of_service) BETWEEN date(?) AND date(?)
     ORDER BY date_of_service`,
    [start, end]
  );
}

async function getDashboardSummary({ start, end }) {
  const dataset = await listTransactionsByDateRange(start, end);
  const gross = calculateGrossMargin(dataset);
  const leakage = calculateLeakage(dataset).total_leakage;

  const worstCustomersRaw = await all(
    `SELECT customer_name,
            SUM(CASE WHEN unit_price_paid < unit_price_billed
                     THEN (unit_price_billed - unit_price_paid) * qty ELSE 0 END) AS leakage,
            SUM(unit_price_paid * qty) AS revenue
     FROM transactions
     WHERE date(date_of_service) BETWEEN date(?) AND date(?)
     GROUP BY customer_name
     ORDER BY leakage DESC
     LIMIT 5`,
    [start, end]
  );
  const worstCustomers = worstCustomersRaw.map((row) => ({
    customer_name: row.customer_name,
    leakage: toNumber(row.leakage),
    revenue: toNumber(row.revenue)
  }));

  const worstSkusRaw = await all(
    `SELECT sku_code,
            SUM(CASE WHEN unit_price_paid < unit_price_billed
                     THEN (unit_price_billed - unit_price_paid) * qty ELSE 0 END) AS leakage,
            SUM(unit_price_paid * qty) AS revenue
     FROM transactions
     WHERE date(date_of_service) BETWEEN date(?) AND date(?)
     GROUP BY sku_code
     ORDER BY leakage DESC
     LIMIT 5`,
    [start, end]
  );
  const worstSkus = worstSkusRaw.map((row) => ({
    sku_code: row.sku_code,
    leakage: toNumber(row.leakage),
    revenue: toNumber(row.revenue)
  }));

  const trendRows = await all(
    `SELECT strftime('%Y-%m', date_of_service) AS period,
            SUM(unit_price_paid * qty) AS revenue,
            SUM(unit_cost * qty) AS cogs
     FROM transactions
     WHERE date(date_of_service) BETWEEN date(?) AND date(?)
     GROUP BY period
     ORDER BY period ASC`,
    [start, end]
  );

  const marginTrend = trendRows.map((row) => {
    const revenue = toNumber(row.revenue);
    const cogs = toNumber(row.cogs);
    const margin = revenue - cogs;
    return {
      period: row.period,
      margin_percent: revenue === 0 ? 0 : margin / revenue,
      revenue,
      cogs
    };
  });

  return {
    range: { start, end },
    kpis: {
      revenue: Number(gross.revenue.toFixed(2)),
      cogs: Number(gross.cogs.toFixed(2)),
      gross_margin: Number(gross.gross_margin.toFixed(2)),
      gross_margin_percent: Number(gross.gross_margin_percent.toFixed(4)),
      leakage: Number(leakage.toFixed(2))
    },
    worst_customers: worstCustomers,
    worst_skus: worstSkus,
    margin_trend: marginTrend
  };
}

async function listSkuSummary({ start, end }) {
  const rows = await all(
    `SELECT sku_code,
            SUM(qty) AS volume,
            SUM(unit_cost * qty) AS cost_amount,
            SUM(unit_price_billed * qty) AS billed_amount,
            SUM(unit_price_paid * qty) AS paid_amount,
            SUM(CASE WHEN unit_price_paid < unit_price_billed
                     THEN (unit_price_billed - unit_price_paid) * qty ELSE 0 END) AS leakage
     FROM transactions
     WHERE date(date_of_service) BETWEEN date(?) AND date(?)
     GROUP BY sku_code
     ORDER BY paid_amount DESC`,
    [start, end]
  );

  return rows.map((row) => {
    const volume = toNumber(row.volume);
    const revenue = toNumber(row.paid_amount);
    const cogs = toNumber(row.cost_amount);
    const marginDollar = revenue - cogs;
    return {
      sku_code: row.sku_code,
      avg_cost: volume ? cogs / volume : 0,
      avg_billed: volume ? toNumber(row.billed_amount) / volume : 0,
      avg_paid: volume ? revenue / volume : 0,
      volume,
      total_margin: marginDollar,
      leakage: toNumber(row.leakage),
      margin_percent: revenue === 0 ? 0 : marginDollar / revenue
    };
  });
}

async function skuProfitability(skuCode) {
  const rows = await all('SELECT * FROM transactions WHERE sku_code = ?', [skuCode]);
  if (!rows.length) return null;

  const dataset = rows.map((row) => ({
    ...row,
    qty: toNumber(row.qty),
    unit_cost: toNumber(row.unit_cost),
    unit_price_billed: toNumber(row.unit_price_billed),
    unit_price_paid: toNumber(row.unit_price_paid)
  }));

  const totalQty = dataset.reduce((sum, row) => sum + row.qty, 0);
  const gross = calculateGrossMargin(dataset);
  const leakage = calculateLeakage(dataset).total_leakage;

  const revenue = gross.revenue;
  const cogs = gross.cogs;
  const avgCost = totalQty ? cogs / totalQty : 0;
  const avgBilled = totalQty
    ? dataset.reduce((sum, row) => sum + row.unit_price_billed * row.qty, 0) / totalQty
    : 0;
  const avgPaid = totalQty ? revenue / totalQty : 0;

  const payerRows = await all(
    `SELECT payer_name,
            SUM(unit_price_paid * qty) AS paid_amount,
            SUM(qty) AS volume
     FROM transactions
     WHERE sku_code = ?
     GROUP BY payer_name`,
    [skuCode]
  );

  const overallAvg = totalQty ? avgPaid : 0;
  const payerOutliers = payerRows
    .filter((row) => row.payer_name)
    .map((row) => {
      const volume = toNumber(row.volume);
      const avgPaidByPayer = volume ? toNumber(row.paid_amount) / volume : 0;
      const deltaPercent = overallAvg === 0 ? 0 : (avgPaidByPayer - overallAvg) / overallAvg;
      const leakageValue = volume * Math.max(0, overallAvg - avgPaidByPayer);
      return {
        payer_name: row.payer_name,
        avg_paid: avgPaidByPayer,
        overall_avg: overallAvg,
        delta_percent: deltaPercent,
        leakage_dollars: leakageValue
      };
    })
    .filter((entry) => entry.avg_paid < overallAvg * 0.9)
    .sort((a, b) => b.leakage_dollars - a.leakage_dollars);

  const customerRows = await all(
    `SELECT customer_name,
            SUM(unit_price_paid * qty) AS paid_amount,
            SUM(qty) AS volume
     FROM transactions
     WHERE sku_code = ?
     GROUP BY customer_name`,
    [skuCode]
  );

  const customerPressure = customerRows
    .filter((row) => row.customer_name)
    .map((row) => {
      const volume = toNumber(row.volume);
      const avgPaidByCustomer = volume ? toNumber(row.paid_amount) / volume : 0;
      return {
        customer_name: row.customer_name,
        avg_paid: avgPaidByCustomer,
        volume,
        uplift_if_matched_avg: Math.max(0, overallAvg - avgPaidByCustomer) * volume
      };
    })
    .sort((a, b) => b.uplift_if_matched_avg - a.uplift_if_matched_avg);

  return {
    sku_code: skuCode,
    avg_cost: avgCost,
    avg_billed: avgBilled,
    avg_paid: avgPaid,
    margin_percent: revenue === 0 ? 0 : (revenue - cogs) / revenue,
    volume: totalQty,
    total_margin: revenue - cogs,
    leakage_dollars: leakage,
    payer_outliers: payerOutliers,
    customer_pressure: customerPressure
  };
}

async function listCustomerSummary({ start, end }) {
  const rows = await all(
    `SELECT customer_name,
            SUM(unit_price_paid * qty) AS revenue,
            SUM(unit_cost * qty) AS cogs,
            SUM(CASE WHEN unit_price_paid < unit_price_billed
                     THEN (unit_price_billed - unit_price_paid) * qty ELSE 0 END) AS leakage
     FROM transactions
     WHERE date(date_of_service) BETWEEN date(?) AND date(?)
     GROUP BY customer_name
     ORDER BY revenue DESC`,
    [start, end]
  );

  return rows.map((row) => {
    const revenue = toNumber(row.revenue);
    const cogs = toNumber(row.cogs);
    const margin = revenue - cogs;
    return {
      customer_name: row.customer_name,
      revenue,
      margin_percent: revenue === 0 ? 0 : margin / revenue,
      leakage: toNumber(row.leakage),
      action_needed: revenue > 0 && (margin / revenue < 0.55 || toNumber(row.leakage) > 0)
    };
  });
}

async function customerProfitability(customerName) {
  const rows = await all('SELECT * FROM transactions WHERE customer_name = ?', [customerName]);
  if (!rows.length) return null;

  const dataset = rows.map((row) => ({
    ...row,
    qty: toNumber(row.qty),
    unit_cost: toNumber(row.unit_cost),
    unit_price_billed: toNumber(row.unit_price_billed),
    unit_price_paid: toNumber(row.unit_price_paid)
  }));

  const gross = calculateGrossMargin(dataset);
  const leakage = calculateLeakage(dataset).total_leakage;
  const revenue = gross.revenue;
  const cogs = gross.cogs;

  const skuDetails = await all(
    `SELECT sku_code,
            SUM(unit_price_paid * qty) AS paid_amount,
            SUM(unit_price_billed * qty) AS billed_amount,
            SUM(unit_cost * qty) AS cost_amount,
            SUM(qty) AS volume
     FROM transactions
     WHERE customer_name = ?
     GROUP BY sku_code`,
    [customerName]
  );

  const skuCodes = skuDetails.map((row) => row.sku_code).filter(Boolean);
  let globalAverages = new Map();
  let medians = new Map();

  if (skuCodes.length) {
    const placeholders = skuCodes.map(() => '?').join(',');
    const globalRows = await all(
      `SELECT sku_code,
              SUM(unit_price_paid * qty) AS paid_amount,
              SUM(qty) AS volume
       FROM transactions
       WHERE sku_code IN (${placeholders})
       GROUP BY sku_code`,
      skuCodes
    );
    globalAverages = new Map(
      globalRows.map((row) => {
        const volume = toNumber(row.volume);
        return [row.sku_code, volume ? toNumber(row.paid_amount) / volume : 0];
      })
    );

    const priceRows = await all(
      `SELECT sku_code, unit_price_paid
       FROM transactions
       WHERE sku_code IN (${placeholders})
       ORDER BY sku_code, unit_price_paid`,
      skuCodes
    );
    const grouped = new Map();
    priceRows.forEach((row) => {
      const arr = grouped.get(row.sku_code) || [];
      arr.push(toNumber(row.unit_price_paid));
      grouped.set(row.sku_code, arr);
    });
    grouped.forEach((arr, code) => {
      arr.sort((a, b) => a - b);
      const mid = Math.floor(arr.length / 2);
      const median = arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
      medians.set(code, median);
    });
  }

  const skuSummary = skuDetails.map((row) => {
    const volume = toNumber(row.volume);
    const paid = toNumber(row.paid_amount);
    const cost = toNumber(row.cost_amount);
    const customerAvgPaid = volume ? paid / volume : 0;
    const globalAvgPaid = globalAverages.get(row.sku_code) || 0;
    const medianPaid = medians.get(row.sku_code) || globalAvgPaid;
    const upliftToMedian = volume * Math.max(0, medianPaid - customerAvgPaid);
    const marginDollar = paid - cost;
    const marginPercent = paid === 0 ? 0 : marginDollar / paid;
    return {
      sku_code: row.sku_code,
      volume,
      customer_avg_paid: customerAvgPaid,
      global_avg_paid: globalAvgPaid,
      median_paid: medianPaid,
      uplift_to_median: upliftToMedian,
      margin_percent: marginPercent
    };
  });

  const underpricedSkus = skuSummary
    .filter((item) => item.median_paid > 0 && item.customer_avg_paid < item.median_paid * 0.98)
    .sort((a, b) => b.uplift_to_median - a.uplift_to_median);

  const totalUplift = underpricedSkus.reduce((sum, sku) => sum + sku.uplift_to_median, 0);

  return {
    customer_name: customerName,
    revenue,
    margin_percent: revenue === 0 ? 0 : (revenue - cogs) / revenue,
    leakage_dollars: leakage,
    total_uplift_to_median: totalUplift,
    sku_summary: skuSummary,
    underpriced_skus: underpricedSkus.slice(0, 10)
  };
}

async function generateRecommendations() {
  const recommendations = [];

  const skuRows = await all(
    `SELECT sku_code,
            SUM(unit_price_paid * qty) AS paid_amount,
            SUM(unit_cost * qty) AS cost_amount,
            SUM(qty) AS volume
     FROM transactions
     GROUP BY sku_code`
  );

  for (const row of skuRows) {
    const skuCode = row.sku_code;
    const volume = toNumber(row.volume);
    if (!skuCode || volume === 0) continue;

    const avgPaid = toNumber(row.paid_amount) / volume;
    const avgCost = toNumber(row.cost_amount) / volume;
    if (avgPaid === 0) continue;

    const marginPct = (avgPaid - avgCost) / avgPaid;
    if (marginPct < DEFAULT_MARGIN_TARGET) {
      const targetPrice = avgCost / (1 - DEFAULT_MARGIN_TARGET);
      const uplift = (targetPrice - avgPaid) * volume;
      if (uplift > 0) {
        recommendations.push({
          category: 'pricing',
          issue_text: `SKU ${skuCode} margin is ${(marginPct * 100).toFixed(1)}%, below ${(DEFAULT_MARGIN_TARGET * 100).toFixed(0)}% target.`,
          suggested_action: `Increase SKU ${skuCode} realized price toward $${targetPrice.toFixed(2)} (current average $${avgPaid.toFixed(2)}).`,
          dollar_impact: Number(uplift.toFixed(2))
        });
      }
    }

    const skuDetail = await skuProfitability(skuCode);
    skuDetail.payer_outliers.slice(0, 3).forEach((outlier) => {
      if (outlier.leakage_dollars > 0) {
        recommendations.push({
          category: 'payer',
          issue_text: `${outlier.payer_name} is reimbursing ${skuCode} ${(outlier.delta_percent * 100).toFixed(1)}% below average.`,
          suggested_action: `Engage ${outlier.payer_name} on ${skuCode}; recovering parity yields ~$${outlier.leakage_dollars.toFixed(0)}.`,
          dollar_impact: Number(outlier.leakage_dollars.toFixed(2))
        });
      }
    });
  }

  const customerRows = await all('SELECT DISTINCT customer_name FROM transactions');
  for (const row of customerRows) {
    const customer = row.customer_name;
    if (!customer) continue;
    const detail = await customerProfitability(customer);
    if (!detail) continue;
    const topUnderpriced = detail.underpriced_skus[0];
    if (topUnderpriced && topUnderpriced.uplift_to_median > 0) {
      recommendations.push({
        category: 'customer',
        issue_text: `${customer} is under market on ${topUnderpriced.sku_code}.`,
        suggested_action: `Raise ${topUnderpriced.sku_code} for ${customer} by $${(topUnderpriced.median_paid - topUnderpriced.customer_avg_paid).toFixed(2)} to recover ~$${topUnderpriced.uplift_to_median.toFixed(0)}.`,
        dollar_impact: Number(topUnderpriced.uplift_to_median.toFixed(2))
      });
    }
  }

  recommendations.sort((a, b) => b.dollar_impact - a.dollar_impact);

  await run('UPDATE recommendations SET status = "resolved", updated_at = datetime("now") WHERE status = "open"');

  const created = [];
  for (const rec of recommendations.slice(0, 25)) {
    const result = await run(
      'INSERT INTO recommendations (category, issue_text, suggested_action, dollar_impact, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
      [rec.category, rec.issue_text, rec.suggested_action, rec.dollar_impact, 'open']
    );
    created.push({ id: result.id, ...rec, status: 'open' });
  }

  return created;
}

module.exports = {
  calculateGrossMargin,
  calculateLeakage,
  skuProfitability,
  customerProfitability,
  generateRecommendations,
  getDashboardSummary,
  listSkuSummary,
  listCustomerSummary
};
