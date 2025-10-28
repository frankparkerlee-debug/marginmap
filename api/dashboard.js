const express = require('express');
const dayjs = require('dayjs');
const { getDashboardSummary } = require('../services/analyticsService');

const router = express.Router();

router.get('/summary', async (req, res, next) => {
  try {
    const start = req.query.start || dayjs().subtract(90, 'day').format('YYYY-MM-DD');
    const end = req.query.end || dayjs().format('YYYY-MM-DD');
    const data = await getDashboardSummary({ start, end });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
