#!/usr/bin/env python3
"""
Generate sample transaction data for MarginMap
Creates realistic CPG/retail transaction data with 1000 products
"""

import csv
import random
from datetime import datetime, timedelta

# Configuration
NUM_PRODUCTS = 1000
NUM_TRANSACTIONS = 5000
OUTPUT_FILE = "sample_transactions_1000_skus.csv"

# Product categories with typical margin ranges
CATEGORIES = {
    "Cleaning": {"margin_range": (0.45, 0.65), "price_range": (3, 25)},
    "Personal Care": {"margin_range": (0.50, 0.70), "price_range": (5, 40)},
    "Medical Supplies": {"margin_range": (0.30, 0.55), "price_range": (8, 60)},
    "Paper Goods": {"margin_range": (0.35, 0.55), "price_range": (6, 30)},
    "Food & Beverage": {"margin_range": (0.25, 0.45), "price_range": (2, 15)},
    "Health & Wellness": {"margin_range": (0.45, 0.65), "price_range": (10, 50)},
    "Beauty": {"margin_range": (0.55, 0.75), "price_range": (8, 60)},
    "Home Goods": {"margin_range": (0.40, 0.60), "price_range": (10, 80)},
}

# Customers (retailers/distributors)
CUSTOMERS = [
    "Walmart", "Target", "Costco", "Amazon", "CVS", "Walgreens",
    "Kroger", "Albertsons", "Dollar General", "Family Dollar",
    "Rite Aid", "Sam's Club", "BJ's Wholesale", "Meijer",
    "Publix", "H-E-B", "Wegmans", "Whole Foods"
]

# Regions
REGIONS = ["Northeast", "Southeast", "Midwest", "West", "Southwest", "National"]

# Product name templates
PRODUCT_ADJECTIVES = ["Ultra", "Super", "Mega", "Premium", "Essential", "Pro", "Elite", "Advanced", "Fresh", "Pure"]
PRODUCT_TYPES = ["Clean", "Care", "Guard", "Shield", "Soft", "Bright", "Fresh", "Plus", "Max", "Comfort"]
PRODUCT_FORMATS = ["Pack", "Bundle", "Box", "Case", "Set", "Kit", "Collection"]

def generate_product_name(category, index):
    """Generate realistic product names"""
    adj = random.choice(PRODUCT_ADJECTIVES)
    prod_type = random.choice(PRODUCT_TYPES)
    size = random.choice(["6-ct", "12-ct", "24-ct", "36-ct", "48-ct", ""])
    format_type = random.choice(PRODUCT_FORMATS)

    if size:
        return f"{adj}{prod_type} {category} {size} {format_type}"
    return f"{adj}{prod_type} {category} {format_type}"

def generate_products(num_products):
    """Generate product master data"""
    products = []

    for i in range(num_products):
        category = random.choice(list(CATEGORIES.keys()))
        cat_data = CATEGORIES[category]

        sku_code = f"SKU-{1000 + i}"
        product_name = generate_product_name(category, i)

        # Base price and cost
        base_price = random.uniform(*cat_data["price_range"])
        target_margin = random.uniform(*cat_data["margin_range"])
        base_cost = base_price * (1 - target_margin)

        products.append({
            "sku_code": sku_code,
            "sku_name": product_name,
            "category": category,
            "base_price": round(base_price, 2),
            "base_cost": round(base_cost, 2),
            "target_margin": round(target_margin * 100, 1)
        })

    return products

def generate_transactions(products, num_transactions):
    """Generate transaction records"""
    transactions = []
    start_date = datetime.now() - timedelta(days=90)

    for _ in range(num_transactions):
        product = random.choice(products)
        customer = random.choice(CUSTOMERS)
        region = random.choice(REGIONS)

        # Transaction date (last 90 days)
        days_ago = random.randint(0, 90)
        trans_date = start_date + timedelta(days=days_ago)

        # Invoice ID
        invoice_id = f"INV-{random.randint(10000, 99999)}"

        # Quantity sold
        qty_sold = random.randint(20, 500)

        # Price variance (some customers get better prices)
        price_variance = random.uniform(0.85, 1.05)
        unit_price = round(product["base_price"] * price_variance, 2)
        unit_cost = product["base_cost"]

        # Discounts (0-20% of transactions have discounts)
        unit_discount = 0
        if random.random() < 0.2:
            unit_discount = round(random.uniform(0.10, 2.0), 2)

        # Returns (5% of units on average)
        returned_units = 0
        if random.random() < 0.15:
            returned_units = int(qty_sold * random.uniform(0.01, 0.15))

        transactions.append({
            "date": trans_date.strftime("%Y-%m-%d"),
            "invoice_id": invoice_id,
            "customer_name": customer,
            "region": region,
            "sku_code": product["sku_code"],
            "sku_name": product["sku_name"],
            "category": product["category"],
            "qty_sold": qty_sold,
            "unit_cost": unit_cost,
            "unit_price": unit_price,
            "unit_discount": unit_discount,
            "returned_units": returned_units
        })

    return transactions

def write_csv(transactions, filename):
    """Write transactions to CSV file"""
    fieldnames = [
        "date", "invoice_id", "customer_name", "region",
        "sku_code", "sku_name", "category", "qty_sold",
        "unit_cost", "unit_price", "unit_discount", "returned_units"
    ]

    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(transactions)

def main():
    print("🎲 Generating MarginMap Sample Data...")
    print(f"   Products: {NUM_PRODUCTS}")
    print(f"   Transactions: {NUM_TRANSACTIONS}")
    print()

    # Generate products
    print("📦 Creating product catalog...")
    products = generate_products(NUM_PRODUCTS)
    print(f"   ✓ Generated {len(products)} products across {len(CATEGORIES)} categories")

    # Generate transactions
    print("💰 Creating transaction records...")
    transactions = generate_transactions(products, NUM_TRANSACTIONS)
    print(f"   ✓ Generated {len(transactions)} transactions")

    # Calculate stats
    total_revenue = sum(t["qty_sold"] * (t["unit_price"] - t["unit_discount"]) for t in transactions)
    total_cogs = sum(t["qty_sold"] * t["unit_cost"] for t in transactions)
    gross_margin = ((total_revenue - total_cogs) / total_revenue) * 100 if total_revenue > 0 else 0

    print()
    print("📊 Dataset Summary:")
    print(f"   Unique SKUs: {len(set(t['sku_code'] for t in transactions))}")
    print(f"   Date Range: {min(t['date'] for t in transactions)} to {max(t['date'] for t in transactions)}")
    print(f"   Total Revenue: ${total_revenue:,.2f}")
    print(f"   Total COGS: ${total_cogs:,.2f}")
    print(f"   Gross Margin: {gross_margin:.1f}%")

    # Write to file
    print()
    print(f"💾 Writing to {OUTPUT_FILE}...")
    write_csv(transactions, OUTPUT_FILE)
    print(f"   ✓ File created successfully!")
    print()
    print(f"✅ Ready to upload to MarginMap!")
    print(f"   👉 Upload {OUTPUT_FILE} at: https://marginmap.onrender.com/upload.html")

if __name__ == "__main__":
    main()
