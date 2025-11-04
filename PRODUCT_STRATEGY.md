# MarginMap Product Strategy - Role-Based Value Proposition

## Executive Summary

MarginMap needs to deliver specific, actionable value to different roles within each business type. This document defines the strategic direction for features, filters, and user flows that drive decisions with minimal friction.

---

## 1. User Roles by Business Type

### Manufacturer Roles

**VP Operations / Plant Manager**
- **Job:** Minimize production costs, maximize throughput
- **Pain:** Can't pinpoint which products have highest waste/loss
- **Value:** See production loss by SKU → Fix quality issues on high-volume products first

**Category Manager**
- **Job:** Decide which products to invest in R&D/marketing
- **Pain:** Can't tell which categories are actually profitable after all costs
- **Value:** Compare net margin by category → Kill low-margin categories, double down on winners

**Procurement Director**
- **Job:** Negotiate raw material costs, manage supplier relationships
- **Pain:** Doesn't know which SKUs are most sensitive to raw material cost changes
- **Value:** See raw material cost breakdown by SKU → Negotiate hardest on high-impact materials

**Product Line Owner**
- **Job:** Maximize profitability of their specific product line
- **Pain:** Can't compare their line's performance vs company targets
- **Value:** Filter to their product line → See which SKUs drag down line average

### Wholesaler/Distributor Roles

**Logistics Director**
- **Job:** Minimize shipping and warehousing costs
- **Pain:** Can't identify which customers/regions have highest logistics costs
- **Value:** See logistics cost per customer/region → Optimize routes, consolidate shipments

**Sales Director**
- **Job:** Grow revenue while maintaining margins
- **Pain:** Can't tell which customers are profitable after logistics/storage costs
- **Value:** See net margin by customer → Renegotiate with low-margin accounts

**Inventory Manager**
- **Job:** Balance stock levels vs carrying costs
- **Pain:** Doesn't know true carrying cost impact on margin
- **Value:** See storage cost by SKU → Reduce inventory of high-storage-cost items

**Customer Success Manager**
- **Job:** Keep key accounts happy and profitable
- **Pain:** Can't justify pricing to customers, leading to discount creep
- **Value:** Show customer their margin vs benchmarks → Data-driven pricing discussions

### Retailer Roles

**Store Operations Manager**
- **Job:** Maximize profit per square foot
- **Pain:** Can't tell which products are worth the shelf space after all costs
- **Value:** See net margin per SKU → Optimize assortment, remove low-performers

**Marketing Director**
- **Job:** Drive sales with efficient marketing spend
- **Pain:** Can't measure true ROI of marketing on margin
- **Value:** See marketing cost impact on net margin → Shift spend to high-margin products

**Category Manager**
- **Job:** Optimize category mix and pricing
- **Pain:** Can't compare category performance after all operational costs
- **Value:** Filter by category → See true profitability including labor, shrinkage, marketing

**Merchandising Director**
- **Job:** Select products and negotiate vendor terms
- **Pain:** Can't evaluate vendor profitability after all costs
- **Value:** Compare vendors by net margin → Negotiate better terms or switch vendors

---

## 2. Critical Filters Needed

### Global Filters (All Pages)

**Business Type Filter** (Top right, persistent)
```
[Manufacturer ▼] [Wholesaler] [Retailer]
```
- Automatically adjusts benchmarks, expense categories, recommendations
- Persists across sessions

**Date Range Filter** (Top bar)
```
[Last 30 Days ▼] [Custom Range]
```
- Quick presets: Last 7 days, Last 30 days, Last 90 days, This Quarter, Last Quarter, This Year
- Custom date picker for precise ranges

**Business Unit Filter** (For multi-division companies)
```
[All Business Units ▼] [Filter by: Division, Region, Product Line]
```
- Allows Category Managers to focus on their portfolio
- Allows Regional Managers to see their region only

### Dashboard Filters

**Performance Status**
```
☐ Below Target  ☐ Acceptable  ☐ Excellent
```
- Quick filter to focus on problem areas

**Margin Threshold**
```
Show SKUs with net margin < [40]%
```
- Adjustable slider or input

**Top N Filter**
```
Show top [10 ▼] SKUs by: [Revenue ▼]
Options: Revenue, Margin $, Margin %, Expenses, Erosion
```

### SKU Explorer Filters

**Category Filter**
```
☐ Beauty  ☐ Cleaning  ☐ Personal Care  ☐ Medical Supplies
☐ Paper Goods  ☐ Food & Beverage  ☐ Health & Wellness  ☐ Home Goods
[Select All] [Clear All]
```

**Performance Filter**
```
○ All SKUs
○ Below Target Only (net margin < category benchmark)
○ High Expense (expense ratio > 15%)
○ High Returns (return rate > 5%)
```

**Sort Options**
```
Sort by: [Net Margin % (Low to High) ▼]
Options:
- Revenue (High to Low)
- Net Margin % (Low to High / High to Low)
- Net Margin $ (High to Low)
- Expense Ratio (High to Low)
- Return Rate (High to Low)
- Gap from Target (High to Low)
```

**Search/Quick Filter**
```
[🔍 Search SKU code or name...]
```

### Customer Profitability Filters

**Customer Type/Tier**
```
☐ Strategic Accounts  ☐ Mid-Market  ☐ Small Accounts
```

**Margin Filter**
```
○ All Customers
○ Below Average Margin
○ High Expense (expense ratio > 15%)
○ High Leakage (discounts + returns > 10%)
```

**Region Filter** (For wholesalers/distributors)
```
☐ Northeast  ☐ Southeast  ☐ Midwest  ☐ West  ☐ Southwest
```

**Volume Filter**
```
Show customers with revenue > [$10,000]
```

### Actions/Recommendations Filters

**Priority Filter**
```
☐ High Priority  ☐ Medium Priority  ☐ Low Priority
```

**Category Filter**
```
☐ Pricing  ☐ Cost Reduction  ☐ Returns/Quality
☐ Customer Renegotiation  ☐ Manufacturing
☐ Logistics  ☐ Marketing
```

**Impact Filter**
```
Show recommendations with impact > [$5,000]
```

---

## 3. Role-Specific Views & Workflows

### For Category Managers

**Primary View: Category Performance Dashboard**

```
┌─────────────────────────────────────────────────────────┐
│ [All Categories ▼] vs [Beauty ▼]  [Last Quarter ▼]     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Beauty Category Performance                             │
│  ┌────────────────────────────────────────────────┐     │
│  │ Net Margin: 58.2% ░░░░░░░░░░░░░░░░░░ Target: 65%│   │
│  │ Gap: -6.8%  Status: Below Target                │     │
│  │                                                  │     │
│  │ Top Erosion Sources:                            │     │
│  │ • Discounts: $125K (4.2%)                       │     │
│  │ • Packaging: $89K (3.0%)                        │     │
│  │ • Returns: $56K (1.9%)                          │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  Bottom 5 SKUs Dragging Category Down                   │
│  ┌────────────────────────────────────────────────┐     │
│  │ SKU-1234  UltraGlow Serum    42.1%  -22.9% gap │     │
│  │ SKU-1235  PureRadiance Cream 48.3%  -16.7% gap │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  [Compare to Other Categories]  [Export Report]         │
└─────────────────────────────────────────────────────────┘
```

**Key Actions:**
1. One-click filter to their category
2. Compare category performance vs others
3. Drill into worst-performing SKUs
4. Export category report for leadership

### For Procurement Directors (Manufacturer)

**Primary View: Raw Material Impact Analysis**

```
┌─────────────────────────────────────────────────────────┐
│ Raw Material Cost Impact Dashboard                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Top 5 Materials by Cost Impact                         │
│  ┌────────────────────────────────────────────────┐     │
│  │ Material         Cost    % of COGS  SKUs Using │     │
│  │ ─────────────────────────────────────────────  │     │
│  │ Plastic Resin   $2.2M      14.3%      247      │     │
│  │ Aluminum        $1.8M      11.8%      156      │     │
│  │ Organic Cotton  $1.1M       7.2%       89      │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  Price Sensitivity Analysis                              │
│  If Plastic Resin increases 10%:                        │
│  • 247 SKUs affected                                    │
│  • Net margin drops by 1.4% on average                  │
│  • Estimated impact: $220K profit reduction             │
│                                                          │
│  [Scenario: +10% Material Cost] [View Affected SKUs]    │
└─────────────────────────────────────────────────────────┘
```

**Key Actions:**
1. See which materials drive most cost
2. Identify SKUs most sensitive to material price changes
3. Run scenarios: "What if cotton goes up 15%?"
4. Focus negotiations on highest-impact materials

### For Logistics Directors (Wholesaler)

**Primary View: Logistics Cost Optimization**

```
┌─────────────────────────────────────────────────────────┐
│ Logistics Cost Analysis                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Cost per Region                                         │
│  ┌────────────────────────────────────────────────┐     │
│  │ Region      Logistics $  % of Revenue  Status  │     │
│  │ ─────────────────────────────────────────────  │     │
│  │ West         $180K        14.2%        🔴      │     │
│  │ Southeast    $145K        11.8%        🟡      │     │
│  │ Northeast    $128K         9.2%        🟢      │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  Optimization Opportunities                              │
│  • West region: Consolidate 3 routes → Save $27K        │
│  │ • Southeast: Increase pallet utilization → Save $18K  │
│                                                          │
│  Customers with Highest Logistics Cost:                 │
│  • Acme Retail: $12.50/order (avg: $8.20)              │
│  • Recommendation: Require min order size or surcharge  │
│                                                          │
│  [View Route Details]  [Customer Cost Analysis]         │
└─────────────────────────────────────────────────────────┘
```

**Key Actions:**
1. Identify high-cost regions/routes
2. See which customers have inefficient shipping patterns
3. Get specific optimization recommendations
4. Track improvement over time

### For Marketing Directors (Retailer)

**Primary View: Marketing ROI by Product**

```
┌─────────────────────────────────────────────────────────┐
│ Marketing Spend Effectiveness                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Current Month: $125K Marketing Spend                   │
│  Net Margin Impact: +$185K                              │
│  ROI: 1.48x                                             │
│                                                          │
│  Spend by Net Margin Performance                        │
│  ┌────────────────────────────────────────────────┐     │
│  │ High-Margin Products (>40%):  $45K  → $98K    │     │
│  │   ROI: 2.18x  ✓ Efficient                      │     │
│  │                                                  │     │
│  │ Mid-Margin Products (25-40%): $55K  → $72K    │     │
│  │   ROI: 1.31x  ⚠ Marginal                       │     │
│  │                                                  │     │
│  │ Low-Margin Products (<25%):   $25K  → $15K    │     │
│  │   ROI: 0.60x  ❌ Losing Money                  │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  Recommendation: Shift $20K from low-margin to          │
│  high-margin products → Estimated +$28K net profit      │
│                                                          │
│  [Rebalance Budget]  [View Product Details]             │
└─────────────────────────────────────────────────────────┘
```

**Key Actions:**
1. See which products get marketing $ vs their margins
2. Identify misallocated spend (marketing low-margin products)
3. One-click budget rebalancing recommendation
4. Track ROI improvement

---

## 4. Business Type Detection & Switching

### Problem to Solve

Users shouldn't have to manually set their business type every time. We need to:
1. **Auto-detect** on first login based on expense patterns
2. **Easy switching** for companies that operate multiple models
3. **Clear indication** of current mode

### Implementation: Business Type Auto-Detection

**Method 1: During Onboarding/First Login**

```
┌─────────────────────────────────────────────────────────┐
│ Welcome to MarginMap! Let's get you set up.             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Which best describes your business?                     │
│                                                          │
│  [ Manufacturer ]                                        │
│  We produce goods from raw materials                    │
│  Track: Raw materials, production, quality control      │
│                                                          │
│  [ Wholesaler/Distributor ]                             │
│  We buy finished goods and distribute to retailers      │
│  Track: Logistics, storage, distribution costs          │
│                                                          │
│  [ Retailer ]                                           │
│  We sell directly to end consumers                      │
│  Track: Marketing, store operations, shrinkage          │
│                                                          │
│  [ I operate multiple models ]                          │
│  We'll let you switch between modes                     │
│                                                          │
│  [Continue]                                             │
└─────────────────────────────────────────────────────────┘
```

**Method 2: Auto-Detect from First Upload**

When user uploads their first CSV:
```javascript
// Analyze column names to detect business type
function detectBusinessType(columns) {
  const hasManufacturingCols = columns.some(c =>
    ['raw_material', 'production', 'scrap', 'yield'].includes(c.toLowerCase())
  );

  const hasLogisticsCols = columns.some(c =>
    ['freight', 'warehouse', 'distribution', 'shipping'].includes(c.toLowerCase())
  );

  const hasRetailCols = columns.some(c =>
    ['store', 'register', 'shrinkage', 'marketing'].includes(c.toLowerCase())
  );

  if (hasManufacturingCols) return 'manufacturer';
  if (hasLogisticsCols) return 'wholesaler';
  if (hasRetailCols) return 'retailer';

  // Default to manufacturer if unclear
  return 'manufacturer';
}
```

Show confirmation:
```
┌─────────────────────────────────────────────────────────┐
│ 🔍 We detected you're a Manufacturer                    │
│                                                          │
│ Based on your data, we've configured MarginMap for     │
│ manufacturing with tracking for:                         │
│ • Raw materials costs                                   │
│ • Production loss/waste                                 │
│ • Quality control                                       │
│                                                          │
│ Is this correct?                                        │
│ [Yes, that's right] [No, I'm a Wholesaler] [I'm Retail]│
└─────────────────────────────────────────────────────────┘
```

### Business Type Switcher (Persistent UI Element)

**Top Right Corner, Always Visible:**

```
┌────────────────────────────────────────────────┐
│  analyst@marginmap.io ▼  │  🏭 Manufacturer ▼  │
└────────────────────────────────────────────────┘
```

**Click to Switch:**
```
┌─────────────────────────────────────────┐
│ Select Business Type                    │
├─────────────────────────────────────────┤
│ ✓ 🏭 Manufacturer                       │
│   📦 Wholesaler/Distributor             │
│   🏪 Retailer                           │
├─────────────────────────────────────────┤
│ [Manage Business Units]                 │
└─────────────────────────────────────────┘
```

**What Changes When You Switch:**
- Expense categories shown/tracked
- Benchmark targets (Beauty: 65% → 50% → 45%)
- Recommendations focus (production → logistics → marketing)
- Dashboard KPIs
- Filter options

### Multi-Model Companies

For companies operating multiple business types (e.g., manufacture AND retail):

```
┌─────────────────────────────────────────────────────────┐
│ Business Units Setup                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ✓ Manufacturing Division (Primary)                     │
│    Products: 800 SKUs                                   │
│    Type: Manufacturer                                   │
│    [Edit] [View Dashboard]                              │
│                                                          │
│  ✓ Retail Stores Division                               │
│    Products: 1,200 SKUs                                 │
│    Type: Retailer                                       │
│    [Edit] [View Dashboard]                              │
│                                                          │
│  [+ Add Business Unit]                                  │
│                                                          │
│  Note: Each unit tracks different expense categories   │
│  and uses appropriate benchmarks for their type.        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Low-Friction Action Workflows

### Principle: Every Insight → Action in 2 Clicks

**Example 1: Fix Low-Margin SKU**

Current state: User sees "SKU-1234 has 42% margin, below 65% target"

**Old Way (High Friction):**
1. Note the SKU code
2. Open pricing spreadsheet
3. Calculate required price increase
4. Update pricing system
5. Come back to MarginMap later to verify

**New Way (Low Friction):**
```
┌─────────────────────────────────────────────────────────┐
│ SKU-1234: UltraGlow Serum                               │
│ Net Margin: 42.1%  |  Target: 65.0%  |  Gap: -22.9%    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 💡 Quick Fix: Adjust Pricing                            │
│                                                          │
│ Current Price: $24.99                                   │
│ Target Price:  $31.20  (+25%)                           │
│                                                          │
│ This will:                                              │
│ • Bring margin to 65.2% (target)                       │
│ • Add $12,450 annual profit                            │
│ • Assumes volume stays constant                         │
│                                                          │
│ [📋 Copy New Price]  [📧 Email to Pricing Team]        │
│ [📊 Run Volume Sensitivity]                             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Result:** User has actionable number in 1 click, can communicate it in 2nd click

**Example 2: Reduce Production Loss**

Current state: "Production loss is 5.2% of revenue"

**New Way:**
```
┌─────────────────────────────────────────────────────────┐
│ 🚨 Production Loss: $1.5M (5.2% of revenue)            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Top 3 Products with Highest Waste:                     │
│                                                          │
│ 1. SKU-3456: $285K loss  (12.3% waste rate)           │
│    Action: Schedule quality audit                       │
│    [Create Task in Asana] [Email Plant Manager]        │
│                                                          │
│ 2. SKU-3457: $198K loss  (9.8% waste rate)            │
│    Action: Review production line setup                 │
│    [Create Task] [View Production Log]                  │
│                                                          │
│ 3. SKU-3458: $176K loss  (8.9% waste rate)            │
│    Action: Check raw material quality                   │
│    [Create Task] [Contact Supplier]                     │
│                                                          │
│ Reducing these 3 by 30% → Save $198K                   │
│                                                          │
│ [Export Full Report]  [Set Waste Reduction Goals]      │
└─────────────────────────────────────────────────────────┘
```

**Result:** Clear priorities, one-click task creation, specific targets

**Example 3: Optimize Marketing Spend**

Current state: "Marketing costs are 14.3% of revenue"

**New Way:**
```
┌─────────────────────────────────────────────────────────┐
│ 💰 Marketing Spend Rebalancing                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Current Allocation:                                     │
│ High-Margin Products:  $45K  (36%)  ROI: 2.18x ✓       │
│ Mid-Margin Products:   $55K  (44%)  ROI: 1.31x ⚠       │
│ Low-Margin Products:   $25K  (20%)  ROI: 0.60x ❌      │
│                                                          │
│ 💡 Recommended Rebalancing:                             │
│ High-Margin Products:  $70K  (56%)  ⬆ +$25K            │
│ Mid-Margin Products:   $45K  (36%)  ⬇ -$10K            │
│ Low-Margin Products:   $10K   (8%)  ⬇ -$15K            │
│                                                          │
│ Expected Impact: +$38K net profit/month                 │
│                                                          │
│ [📋 Copy Budget Breakdown]  [📧 Email Marketing Team]  │
│ [🔄 Apply as New Budget Template]                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Result:** Specific rebalancing recommendation, ready to execute

---

## 6. Implementation Priority

### Phase 1: Critical Filters (Week 1)
- [ ] Business type switcher (top right)
- [ ] Date range filter (all pages)
- [ ] Category filter (SKU Explorer)
- [ ] Performance status filter (Dashboard, SKU Explorer)
- [ ] Sort options (SKU Explorer, Customers)

### Phase 2: Role-Specific Views (Week 2-3)
- [ ] Category Manager dashboard
- [ ] Quick-action buttons (Copy, Email, Export)
- [ ] Performance indicators (✓ ⚠ ❌)
- [ ] Gap-from-target visualization

### Phase 3: Advanced Workflows (Week 4-6)
- [ ] Procurement material impact analysis
- [ ] Logistics cost optimization view
- [ ] Marketing ROI dashboard
- [ ] Scenario modeling ("What if?" calculator)

### Phase 4: Business Type Intelligence (Week 7-8)
- [ ] Onboarding flow with business type selection
- [ ] Auto-detection from uploaded data
- [ ] Multi-business-unit support
- [ ] Custom expense categories per unit

---

## 7. Success Metrics by Role

### Category Managers
- Time to identify bottom 20% of category: <30 seconds
- Number of SKUs reviewed per session: >10
- Actions taken (price changes, SKU decisions): Tracked

### Procurement Directors
- Time to identify top 5 high-impact materials: <60 seconds
- Negotiation priorities identified: Yes/No
- Material cost scenarios run: Count

### Logistics Directors
- Time to identify highest-cost routes: <30 seconds
- Optimization opportunities surfaced: Count
- Actions taken (route changes, minimums): Tracked

### Marketing Directors
- Time to see ROI by margin tier: <15 seconds
- Budget rebalancing recommendations: Auto-generated
- Spend shifts executed: Tracked

---

## Key Principles

1. **Default to Smart:** Don't make users configure everything
2. **Progressive Disclosure:** Show essentials first, details on demand
3. **Action-Oriented:** Every insight links to an action
4. **Role-Aware:** Show different things to different roles
5. **Fast Filtering:** Never more than 2 clicks to filter to what matters

**Next Steps:** Prioritize Phase 1 filters for immediate impact, then build role-specific views based on which user types adopt first.
