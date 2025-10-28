require('dotenv').config();
const bcrypt = require('bcryptjs');
const { run, get } = require('../db');

(async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@marginmap.local').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Margin123!';

    const usersToSeed = [
      { email: adminEmail, password: adminPassword, role: 'admin', label: 'admin' },
      { email: 'parker@senecawest.com', password: 'Password321', role: 'analyst', label: 'requested analyst' }
    ];

    for (const user of usersToSeed) {
      const existing = await get('SELECT id FROM users WHERE email = ?', [user.email]);
      if (existing) {
        console.log(`User ${user.email} already exists (id ${existing.id}).`);
        continue;
      }

      const hash = await bcrypt.hash(user.password, 10);
      const result = await run(
        'INSERT INTO users (email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))',
        [user.email, hash, user.role]
      );
      console.log(`Seeded ${user.label} user ${user.email} (password: ${user.password}) with id ${result.id}`);
    }

    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
})();
