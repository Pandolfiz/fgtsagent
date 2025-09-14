const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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

/**
 * @route POST /api/stripe/create-token-checkout
 * @desc Criar checkout session para produto de tokens
 * @access Public
 */
router.post('/create-token-checkout', async (req, res) => {
  try {
    const { customerEmail, customerName, successUrl, cancelUrl, interval = 'monthly' } = req.body;
    
    console.log('🔄 Criando checkout para produto de tokens...', { interval });
    
    // Selecionar Price ID baseado no intervalo (variáveis de ambiente)
    const priceIds = {
      monthly: process.env.STRIPE_PREMIUM_PRICE_ID_MONTHLY, // Mensal
      yearly: process.env.STRIPE_PREMIUM_PRICE_ID_YEARLY   // Anual
    };
    
    // Validar se as variáveis de ambiente estão definidas
    if (!priceIds.monthly || !priceIds.yearly) {
      console.error('❌ Variáveis de ambiente STRIPE_PREMIUM_PRICE_ID_MONTHLY ou STRIPE_PREMIUM_PRICE_ID_YEARLY não definidas');
      return res.status(500).json({
        success: false,
        error: 'Configuração de preços não encontrada'
      });
    }
    
    const selectedPriceId = priceIds[interval] || priceIds.monthly;
    console.log('🎯 Price ID selecionado:', selectedPriceId);
    
    // Criar checkout session para produto de tokens
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: selectedPriceId,
        quantity: 1,
        // Não especificar quantity para metered billing
      }],
      mode: 'subscription',
      customer_email: customerEmail,
      success_url: successUrl || `${process.env.APP_URL}/signup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.APP_URL}/cancel`,
      allow_promotion_codes: true,
      metadata: {
        product_type: 'token_based',
        customer_name: customerName,
        interval: interval
      }
    });

    console.log('✅ Checkout session criada:', session.id);

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });

  } catch (error) {
    console.error('❌ Erro ao criar checkout:', error);
    
    logger.error('Failed to create token checkout', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Erro ao criar checkout',
      details: error.message
    });
  }
});

module.exports = router; 






