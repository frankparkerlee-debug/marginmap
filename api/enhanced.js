import express from 'express';
import {
  getEnhancedDashboardMetrics,
  getAllEnhancedSkus,
  getAllEnhancedCustomers,
  enhancedSkuProfitability,
  enhancedCustomerProfitability,
  getMarginErosionSummary,
  getBusinessType,
  getExpenseCategories,
  getMarginBenchmark
} from '../services/enhancedAnalyticsService.js';

const router = express.Router();

/**
 * Get enhanced dashboard metrics with business-type awareness
 * GET /api/enhanced/dashboard
 */
router.get('/dashboard', (req, res) => {
  try {
    const metrics = getEnhancedDashboardMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Enhanced dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch enhanced dashboard metrics' });
  }
});

/**
 * Get all SKUs with enhanced metrics
 * GET /api/enhanced/sku
 */
router.get('/sku', (req, res) => {
  try {
    const skus = getAllEnhancedSkus();
    res.json(skus);
  } catch (error) {
    console.error('Enhanced SKU list error:', error);
    res.status(500).json({ error: 'Failed to fetch enhanced SKU data' });
  }
});

/**
 * Get specific SKU with enhanced metrics
 * GET /api/enhanced/sku/:skuCode
 */
router.get('/sku/:skuCode', (req, res) => {
  try {
    const data = enhancedSkuProfitability(req.params.skuCode);

    if (!data) {
      return res.status(404).json({ error: 'SKU not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Enhanced SKU detail error:', error);
    res.status(500).json({ error: 'Failed to fetch enhanced SKU details' });
  }
});

/**
 * Get all customers with enhanced metrics
 * GET /api/enhanced/customers
 */
router.get('/customers', (req, res) => {
  try {
    const customers = getAllEnhancedCustomers();
    res.json(customers);
  } catch (error) {
    console.error('Enhanced customer list error:', error);
    res.status(500).json({ error: 'Failed to fetch enhanced customer data' });
  }
});

/**
 * Get specific customer with enhanced metrics
 * GET /api/enhanced/customers/:customerName
 */
router.get('/customers/:customerName', (req, res) => {
  try {
    const customerName = decodeURIComponent(req.params.customerName);
    const data = enhancedCustomerProfitability(customerName);

    if (!data) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Enhanced customer detail error:', error);
    res.status(500).json({ error: 'Failed to fetch enhanced customer details' });
  }
});

/**
 * Get margin erosion summary
 * GET /api/enhanced/erosion
 */
router.get('/erosion', (req, res) => {
  try {
    const summary = getMarginErosionSummary();
    res.json(summary);
  } catch (error) {
    console.error('Margin erosion summary error:', error);
    res.status(500).json({ error: 'Failed to fetch margin erosion summary' });
  }
});

/**
 * Get current business type configuration
 * GET /api/enhanced/business-type
 */
router.get('/business-type', (req, res) => {
  try {
    const businessType = getBusinessType();
    res.json({ businessType });
  } catch (error) {
    console.error('Business type error:', error);
    res.status(500).json({ error: 'Failed to fetch business type' });
  }
});

/**
 * Get expense categories for current business type
 * GET /api/enhanced/expense-categories
 */
router.get('/expense-categories', (req, res) => {
  try {
    const categories = getExpenseCategories();
    res.json({ categories });
  } catch (error) {
    console.error('Expense categories error:', error);
    res.status(500).json({ error: 'Failed to fetch expense categories' });
  }
});

/**
 * Get margin benchmark for a category
 * GET /api/enhanced/benchmark/:category
 */
router.get('/benchmark/:category', (req, res) => {
  try {
    const category = decodeURIComponent(req.params.category);
    const benchmark = getMarginBenchmark(category);
    res.json({ category, benchmark });
  } catch (error) {
    console.error('Benchmark error:', error);
    res.status(500).json({ error: 'Failed to fetch benchmark' });
  }
});

export default router;
