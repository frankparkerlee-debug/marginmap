import express from 'express';
import { getDashboardMetrics } from '../services/analyticsService.js';

const router = express.Router();

// Get dashboard metrics
router.get('/', (req, res) => {
  try {
    const metrics = getDashboardMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

export default router;
