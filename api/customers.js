import express from 'express';
import { getAllCustomers, customerProfitability } from '../services/analyticsService.js';
import { getAllEnhancedCustomers, enhancedCustomerProfitability } from '../services/enhancedAnalyticsService.js';

const router = express.Router();

// Get all customers with profitability metrics (now returns enhanced metrics)
router.get('/', (req, res) => {
  try {
    const customers = getAllEnhancedCustomers();
    res.json({ customers });
  } catch (error) {
    console.error('Customer list error:', error);
    res.status(500).json({ error: 'Failed to fetch customer data' });
  }
});

// Get specific customer details (now returns enhanced metrics)
router.get('/:customerName', (req, res) => {
  try {
    const { customerName } = req.params;
    const data = enhancedCustomerProfitability(decodeURIComponent(customerName));

    if (!data) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Customer detail error:', error);
    res.status(500).json({ error: 'Failed to fetch customer details' });
  }
});

export default router;
