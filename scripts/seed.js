require('dotenv').config();
const bcrypt = require('bcryptjs');
const { run, get } = require('../db');

(async () => {
  try {
    const email = (process.env.ADMIN_EMAIL || 'admin@marginmap.local').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'Margin123!';
    const role = 'admin';

    const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      console.log(`Admin user ${email} already exists (id ${existing.id}).`);
      process.exit(0);
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await run(
      'INSERT INTO users (email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))',
      [email, hash, role]
    );
    console.log(`Seeded admin user ${email} (password: ${password}) with id ${result.id}`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
})();
