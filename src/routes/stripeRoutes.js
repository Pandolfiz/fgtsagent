const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripeService');
const logger = require('../utils/logger');

/**
 * @route GET /api/stripe/plans
 * @desc Obter planos disponíveis
 * @access Public
 */
router.get('/plans', async (req, res) => {
  try {
    console.log('📋 Requisição para obter planos');
    
    const plans = await stripeService.getPlans();
    
    // Ordenar planos: Basic -> Pro -> Premium
    const sortedPlans = plans.sort((a, b) => {
      const order = { 'basic': 1, 'pro': 2, 'premium': 3 };
      const aOrder = order[a.metadata?.planType?.toLowerCase()] || 999;
      const bOrder = order[b.metadata?.planType?.toLowerCase()] || 999;
      return aOrder - bOrder;
    });

    logger.info('Plans retrieved successfully', {
      count: sortedPlans.length,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: sortedPlans
    });
  } catch (error) {
    console.error('❌ Erro ao obter planos:', error);
    
    logger.error('Failed to retrieve plans', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Erro ao obter planos',
      details: error.message
    });
  }
});

/**
 * @route GET /api/stripe/products
 * @desc Obter produtos disponíveis
 * @access Public
 */
router.get('/products', async (req, res) => {
  try {
    console.log('📦 Requisição para obter produtos');
    
    const products = await stripeService.getProducts();
    
    logger.info('Products retrieved successfully', {
      count: products.length,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('❌ Erro ao obter produtos:', error);
    
    logger.error('Failed to retrieve products', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Erro ao obter produtos',
      details: error.message
    });
  }
});

module.exports = router; 






