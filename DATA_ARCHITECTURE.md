# MarginMap Data Architecture - Multi-Source Aggregation

## The Real-World Problem

### Current (Naive) Assumption
- User has one perfect spreadsheet with all data
- Every row has: date, customer, SKU, qty, cost, price, discount, returns

### Reality
Users have **5-10+ separate spreadsheets** from different systems:

1. **ERP/Sales Data** (SAP, NetSuite, QuickBooks)
   - SKU, Customer, Order Date, Quantity Sold, Unit Price
   - ❌ Missing: Costs, Discounts, Returns

2. **Cost/COGS Data** (Separate system or manual tracking)
   - SKU, Period, Unit Cost, Raw Material Cost
   - ❌ Missing: Sales info, customer info

3. **Returns/Quality Data** (RMA system, warehouse system)
   - SKU, Return Date, Quantity Returned, Reason
   - ❌ Missing: Original order info

4. **Discount/Promotions Data** (Pricing system, contracts)
   - Customer, SKU, Discount %, Promo Code, Date Range
   - ❌ Missing: Actual transaction amounts

5. **Expense Data** (Multiple sources!)
   - **Manufacturing:** Production logs, waste reports, labor tracking
   - **Logistics:** Freight invoices, warehouse bills, carrier reports
   - **Marketing:** Ad spend by campaign, attributed to product categories

6. **Master Data** (Often in separate files)
   - **Product Master:** SKU, Name, Category, Weight, Dimensions
   - **Customer Master:** Customer ID, Name, Region, Tier, Sales Rep
   - **Price Lists:** Customer-specific pricing, contracts

### The Challenge

**User journey today:**
1. Export sales from SAP → CSV
2. Export costs from separate cost system → Excel
3. Export returns from warehouse → CSV
4. Export marketing spend from Google/Facebook → CSV
5. Manually join in Excel (error-prone, time-consuming)
6. Upload to MarginMap

**This takes hours and users give up.**

---

## Proposed Solution: Smart Data Hub

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ Multiple Data Sources                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 Sales Data        💰 Cost Data       📦 Returns     │
│  (ERP/CRM)            (Cost System)      (Warehouse)    │
│                                                          │
│  💸 Discounts         📈 Marketing       👥 Masters     │
│  (Pricing System)     (Ad Platforms)     (MDM)          │
│                                                          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ Smart Upload & Mapping Layer                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  • Auto-detect file type (sales, cost, returns, etc.)  │
│  • Map columns to standard schema                       │
│  • Suggest join keys (SKU, customer, date)             │
│  • Validate data quality                                │
│  • Preview merged result                                │
│                                                          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ Unified Data Model                                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Product-Level Aggregated View                          │
│  (All sources joined and reconciled)                    │
│                                                          │
│  • Sales transactions (from ERP)                        │
│  • Costs enriched (from cost system)                    │
│  • Returns matched (from warehouse)                     │
│  • Discounts applied (from pricing)                     │
│  • Expenses allocated (from various sources)            │
│                                                          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ Analysis & Insights                                     │
└─────────────────────────────────────────────────────────┘
```

---

## New Database Schema

### Core Tables

#### 1. `data_sources` - Track uploaded files
```sql
CREATE TABLE data_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL,  -- 'sales', 'costs', 'returns', 'discounts', 'expenses', 'master_product', 'master_customer'
  filename TEXT NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER,
  period_start DATE,
  period_end DATE,
  row_count INTEGER,
  status TEXT DEFAULT 'pending',  -- 'pending', 'mapped', 'integrated', 'error'
  mapping_config TEXT,  -- JSON of column mappings
  notes TEXT,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
```

#### 2. `products` - Product master data
```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku_code TEXT UNIQUE NOT NULL,
  sku_name TEXT,
  category TEXT,
  subcategory TEXT,
  brand TEXT,
  product_line TEXT,
  weight REAL,
  dimensions TEXT,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `customers` - Customer master data
```sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_code TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_type TEXT,  -- 'strategic', 'mid_market', 'small'
  region TEXT,
  sales_rep TEXT,
  payment_terms TEXT,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. `sales_transactions` - Core sales data
```sql
CREATE TABLE sales_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER,  -- Link to data_sources
  transaction_date DATE NOT NULL,
  invoice_id TEXT,
  sku_code TEXT NOT NULL,
  customer_code TEXT NOT NULL,
  qty_sold REAL NOT NULL,
  unit_price REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES data_sources(id),
  FOREIGN KEY (sku_code) REFERENCES products(sku_code),
  FOREIGN KEY (customer_code) REFERENCES customers(customer_code)
);

CREATE INDEX idx_sales_sku_date ON sales_transactions(sku_code, transaction_date);
CREATE INDEX idx_sales_customer_date ON sales_transactions(customer_code, transaction_date);
```

#### 5. `cost_data` - Product costs by period
```sql
CREATE TABLE cost_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER,
  sku_code TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  unit_cost REAL NOT NULL,
  cost_type TEXT,  -- 'standard', 'actual', 'average'
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES data_sources(id),
  FOREIGN KEY (sku_code) REFERENCES products(sku_code)
);

CREATE INDEX idx_cost_sku_period ON cost_data(sku_code, period_start, period_end);
```

#### 6. `returns_data` - Product returns
```sql
CREATE TABLE returns_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER,
  return_date DATE NOT NULL,
  original_invoice_id TEXT,
  sku_code TEXT NOT NULL,
  customer_code TEXT,
  qty_returned REAL NOT NULL,
  return_reason TEXT,
  return_value REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES data_sources(id),
  FOREIGN KEY (sku_code) REFERENCES products(sku_code)
);

CREATE INDEX idx_returns_sku_date ON returns_data(sku_code, return_date);
```

#### 7. `discount_data` - Discounts and promotions
```sql
CREATE TABLE discount_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER,
  sku_code TEXT,
  customer_code TEXT,
  discount_type TEXT,  -- 'promotion', 'contract', 'rebate', 'volume'
  discount_amount REAL,
  discount_percent REAL,
  start_date DATE,
  end_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES data_sources(id)
);
```

#### 8. `expense_allocations` - Expenses allocated to products
```sql
CREATE TABLE expense_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER,
  expense_category_id INTEGER NOT NULL,
  sku_code TEXT,  -- NULL = company-level expense
  customer_code TEXT,  -- NULL = not customer-specific
  region TEXT,  -- NULL = not region-specific
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount REAL NOT NULL,
  allocation_method TEXT,  -- 'direct', 'revenue_based', 'volume_based', 'manual'
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES data_sources(id),
  FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id)
);

CREATE INDEX idx_expense_sku_period ON expense_allocations(sku_code, period_start, period_end);
```

#### 9. `unified_transactions` - Materialized view (computed)
```sql
-- This is the "golden record" that joins everything together
CREATE TABLE unified_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_date DATE NOT NULL,
  sku_code TEXT NOT NULL,
  customer_code TEXT NOT NULL,

  -- Sales data
  qty_sold REAL NOT NULL,
  unit_price REAL NOT NULL,
  revenue REAL NOT NULL,

  -- Cost data (matched by period)
  unit_cost REAL,
  cogs REAL,

  -- Returns data (matched by date range)
  qty_returned REAL DEFAULT 0,
  return_value REAL DEFAULT 0,

  -- Discount data (matched by customer/SKU/date)
  unit_discount REAL DEFAULT 0,
  discount_value REAL DEFAULT 0,

  -- Allocated expenses (from expense_allocations)
  allocated_expenses REAL DEFAULT 0,

  -- Computed fields
  net_quantity REAL,  -- qty_sold - qty_returned
  net_revenue REAL,   -- revenue - discount_value - return_value
  gross_profit REAL,  -- net_revenue - cogs
  net_profit REAL,    -- gross_profit - allocated_expenses
  gross_margin_pct REAL,
  net_margin_pct REAL,

  -- Metadata
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (sku_code) REFERENCES products(sku_code),
  FOREIGN KEY (customer_code) REFERENCES customers(customer_code)
);

CREATE INDEX idx_unified_sku_date ON unified_transactions(sku_code, transaction_date);
CREATE INDEX idx_unified_customer_date ON unified_transactions(customer_code, transaction_date);
CREATE INDEX idx_unified_date ON unified_transactions(transaction_date);
```

---

## Smart Upload Flow

### Step 1: Upload & Auto-Detect

```javascript
// Detect file type from column names
function detectSourceType(columns) {
  const colLower = columns.map(c => c.toLowerCase());

  // Sales indicators
  if (hasColumns(colLower, ['invoice', 'order', 'sold', 'quantity', 'price'])) {
    return {
      type: 'sales',
      confidence: 0.9,
      suggestedMappings: {
        'invoice_id': findColumn(columns, ['invoice', 'order_id', 'order_number']),
        'sku_code': findColumn(columns, ['sku', 'product_code', 'item_code']),
        'qty_sold': findColumn(columns, ['quantity', 'qty', 'units_sold']),
        'unit_price': findColumn(columns, ['price', 'unit_price', 'sale_price'])
      }
    };
  }

  // Cost indicators
  if (hasColumns(colLower, ['cost', 'cogs', 'unit_cost'])) {
    return {
      type: 'costs',
      confidence: 0.85,
      suggestedMappings: {
        'sku_code': findColumn(columns, ['sku', 'product_code']),
        'unit_cost': findColumn(columns, ['unit_cost', 'cost', 'cogs']),
        'period': findColumn(columns, ['period', 'month', 'date'])
      }
    };
  }

  // Returns indicators
  if (hasColumns(colLower, ['return', 'rma', 'returned'])) {
    return {
      type: 'returns',
      confidence: 0.8,
      suggestedMappings: {
        'sku_code': findColumn(columns, ['sku', 'product']),
        'qty_returned': findColumn(columns, ['quantity', 'qty_returned', 'units']),
        'return_date': findColumn(columns, ['date', 'return_date'])
      }
    };
  }

  // Expense indicators
  if (hasColumns(colLower, ['expense', 'cost', 'amount', 'category'])) {
    return {
      type: 'expenses',
      confidence: 0.75,
      suggestedMappings: {
        'category': findColumn(columns, ['category', 'expense_type', 'account']),
        'amount': findColumn(columns, ['amount', 'cost', 'total']),
        'period': findColumn(columns, ['date', 'period', 'month'])
      }
    };
  }

  return { type: 'unknown', confidence: 0 };
}
```

### Step 2: Guided Mapping Interface

```
┌─────────────────────────────────────────────────────────┐
│ Step 1 of 3: Identify Your Data                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 We detected this is: Sales Data (90% confident)     │
│                                                          │
│  This file contains transaction/order data with:        │
│  • Invoice/Order IDs                                    │
│  • Product SKUs                                         │
│  • Quantities and Prices                                │
│                                                          │
│  Is this correct?                                       │
│  ○ Yes, this is sales data                             │
│  ○ No, this is: [Cost Data ▼]                          │
│                                                          │
│  [Next: Map Columns]                                    │
└─────────────────────────────────────────────────────────┘
```

### Step 3: Column Mapping

```
┌─────────────────────────────────────────────────────────┐
│ Step 2 of 3: Map Your Columns                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Your Column          →  MarginMap Field               │
│  ──────────────────────────────────────────────────    │
│  Order_Number         →  Invoice ID           ✓        │
│  Item_Code            →  SKU Code             ✓        │
│  Customer_Name        →  Customer Name        ✓        │
│  Order_Date           →  Transaction Date     ✓        │
│  Quantity             →  Quantity Sold        ✓        │
│  Unit_Price           →  Unit Price           ✓        │
│  Discount_Amt         →  Unit Discount        ✓        │
│  Region               →  Region               ✓        │
│                                                          │
│  ⚠ Missing: Unit Cost                                  │
│  You'll need to upload cost data separately            │
│                                                          │
│  Preview (first 5 rows):                                │
│  ┌──────────────────────────────────────────────┐      │
│  │ SKU-1001 | Walmart | 2024-10-15 | 240 | $7.50│     │
│  │ SKU-1002 | Target  | 2024-10-15 | 180 | $8.25│     │
│  └──────────────────────────────────────────────┘      │
│                                                          │
│  [Back] [Save Mapping Template] [Import Data]          │
└─────────────────────────────────────────────────────────┘
```

### Step 4: Data Integration Status

```
┌─────────────────────────────────────────────────────────┐
│ Data Sources Overview                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ✓ Sales Data            Uploaded: Oct 15, 2024        │
│    5,000 transactions                                   │
│    Period: Oct 1-31, 2024                              │
│    [View] [Update] [Delete]                             │
│                                                          │
│  ⚠ Cost Data             Missing                        │
│    Without this, we'll use last month's costs          │
│    [Upload Cost Data]                                   │
│                                                          │
│  ✓ Returns Data          Uploaded: Oct 15, 2024        │
│    127 return records                                   │
│    Matched to 127 sales transactions                   │
│    [View] [Update] [Delete]                             │
│                                                          │
│  ○ Discount Data         Optional                       │
│    We'll use discount column from sales data           │
│    [Upload Discount/Contract Data]                      │
│                                                          │
│  ○ Expense Data          Optional                       │
│    Upload to see net margin (not just gross)           │
│    [Upload Expense Data]                                │
│                                                          │
│  Data Completeness: 75% ░░░░░░░░░░░░░░░░░░              │
│                                                          │
│  💡 Recommendation: Upload cost data to get accurate   │
│  margins for October. We're using last month's costs.  │
│                                                          │
│  [Start Analysis] [Upload More Data]                    │
└─────────────────────────────────────────────────────────┘
```

---

## Data Aggregation Logic

### Joining Sales + Costs

```javascript
// Match costs to sales by period
function enrichSalesWithCosts(salesTransactions, costData) {
  return salesTransactions.map(sale => {
    // Find cost for this SKU for this time period
    const cost = costData.find(c =>
      c.sku_code === sale.sku_code &&
      sale.transaction_date >= c.period_start &&
      sale.transaction_date <= c.period_end
    );

    if (!cost) {
      // Fall back to most recent cost
      const recentCost = costData
        .filter(c => c.sku_code === sale.sku_code && c.period_start <= sale.transaction_date)
        .sort((a, b) => b.period_start - a.period_start)[0];

      return {
        ...sale,
        unit_cost: recentCost?.unit_cost || 0,
        cost_source: recentCost ? 'fallback' : 'missing',
        cost_warning: !recentCost
      };
    }

    return {
      ...sale,
      unit_cost: cost.unit_cost,
      cost_source: 'matched',
      cost_warning: false
    };
  });
}
```

### Matching Returns to Sales

```javascript
// Match returns to original sales within date window
function matchReturnsToSales(salesTransactions, returnsData) {
  const salesByInvoice = groupBy(salesTransactions, 'invoice_id');

  const matched = [];
  const unmatched = [];

  for (const returnRecord of returnsData) {
    // Try to match by invoice ID
    if (returnRecord.original_invoice_id && salesByInvoice[returnRecord.original_invoice_id]) {
      const originalSale = salesByInvoice[returnRecord.original_invoice_id].find(
        s => s.sku_code === returnRecord.sku_code
      );

      if (originalSale) {
        matched.push({
          ...returnRecord,
          matched_sale_id: originalSale.id,
          match_confidence: 'high'
        });
        continue;
      }
    }

    // Fall back to fuzzy matching by SKU + Customer + Date range
    const potentialMatches = salesTransactions.filter(sale =>
      sale.sku_code === returnRecord.sku_code &&
      sale.customer_code === returnRecord.customer_code &&
      Math.abs(daysBetween(sale.transaction_date, returnRecord.return_date)) <= 90
    );

    if (potentialMatches.length === 1) {
      matched.push({
        ...returnRecord,
        matched_sale_id: potentialMatches[0].id,
        match_confidence: 'medium'
      });
    } else if (potentialMatches.length > 1) {
      // Match to most recent sale
      const mostRecent = potentialMatches.sort((a, b) =>
        b.transaction_date - a.transaction_date
      )[0];

      matched.push({
        ...returnRecord,
        matched_sale_id: mostRecent.id,
        match_confidence: 'low'
      });
    } else {
      unmatched.push(returnRecord);
    }
  }

  return { matched, unmatched };
}
```

### Allocating Expenses to Products

```javascript
// Allocate expenses to products based on allocation method
function allocateExpenses(expenseData, salesTransactions, products) {
  const allocations = [];

  for (const expense of expenseData) {
    if (expense.sku_code) {
      // Direct allocation - already assigned to a SKU
      allocations.push({
        sku_code: expense.sku_code,
        amount: expense.amount,
        allocation_method: 'direct'
      });
    } else if (expense.allocation_method === 'revenue_based') {
      // Allocate based on revenue proportion
      const periodSales = salesTransactions.filter(s =>
        s.transaction_date >= expense.period_start &&
        s.transaction_date <= expense.period_end
      );

      const totalRevenue = periodSales.reduce((sum, s) =>
        sum + (s.qty_sold * s.unit_price), 0
      );

      const bySku = groupBy(periodSales, 'sku_code');

      for (const [sku, sales] of Object.entries(bySku)) {
        const skuRevenue = sales.reduce((sum, s) =>
          sum + (s.qty_sold * s.unit_price), 0
        );

        const allocatedAmount = (skuRevenue / totalRevenue) * expense.amount;

        allocations.push({
          sku_code: sku,
          amount: allocatedAmount,
          allocation_method: 'revenue_based',
          allocation_percent: (skuRevenue / totalRevenue) * 100
        });
      }
    } else if (expense.allocation_method === 'volume_based') {
      // Allocate based on units sold
      const periodSales = salesTransactions.filter(s =>
        s.transaction_date >= expense.period_start &&
        s.transaction_date <= expense.period_end
      );

      const totalUnits = periodSales.reduce((sum, s) =>
        sum + s.qty_sold, 0
      );

      const bySku = groupBy(periodSales, 'sku_code');

      for (const [sku, sales] of Object.entries(bySku)) {
        const skuUnits = sales.reduce((sum, s) =>
          sum + s.qty_sold, 0
        );

        const allocatedAmount = (skuUnits / totalUnits) * expense.amount;

        allocations.push({
          sku_code: sku,
          amount: allocatedAmount,
          allocation_method: 'volume_based',
          allocation_percent: (skuUnits / totalUnits) * 100
        });
      }
    }
  }

  return allocations;
}
```

---

## User Flow: First-Time Setup

### Scenario: New User with 3 Files

User has:
1. **sales_october.csv** - From QuickBooks (5,000 rows)
2. **product_costs_q4.xlsx** - From cost accounting system (800 rows)
3. **returns_october.csv** - From warehouse system (127 rows)

**Step-by-Step:**

```
1. Upload sales_october.csv
   → MarginMap detects: Sales Data (90% confidence)
   → Auto-maps columns
   → User confirms
   → Status: "Sales data imported ✓ - But we're missing costs"

2. Upload product_costs_q4.xlsx
   → MarginMap detects: Cost Data (85% confidence)
   → Auto-maps columns
   → Matches 782 of 800 SKUs to sales data
   → Shows warning: "18 SKUs in cost file but not in sales"
   → User confirms
   → Status: "Enriching sales with costs... ✓ 4,891 of 5,000 matched"

3. Upload returns_october.csv
   → MarginMap detects: Returns Data (80% confidence)
   → Auto-maps columns
   → Fuzzy matches 127 returns to original sales
   → Shows: "115 high-confidence matches, 12 medium-confidence"
   → User confirms
   → Status: "Returns matched to sales ✓"

4. Final Status
   ┌─────────────────────────────────────────────────┐
   │ ✓ Data Integration Complete!                   │
   │                                                 │
   │ 5,000 transactions analyzed                    │
   │ Period: October 1-31, 2024                     │
   │                                                 │
   │ Data Quality:                                  │
   │ • 97.8% of transactions have costs             │
   │ • 2.5% have returns                            │
   │ • 0 have expense allocations (optional)        │
   │                                                 │
   │ [View Dashboard] [Upload More Data]            │
   └─────────────────────────────────────────────────┘
```

---

## Advanced Features

### 1. Template Library

```
┌─────────────────────────────────────────────────────────┐
│ Saved Mapping Templates                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ✓ QuickBooks Sales Export                              │
│    Last used: Oct 15, 2024                              │
│    Columns: Order #, Item, Customer, Date, Qty, Price  │
│    [Use Template] [Edit] [Delete]                       │
│                                                          │
│  ✓ Cost Accounting System                               │
│    Last used: Oct 15, 2024                              │
│    Columns: SKU, Period, Standard Cost, Actual Cost    │
│    [Use Template] [Edit] [Delete]                       │
│                                                          │
│  [+ Create New Template]                                │
└─────────────────────────────────────────────────────────┘
```

### 2. Automated Scheduling

```
┌─────────────────────────────────────────────────────────┐
│ Automated Data Refresh                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ○ Monthly Upload Reminder                              │
│    Send email on 5th of each month                      │
│    Reminder: "Upload October data now"                  │
│                                                          │
│  ○ Email Upload (Coming Soon)                           │
│    Email CSV files to: data@marginmap.io                │
│    We'll auto-import using your templates               │
│                                                          │
│  ○ API Integration (Enterprise)                         │
│    Connect directly to: QuickBooks, NetSuite, SAP       │
│    Auto-sync: Daily, Weekly, Monthly                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3. Data Quality Dashboard

```
┌─────────────────────────────────────────────────────────┐
│ Data Quality Score: 87/100                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ✓ Sales Data: Excellent (100%)                         │
│    All required fields present                          │
│                                                          │
│  ⚠ Cost Data: Good (95%)                                │
│    109 transactions using fallback costs               │
│    → Upload more recent cost data                       │
│                                                          │
│  ⚠ Returns Data: Fair (85%)                             │
│    12 returns matched with medium confidence           │
│    → Include invoice IDs in returns file                │
│                                                          │
│  ❌ Expense Data: Missing (0%)                           │
│    Showing gross margin only (not net)                 │
│    → Upload expense data for full analysis              │
│                                                          │
│  [View Detailed Report] [Upload Missing Data]          │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

### Phase 1: Multi-File Upload (Week 1-2)
- [ ] New database schema (data_sources, products, customers, etc.)
- [ ] File type auto-detection
- [ ] Column mapping interface
- [ ] Sales + Cost joining logic

### Phase 2: Returns & Discounts (Week 3)
- [ ] Returns matching algorithm
- [ ] Discount application logic
- [ ] Data quality scoring

### Phase 3: Expense Allocation (Week 4)
- [ ] Expense allocation methods (direct, revenue-based, volume-based)
- [ ] Allocation UI
- [ ] Net margin calculation

### Phase 4: Template & Automation (Week 5-6)
- [ ] Mapping template library
- [ ] Upload history & versioning
- [ ] Automated reminders
- [ ] Data refresh workflow

---

## Key Benefits

1. **No More Excel Hell:** Users upload raw files from each system
2. **Smart Matching:** Auto-joins data on SKU, customer, date
3. **Incremental:** Upload sales first, add costs later
4. **Flexible:** Works with any file format/column names
5. **Auditable:** Track which data came from which source
6. **Quality Alerts:** Know when data is incomplete or stale

This is how real businesses actually work!
