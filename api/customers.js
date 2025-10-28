const express = require('express');
const dayjs = require('dayjs');
const { listCustomerSummary, customerProfitability } = require('../services/analyticsService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const start = req.query.start || dayjs().subtract(90, 'day').format('YYYY-MM-DD');
    const end = req.query.end || dayjs().format('YYYY-MM-DD');
    const data = await listCustomerSummary({ start, end });
    res.json({ data, range: { start, end } });
  } catch (err) {
    next(err);
  }
});

router.get('/:customerName', async (req, res, next) => {
  try {
    const customerName = decodeURIComponent(req.params.customerName);
    const detail = await customerProfitability(customerName);
    if (!detail) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
