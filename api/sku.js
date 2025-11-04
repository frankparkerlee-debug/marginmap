import express from 'express';
import { getAllSkus, skuProfitability } from '../services/analyticsService.js';
import { getAllEnhancedSkus, enhancedSkuProfitability } from '../services/enhancedAnalyticsService.js';

const router = express.Router();

// Get all SKUs with profitability metrics (now returns enhanced metrics)
router.get('/', (req, res) => {
  try {
    const skus = getAllEnhancedSkus();
    res.json({ skus });
  } catch (error) {
    console.error('SKU list error:', error);
    res.status(500).json({ error: 'Failed to fetch SKU data' });
  }
});

// Get specific SKU details (now returns enhanced metrics)
router.get('/:skuCode', (req, res) => {
  try {
    const { skuCode } = req.params;
    const data = enhancedSkuProfitability(skuCode);

    if (!data) {
      return res.status(404).json({ error: 'SKU not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('SKU detail error:', error);
    res.status(500).json({ error: 'Failed to fetch SKU details' });
  }
});

export default router;
