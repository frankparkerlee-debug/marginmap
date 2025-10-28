const express = require('express');
const dayjs = require('dayjs');
const { listSkuSummary, skuProfitability } = require('../services/analyticsService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const start = req.query.start || dayjs().subtract(90, 'day').format('YYYY-MM-DD');
    const end = req.query.end || dayjs().format('YYYY-MM-DD');
    const data = await listSkuSummary({ start, end });
    res.json({ data, range: { start, end } });
  } catch (err) {
    next(err);
  }
});

router.get('/:skuCode', async (req, res, next) => {
  try {
    const skuCode = decodeURIComponent(req.params.skuCode);
    const detail = await skuProfitability(skuCode);
    if (!detail) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
