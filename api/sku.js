import express from 'express';
import { getAllSkus, skuProfitability } from '../services/analyticsService.js';

const router = express.Router();

// Get all SKUs with profitability metrics
router.get('/', (req, res) => {
  try {
    const skus = getAllSkus();
    res.json({ skus });
  } catch (error) {
    console.error('SKU list error:', error);
    res.status(500).json({ error: 'Failed to fetch SKU data' });
  }
});

// Get specific SKU details
router.get('/:skuCode', (req, res) => {
  try {
    const { skuCode } = req.params;
    const data = skuProfitability(skuCode);

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
