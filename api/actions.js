import express from 'express';
import { saveRecommendations, getActiveRecommendations } from '../services/recommendationService.js';
import db from '../db/index.js';

const router = express.Router();

// Get all active recommendations
router.get('/', (req, res) => {
  try {
    const recommendations = getActiveRecommendations();
    res.json({ recommendations });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Generate new recommendations
router.post('/generate', (req, res) => {
  try {
    const recommendations = saveRecommendations();
    res.json({
      success: true,
      count: recommendations.length,
      recommendations
    });
  } catch (error) {
    console.error('Generate recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Update recommendation status
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['open', 'completed', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    db.prepare(`
      UPDATE recommendations
      SET status = ?, resolved_at = CURRENT_TIMESTAMP, resolved_by = ?
      WHERE id = ?
    `).run(status, req.session.userId, id);

    res.json({ success: true });
  } catch (error) {
    console.error('Update recommendation error:', error);
    res.status(500).json({ error: 'Failed to update recommendation' });
  }
});

export default router;
