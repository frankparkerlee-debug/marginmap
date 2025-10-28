const express = require('express');
const bcrypt = require('bcryptjs');
const { get, run } = require('../db');
const { authenticate, signToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, role = 'analyst' } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const normalizedEmail = email.toLowerCase();
    const existing = await get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await run(
      'INSERT INTO users (email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))',
      [normalizedEmail, hash, role]
    );
    const user = { id: result.id, email: normalizedEmail, role };
    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken(user);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await get('SELECT id, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
