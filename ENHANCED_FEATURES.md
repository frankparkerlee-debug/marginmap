# MarginMap Enhanced Features

**Business-Type-Aware Margin Analysis with Dynamic Benchmarking**

## Overview

MarginMap now supports sophisticated margin analysis tailored to three distinct business types, each with unique cost structures and margin expectations. The system automatically adjusts benchmarks based on product category and business type, while tracking detailed expense breakdowns to identify specific areas of margin erosion.

## Business Types Supported

### 1. Manufacturer
**Value Chain:** Raw material acquisition → Production → Point of sale (wholesaler/retailer)

**Tracked Expenses:**
- **Raw Materials** - Cost of raw materials and components
- **Production Loss/Damage** - Material waste and damaged goods during production
- **Direct Labor** - Production line labor costs
- **Equipment & Maintenance** - Manufacturing equipment costs and maintenance
- **Quality Control** - Testing and quality assurance costs
- **Packaging Materials** - Product packaging and labeling costs

**Typical Margin Benchmarks:**
- Beauty: 55-75% (target: 65%)
- Personal Care: 50-70% (target: 60%)
- Cleaning: 45-65% (target: 55%)
- Medical Supplies: 30-55% (target: 42%)

### 2. Wholesaler
**Value Chain:** Product acquisition (from manufacturer) → Storage → Distribution → Point of sale (retailer)

**Tracked Expenses:**
- **Product Acquisition** - Cost to acquire products from manufacturers
- **Storage & Warehousing** - Warehouse rent, utilities, and storage costs
- **Logistics & Freight** - Inbound and outbound shipping costs
- **Distribution** - Last-mile delivery and distribution costs
- **Handling & Processing** - Order picking, packing, and processing
- **Inventory Shrinkage** - Damaged, lost, or expired inventory

**Typical Margin Benchmarks:**
- Beauty: 40-60% (target: 50%)
- Personal Care: 35-55% (target: 45%)
- Cleaning: 30-50% (target: 40%)
- Medical Supplies: 20-40% (target: 30%)

**Note:** Wholesaler margins are typically 10-15% lower than manufacturer margins due to added logistics and storage costs.

### 3. Retailer
**Value Chain:** Product acquisition (from manufacturer/wholesaler) → Store operations → Point of sale (customer)

**Tracked Expenses:**
- **Product Acquisition** - Wholesale cost of goods purchased
- **Advertising & Marketing** - Marketing campaigns, promotions, and advertising
- **Transportation** - Shipping and delivery costs
- **Store Operations** - Rent, utilities, store maintenance
- **Labor & Staffing** - Retail staff wages and benefits
- **Shrinkage** - Theft, damage, and inventory loss

**Typical Margin Benchmarks:**
- Beauty: 35-55% (target: 45%)
- Personal Care: 30-45% (target: 37%)
- Cleaning: 25-40% (target: 32%)
- Medical Supplies: 15-30% (target: 22%)

**Note:** Retailer margins are typically 20-30% lower than manufacturer margins due to all value chain costs being absorbed.

## Key Features

### 1. Dynamic Margin Benchmarking

Instead of a static 55% target margin, MarginMap now:

- **Category-specific targets**: Each product category has a min, max, and target margin based on industry standards
- **Business-type adjustment**: Benchmarks automatically adjust based on whether you're a manufacturer, wholesaler, or retailer
- **Performance status**: Products are classified as 'excellent' (above target), 'acceptable' (above min), or 'below_target'

**Example:**
```javascript
// For a Beauty product as a Manufacturer:
benchmark = {
  min: 55,
  max: 75,
  target: 65,
  industryAverage: 65
}

// Same Beauty product as a Wholesaler:
benchmark = {
  min: 40,
  max: 60,
  target: 50,
  industryAverage: 50
}
```

### 2. Multi-Dimensional Margin Calculation

**Gross Margin vs. Net Margin:**
- **Gross Margin** = (Revenue - COGS) / Revenue
- **Net Margin** = (Revenue - COGS - Operating Expenses) / Revenue

**Margin Erosion Tracking:**

Three primary erosion factors are tracked:
1. **Discounts** - Promotional pricing and customer-specific discounts
2. **Returns** - Product returns and associated costs
3. **Operating Expenses** - Category-specific business expenses

**Example:**
```javascript
erosionFactors: {
  discounts: {
    amount: 12500,
    percent: 4.1  // 4.1% of revenue lost to discounts
  },
  returns: {
    amount: 8200,
    percent: 2.7,
    rate: 5.2  // 5.2% return rate
  },
  expenses: {
    amount: 45000,
    percent: 14.8,
    breakdown: {
      raw_materials: { name: 'Raw Materials', total: 22000 },
      production_loss: { name: 'Production Loss/Damage', total: 15000 },
      direct_labor: { name: 'Direct Labor', total: 8000 }
    }
  }
}
```

### 3. Enhanced Profitability Analysis

**SKU-Level Analysis:**
- Net margin after all expenses
- Comparison to dynamic benchmark
- Expense breakdown by category
- Identification of margin erosion sources
- Performance status vs. target

**Customer-Level Analysis:**
- Blended net margin across all products
- Average benchmark for product mix
- Total expenses attributed to customer
- Expense categories driving costs

### 4. Business-Type-Specific Recommendations

The AI recommendation engine generates insights tailored to your business type:

**Manufacturer Recommendations:**
- Production efficiency improvements
- Quality control enhancements to reduce waste
- Raw material cost optimization

**Wholesaler Recommendations:**
- Logistics route optimization
- Warehouse efficiency improvements
- Distribution cost reduction

**Retailer Recommendations:**
- Marketing spend optimization
- Store operations efficiency
- Inventory shrinkage reduction

## API Endpoints

### Enhanced Analytics Endpoints

All endpoints require authentication and return business-type-aware metrics.

#### Get Enhanced Dashboard
```
GET /api/enhanced/dashboard
```

Returns:
```javascript
{
  businessType: "manufacturer",
  overview: {
    revenue: 30500000,
    cogs: 12200000,
    totalExpenses: 4560000,
    grossProfit: 18300000,
    netProfit: 13740000,
    grossMarginPercent: 60.0,
    netMarginPercent: 45.0
  },
  expenseBreakdown: {
    raw_materials: { name: 'Raw Materials', total: 2200000 },
    production_loss: { name: 'Production Loss/Damage', total: 1500000 },
    direct_labor: { name: 'Direct Labor', total: 860000 }
  },
  topLowMarginSkus: [...],
  topHighExpenseSkus: [...],
  marginTrend: [...]
}
```

#### Get Enhanced SKU List
```
GET /api/enhanced/sku
```

Returns array of SKUs with enhanced metrics, sorted by revenue.

#### Get Enhanced SKU Details
```
GET /api/enhanced/sku/:skuCode
```

Returns:
```javascript
{
  skuCode: "SKU-1001",
  skuName: "UltraClean Beauty 12-ct Pack",
  category: "Beauty",
  businessType: "manufacturer",
  revenue: 125000,
  cogs: 45000,
  totalExpenses: 12500,
  netMarginPercent: 54.0,
  erosionFactors: {
    discounts: { amount: 5200, percent: 4.2 },
    returns: { amount: 2800, percent: 2.2, rate: 3.5 },
    expenses: {
      amount: 12500,
      percent: 10.0,
      breakdown: {
        raw_materials: { name: 'Raw Materials', total: 7000 },
        packaging: { name: 'Packaging Materials', total: 5500 }
      }
    }
  },
  benchmark: {
    min: 55,
    max: 75,
    target: 65
  },
  performanceVsBenchmark: {
    netMargin: 54.0,
    targetMargin: 65.0,
    gap: 11.0,
    status: "below_target"
  }
}
```

#### Get Margin Erosion Summary
```
GET /api/enhanced/erosion
```

Returns summary of margin erosion across all products.

#### Get Business Type Configuration
```
GET /api/enhanced/business-type
```

Returns:
```javascript
{
  businessType: "manufacturer"
}
```

#### Get Expense Categories
```
GET /api/enhanced/expense-categories
```

Returns all active expense categories for current business type.

#### Get Margin Benchmark
```
GET /api/enhanced/benchmark/:category
```

Returns benchmark targets for specified category.

## Database Schema

### New Tables

#### `business_config`
Stores active business type configuration.

```sql
CREATE TABLE business_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_type TEXT CHECK(business_type IN ('manufacturer', 'wholesaler', 'retailer')),
  is_active BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `expense_categories`
Defines expense categories for each business type.

```sql
CREATE TABLE expense_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_type TEXT NOT NULL,
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  UNIQUE(business_type, category_code)
);
```

#### `transaction_expenses`
Tracks expenses at transaction level.

```sql
CREATE TABLE transaction_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL,
  expense_category_id INTEGER NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id)
);
```

#### `margin_benchmarks`
Stores dynamic benchmarks by category and business type.

```sql
CREATE TABLE margin_benchmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  business_type TEXT NOT NULL,
  target_margin_min REAL NOT NULL,
  target_margin_max REAL NOT NULL,
  industry_average REAL,
  UNIQUE(category, business_type)
);
```

#### `margin_history`
Tracks historical margin performance for trend analysis.

```sql
CREATE TABLE margin_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku_code TEXT NOT NULL,
  customer_name TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  revenue REAL NOT NULL,
  cogs REAL NOT NULL,
  total_expenses REAL DEFAULT 0,
  margin_percent REAL NOT NULL
);
```

## Configuration

### Setting Business Type

Update the `settings` table to change business type:

```sql
UPDATE settings SET value = 'wholesaler' WHERE key = 'business_type';
```

Valid values: `manufacturer`, `wholesaler`, `retailer`

### Customizing Benchmarks

Adjust benchmarks in the `margin_benchmarks` table:

```sql
UPDATE margin_benchmarks
SET target_margin_min = 50,
    target_margin_max = 70,
    industry_average = 60
WHERE category = 'Beauty' AND business_type = 'manufacturer';
```

### Adding Custom Expense Categories

```sql
INSERT INTO expense_categories (business_type, category_code, category_name, description)
VALUES ('manufacturer', 'r_and_d', 'Research & Development', 'Product development and testing costs');
```

## Use Cases

### Use Case 1: Manufacturer Identifying Production Inefficiencies

**Scenario:** CPG manufacturer notices net margin is 10% below target.

**Analysis Flow:**
1. View enhanced dashboard → identifies high expense ratio (18% of revenue)
2. Expense breakdown shows "Production Loss/Damage" at $1.5M (5% of revenue)
3. AI recommendation suggests: "Implement quality control improvements - target 30% waste reduction"
4. Drill into specific SKUs with highest production loss
5. Focus improvement efforts on top 5 products

**Result:** Reducing production loss by 30% recovers $450K in margin.

### Use Case 2: Wholesaler Optimizing Logistics Costs

**Scenario:** Distributor's net margin is 8% below industry average.

**Analysis Flow:**
1. Enhanced customer analysis shows logistics costs at 12% of revenue
2. Benchmark for wholesalers in this category suggests 8% is optimal
3. AI recommendation: "Optimize shipping routes and consolidate shipments - 15% savings potential"
4. Expense breakdown identifies specific high-cost routes
5. Implement route optimization and shipment consolidation

**Result:** Reducing logistics costs by 15% improves margin by 1.8%, recovering $540K.

### Use Case 3: Retailer Improving Marketing Efficiency

**Scenario:** Retailer spending heavily on advertising with declining margins.

**Analysis Flow:**
1. Margin erosion summary shows advertising at 14% of revenue
2. Enhanced SKU analysis reveals marketing spend concentrated on low-margin products
3. AI recommendation: "Focus ad spend on high-margin products - improve ROAS by 20%"
4. Reallocate budget to products with 35%+ margins
5. Track improvement via margin trend analysis

**Result:** Improving marketing ROI by 20% recovers $280K while maintaining revenue.

## Migration Guide

### From Basic to Enhanced Analytics

1. **Run database migrations** to create new tables
2. **Set business type** in settings table
3. **Optionally adjust benchmarks** for your specific industry
4. **Use enhanced API endpoints** for new functionality
5. **Existing data continues to work** - enhanced features add to, not replace, existing metrics

### Backward Compatibility

All existing API endpoints continue to work:
- `/api/dashboard` - Returns gross margin metrics
- `/api/sku/:skuCode` - Returns basic SKU profitability
- `/api/customers/:customerName` - Returns basic customer analysis

New enhanced endpoints provide additional detail without breaking existing integrations.

## Best Practices

### 1. Choose the Right Business Type

Select the business type that best represents your position in the value chain:
- **Manufacturer** if you produce goods from raw materials
- **Wholesaler** if you distribute manufactured goods to retailers
- **Retailer** if you sell directly to end customers

### 2. Track All Relevant Expenses

For accurate net margin calculation, ensure all operating expenses are captured:
- Use transaction-level expense tracking for precise attribution
- Regularly review expense categories for completeness
- Update expense amounts as costs change

### 3. Review Benchmarks Regularly

Industry benchmarks evolve over time:
- Update targets quarterly based on market conditions
- Adjust for competitive pressures and pricing changes
- Consider seasonal variations in margin expectations

### 4. Focus on High-Impact Opportunities

Prioritize margin improvements by dollar impact:
- Start with recommendations ranked by dollar impact
- Address high-expense products first
- Target customers with significant revenue and low margins

## Future Enhancements

Planned features for the enhanced analytics system:

- **Multi-business-type support** - Track different business types for different product lines
- **Historical trend analysis** - Compare current vs. previous periods
- **Predictive margin forecasting** - ML-based margin predictions
- **Custom benchmark creation** - Define your own targets by product, customer, or region
- **Expense budgeting** - Set expense targets and track variance
- **Automated alerts** - Get notified when margins fall below thresholds

---

**Generated:** 2025-11-04
**Version:** 2.0.0
**Author:** MarginMap Team
