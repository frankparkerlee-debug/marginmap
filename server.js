import express from 'express';
import session from 'express-session';
import compression from 'compression';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import dotenv from 'dotenv';

// Import database
import db from './db/index.js';

// Import middleware
import { requireAuth, attachUser } from './middleware/auth.js';

// Import API routes
import authRouter from './api/auth.js';
import dashboardRouter from './api/dashboard.js';
import skuRouter from './api/sku.js';
import customersRouter from './api/customers.js';
import actionsRouter from './api/actions.js';
import uploadRouter from './api/upload.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for secure cookies on Render
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Initialize database
const schemaPath = join(__dirname, 'db/schema.sql');
const schema = readFileSync(schemaPath, 'utf-8');
db.exec(schema);
console.log('✓ Database initialized');

// Auto-seed if no users exist (for Render's ephemeral filesystem)
import bcrypt from 'bcryptjs';
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  console.log('🌱 No users found, seeding database...');
  const demoEmail = 'analyst@marginmap.io';
  const demoPassword = 'demo123';
  const passwordHash = bcrypt.hashSync(demoPassword, 10);

  db.prepare(`
    INSERT INTO users (email, password_hash, role, full_name)
    VALUES (?, ?, ?, ?)
  `).run(demoEmail, passwordHash, 'analyst', 'Demo Analyst');

  console.log('✓ Created demo user:', demoEmail);
  console.log('  Password:', demoPassword);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

app.use(compression());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'marginmap-secret-key-change-me',
  resave: false,
  saveUninitialized: false,
  proxy: process.env.NODE_ENV === 'production',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

app.use(attachUser);

// Serve static files
app.use(express.static(join(__dirname, 'web')));

// API routes (authentication not required for login)
app.use('/api/auth', authRouter);

// Protected API routes
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/sku', requireAuth, skuRouter);
app.use('/api/customers', requireAuth, customersRouter);
app.use('/api/actions', requireAuth, actionsRouter);
app.use('/api/upload', requireAuth, uploadRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve HTML pages
const publicPages = ['/', '/index.html', '/login.html'];

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'web/index.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(join(__dirname, 'web/login.html'));
});

// Protected pages
const protectedPages = [
  '/dashboard.html',
  '/sku.html',
  '/customers.html',
  '/actions.html',
  '/upload.html'
];

protectedPages.forEach(page => {
  app.get(page, requireAuth, (req, res) => {
    res.sendFile(join(__dirname, `web${page}`));
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 MarginMap is running!`);
  console.log(`\n   Local: http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n✓ Ready to analyze profitability\n`);
});

export default app;
