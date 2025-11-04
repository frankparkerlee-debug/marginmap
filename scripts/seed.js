import bcrypt from 'bcryptjs';
import db, { queries } from '../db/index.js';

console.log('🌱 Seeding database...');

try {
  // Create demo analyst user
  const demoEmail = 'analyst@marginmap.io';
  const demoPassword = 'demo123';
  const passwordHash = bcrypt.hashSync(demoPassword, 10);

  const existingUser = queries.getUserByEmail.get(demoEmail);

  if (!existingUser) {
    queries.createUser.run(demoEmail, passwordHash, 'analyst', 'Demo Analyst');
    console.log('✓ Created demo user:', demoEmail);
    console.log('  Password:', demoPassword);
  } else {
    console.log('✓ Demo user already exists');
  }

  // Insert sample transaction data
  const sampleTransactions = [
    // High-margin SKU (healthy)
    ['2024-01-15', 'INV-1001', 'Walmart', 'Northeast', 'SKU-2401', 'SparkleClean 12-Pack', 'Cleaning', 240, 3.20, 7.50, 0.25, 5],
    ['2024-01-16', 'INV-1002', 'Target', 'Midwest', 'SKU-2401', 'SparkleClean 12-Pack', 'Cleaning', 180, 3.20, 7.50, 0.50, 3],
    ['2024-01-17', 'INV-1003', 'Costco', 'West', 'SKU-2401', 'SparkleClean 12-Pack', 'Cleaning', 360, 3.20, 6.80, 0.10, 8],

    // Medium-margin SKU (needs attention)
    ['2024-01-15', 'INV-1004', 'Kroger', 'Southeast', 'SKU-3205', 'FreshGuard Wipes', 'Cleaning', 150, 2.10, 4.25, 0.35, 12],
    ['2024-01-16', 'INV-1005', 'Walmart', 'Northeast', 'SKU-3205', 'FreshGuard Wipes', 'Cleaning', 200, 2.10, 4.50, 0.20, 8],
    ['2024-01-17', 'INV-1006', 'Target', 'Midwest', 'SKU-3205', 'FreshGuard Wipes', 'Cleaning', 175, 2.10, 4.00, 0.40, 15],

    // Low-margin SKU (problem)
    ['2024-01-15', 'INV-1007', 'Target', 'Midwest', 'SKU-1802', 'PureWound Gauze 24ct', 'Medical', 90, 4.80, 7.20, 1.50, 18],
    ['2024-01-16', 'INV-1008', 'CVS', 'Northeast', 'SKU-1802', 'PureWound Gauze 24ct', 'Medical', 120, 4.80, 7.00, 1.80, 22],
    ['2024-01-17', 'INV-1009', 'Walgreens', 'Southeast', 'SKU-1802', 'PureWound Gauze 24ct', 'Medical', 85, 4.80, 6.80, 2.00, 19],

    // Another profitable SKU
    ['2024-01-15', 'INV-1010', 'Amazon', 'National', 'SKU-5501', 'UltraShine Glass Cleaner', 'Cleaning', 420, 1.80, 5.99, 0.50, 12],
    ['2024-01-16', 'INV-1011', 'Walmart', 'West', 'SKU-5501', 'UltraShine Glass Cleaner', 'Cleaning', 310, 1.80, 5.75, 0.25, 8],

    // High return rate SKU
    ['2024-01-15', 'INV-1012', 'Target', 'Southeast', 'SKU-8803', 'MegaPack Paper Towels', 'Paper Goods', 200, 6.50, 12.99, 0.75, 35],
    ['2024-01-16', 'INV-1013', 'Costco', 'West', 'SKU-8803', 'MegaPack Paper Towels', 'Paper Goods', 280, 6.50, 12.50, 0.50, 42],

    // Problematic customer channel
    ['2024-01-17', 'INV-1014', 'Dollar General', 'Southeast', 'SKU-2401', 'SparkleClean 12-Pack', 'Cleaning', 140, 3.20, 5.50, 1.20, 25],
    ['2024-01-17', 'INV-1015', 'Dollar General', 'Southeast', 'SKU-3205', 'FreshGuard Wipes', 'Cleaning', 95, 2.10, 3.25, 0.80, 18]
  ];

  const existingTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions').get();

  if (existingTransactions.count === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO transactions (
        date, invoice_id, customer_name, region, sku_code, sku_name,
        category, qty_sold, unit_cost, unit_price, unit_discount, returned_units
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((transactions) => {
      for (const t of transactions) {
        insertStmt.run(...t);
      }
    });

    insertMany(sampleTransactions);
    console.log(`✓ Inserted ${sampleTransactions.length} sample transactions`);
  } else {
    console.log('✓ Sample data already exists');
  }

  console.log('\n✅ Database seeded successfully');
  console.log('\n🔐 Login credentials:');
  console.log('   Email: analyst@marginmap.io');
  console.log('   Password: demo123');

  process.exit(0);
} catch (error) {
  console.error('✗ Seeding failed:', error.message);
  process.exit(1);
}
