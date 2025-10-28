const express = require('express');
const { all, run } = require('../db');
const { generateRecommendations } = require('../services/analyticsService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const status = req.query.status || 'open';
    let rows;
    if (status === 'all') {
      rows = await all('SELECT * FROM recommendations ORDER BY dollar_impact DESC, created_at DESC');
    } else {
      rows = await all(
        'SELECT * FROM recommendations WHERE status = ? ORDER BY dollar_impact DESC, created_at DESC',
        [status]
      );
    }
    const data = rows.map((row) => ({
      ...row,
      dollar_impact: Number(row.dollar_impact || 0)
    }));
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post('/generate', async (req, res, next) => {
  try {
    const created = await generateRecommendations();
    res.status(201).json({ created, count: created.length });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['open', 'snoozed', 'resolved'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const result = await run(
      'UPDATE recommendations SET status = ?, updated_at = datetime("now") WHERE id = ?',
      [status, req.params.id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    res.json({ id: Number(req.params.id), status });
  } catch (err) {
    next(err);
  }
});

router.get('/export/csv', async (req, res, next) => {
  try {
    const rows = await all('SELECT * FROM recommendations ORDER BY created_at DESC');
    const headers = ['id', 'category', 'issue_text', 'suggested_action', 'dollar_impact', 'status', 'created_at', 'updated_at'];
    const csvLines = [headers.join(',')];
    rows.forEach((row) => {
      const line = headers
        .map((header) => {
          const value = row[header] ?? '';
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(',');
      csvLines.push(line);
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="marginmap_recommendations.csv"');
    res.send(csvLines.join('\n'));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
