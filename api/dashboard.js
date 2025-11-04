import express from 'express';
import { getDashboardMetrics } from '../services/analyticsService.js';
import { getEnhancedDashboardMetrics, getBusinessType } from '../services/enhancedAnalyticsService.js';

const router = express.Router();

// Get dashboard metrics (now returns enhanced metrics by default)
router.get('/', (req, res) => {
  try {
    // Get both basic and enhanced metrics
    const basicMetrics = getDashboardMetrics();
    const enhancedMetrics = getEnhancedDashboardMetrics();

    // Merge them together - enhanced takes precedence but we keep basic for compatibility
    const metrics = {
      ...basicMetrics,
      businessType: enhancedMetrics.businessType,
      enhancedOverview: enhancedMetrics.overview,
      expenseBreakdown: enhancedMetrics.expenseBreakdown,
      topHighExpenseSkus: enhancedMetrics.topHighExpenseSkus || []
    };

    res.json(metrics);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

export default router;
