const express = require('express');
const stripeService = require('../services/stripeService');
const { requireAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validationMiddleware');
const logger = require('../utils/logger');

const router = express.Router();

// Schema de validação para criação de checkout
const checkoutSchema = {
  body: {
    type: 'object',
    properties: {
      planType: {
        type: 'string',
        enum: ['basic', 'pro', 'premium']
      },
      successUrl: {
        type: 'string',
        format: 'uri'
      },
      cancelUrl: {
        type: 'string',
        format: 'uri'
      }
    },
    required: ['planType'],
    additionalProperties: false
  }
};

/**
 * GET /api/stripe/plans
 * Lista todos os planos disponíveis
 */
router.get('/plans', (req, res) => {
  try {
    const plans = stripeService.getAvailablePlans();
    
    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    logger.error('Erro ao listar planos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/stripe/plans/:planType
 * Obtém informações detalhadas de um plano específico
 */
router.get('/plans/:planType', async (req, res) => {
  try {
    const { planType } = req.params;
    
    // Usar a nova função que retorna todos os preços
    const planInfo = stripeService.getPlanPrices(planType);
    
    res.status(200).json({
      success: true,
      data: planInfo
    });
  } catch (error) {
    logger.error('Erro ao obter informações do plano:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Plano não encontrado'
    });
  }
});

/**
 * POST /api/stripe/create-checkout-session
 * Cria uma sessão de checkout do Stripe (USUÁRIOS LOGADOS)
 */
router.post('/create-checkout-session', requireAuth, validate(checkoutSchema), async (req, res) => {
  try {
    const { planType, successUrl, cancelUrl } = req.body;
    const user = req.user;
    
    // URLs padrão se não fornecidas
    const defaultSuccessUrl = `${process.env.APP_URL}/payment/success?plan=${planType}&session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${process.env.APP_URL}/payment/cancel`;
    
    const session = await stripeService.createCheckoutSession(
      planType,
      user.email,
      successUrl || defaultSuccessUrl,
      cancelUrl || defaultCancelUrl,
      {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`.trim()
      }
    );
    
    res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
  } catch (error) {
    logger.error('Erro ao criar sessão de checkout:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao criar sessão de pagamento'
    });
  }
});

/**
 * POST /api/stripe/create-payment-intent
 * Cria um Payment Intent para checkout nativo (SEM AUTENTICAÇÃO)
 */
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { planType, userEmail, userName, interval = 'monthly' } = req.body;
    
    // ✅ DEBUG: Log dos dados recebidos
    console.log('🔍 Dados recebidos na rota create-payment-intent:', {
      planType,
      userEmail,
      userName,
      interval,
      body: req.body
    });
    
    // Validações básicas
    if (!planType || !userEmail || !userName) {
      console.log('❌ Validação falhou:', { planType, userEmail, userName });
      return res.status(400).json({
        success: false,
        message: 'planType, userEmail e userName são obrigatórios'
      });
    }
    
    // ✅ DEBUG: Log antes de chamar getPlanInfo
    console.log('🔍 Chamando getPlanInfo com:', { planType, interval });
    
    // Validar se o plano existe
    const planInfo = stripeService.getPlanInfo(planType, interval);
    if (!planInfo) {
      console.log('❌ Plano não encontrado:', { planType, interval });
      return res.status(400).json({
        success: false,
        message: `Plano ${planType} com intervalo ${interval} não encontrado`
      });
    }
    
    console.log('✅ Plano encontrado:', planInfo);
    
    const paymentIntent = await stripeService.createPaymentIntent(
      planType,
      userEmail,
      {
        source: 'signup',
        userName: userName.trim()
      },
      interval
    );
    
    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        plan: planInfo
      }
    });
  } catch (error) {
    console.error('❌ Erro ao criar Payment Intent para cadastro:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao criar Payment Intent'
    });
  }
});

/**
 * POST /api/stripe/create-signup-checkout-session
 * Cria uma sessão de checkout do Stripe para CADASTRO (SEM AUTENTICAÇÃO)
 * @deprecated Use create-payment-intent instead for native checkout
 */
router.post('/create-signup-checkout-session', async (req, res) => {
  try {
    const { planType, userEmail, userName, successUrl, cancelUrl, interval = 'monthly' } = req.body;
    
    // Validações básicas
    if (!planType || !userEmail || !userName) {
      return res.status(400).json({
        success: false,
        message: 'planType, userEmail e userName são obrigatórios'
      });
    }
    
    // Validar se o plano existe
    const planInfo = stripeService.getPlanInfo(planType, interval);
    if (!planInfo) {
      return res.status(400).json({
        success: false,
        message: `Plano ${planType} com intervalo ${interval} não encontrado`
      });
    }
    
    // URLs padrão se não fornecidas
    const defaultSuccessUrl = `${process.env.APP_URL || 'http://localhost:5173'}/payment/success?plan=${planType}&session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${process.env.APP_URL || 'http://localhost:5173'}/payment/cancel`;
    
    const session = await stripeService.createCheckoutSession(
      planType,
      userEmail,
      successUrl || defaultSuccessUrl,
      cancelUrl || defaultCancelUrl,
      {
        source: 'source',
        userName: userName.trim()
      },
      interval
    );
    
    res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
        plan: planInfo
      }
    });
  } catch (error) {
    logger.error('Erro ao criar sessão de checkout para cadastro:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao criar sessão de pagamento'
    });
  }
});

/**
 * POST /api/stripe/create-payment-link
 * Cria um link de pagamento do Stripe
 */
router.post('/create-payment-link', requireAuth, async (req, res) => {
  try {
    const { planType } = req.body;
    const user = req.user;
    
    if (!planType) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de plano é obrigatório'
      });
    }
    
    const paymentLink = await stripeService.createPaymentLink(
      planType,
      user.email,
      {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`.trim()
      }
    );
    
    res.status(200).json({
      success: true,
      data: {
        paymentLinkId: paymentLink.id,
        url: paymentLink.url
      }
    });
  } catch (error) {
    logger.error('Erro ao criar link de pagamento:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao criar link de pagamento'
    });
  }
});

/**
 * GET /api/stripe/payment-status/:sessionId
 * Verifica o status de um pagamento
 */
router.get('/payment-status/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const paymentStatus = await stripeService.getPaymentStatus(sessionId);
    
    res.status(200).json({
      success: true,
      data: paymentStatus
    });
  } catch (error) {
    logger.error('Erro ao verificar status do pagamento:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao verificar pagamento'
    });
  }
});

/**
 * POST /api/stripe/validate-coupon
 * Valida um cupom de desconto
 */
router.post('/validate-coupon', requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Código do cupom é obrigatório'
      });
    }
    
    const couponInfo = await stripeService.validateCoupon(code);
    
    res.status(200).json({
      success: true,
      data: couponInfo
    });
  } catch (error) {
    logger.error('Erro ao validar cupom:', error);
    res.status(400).json({
      success: false,
      message: 'Erro ao validar cupom'
    });
  }
});

/**
 * POST /api/stripe/webhook
 * Endpoint para receber webhooks do Stripe
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
      logger.error('Webhook sem assinatura');
      return res.status(400).json({
        success: false,
        message: 'Assinatura do webhook ausente'
      });
    }
    
    await stripeService.processWebhook(req.body, signature);
    
    res.status(200).json({
      success: true,
      message: 'Webhook processado com sucesso'
    });
  } catch (error) {
    logger.error('Erro no webhook:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao processar webhook'
    });
  }
});

/**
 * POST /api/stripe/create-customer
 * Cria um cliente no Stripe (usado internamente)
 */
router.post('/create-customer', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { metadata } = req.body;
    
    const customer = await stripeService.createCustomer(
      user.email,
      `${user.firstName} ${user.lastName}`.trim(),
      {
        userId: user.id,
        ...metadata
      }
    );
    
    res.status(201).json({
      success: true,
      data: {
        customerId: customer.id,
        email: customer.email,
        name: customer.name
      }
    });
  } catch (error) {
    logger.error('Erro ao criar cliente:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao criar cliente'
    });
  }
});

/**
 * Middleware para tratamento de erros específicos do Stripe
 */
router.use((error, req, res, next) => {
  if (error.type === 'StripeCardError') {
    res.status(400).json({
      success: false,
      message: 'Erro no cartão de crédito',
      details: error.message
    });
  } else if (error.type === 'StripeInvalidRequestError') {
    res.status(400).json({
      success: false,
      message: 'Requisição inválida para o Stripe',
      details: error.message
    });
  } else if (error.type === 'StripeAPIError') {
    res.status(500).json({
      success: false,
      message: 'Erro na API do Stripe',
      details: error.message
    });
  } else {
    next(error);
  }
});

module.exports = router; 