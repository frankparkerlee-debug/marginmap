require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const webDir = path.join(__dirname, 'web');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require('./api/auth'));
app.use('/api/upload', require('./api/upload'));
app.use('/api/dashboard', require('./api/dashboard'));
app.use('/api/sku', require('./api/sku'));
app.use('/api/customers', require('./api/customers'));
app.use('/api/actions', require('./api/actions'));

app.use(express.static(webDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(webDir, 'home.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`MarginMap listening on http://localhost:${port}`);
});
