const express = require('express');
const stripeService = require('../services/stripeService');
const { requireAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validationMiddleware');
const logger = require('../utils/logger');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Joi = require('joi');

const router = express.Router();

// ✅ FUNÇÃO: Detecta URL base baseada no ambiente
const getBaseUrl = () => {
  // ✅ PRIORIDADE 1: Usar APP_URL se configurado
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  
  // ✅ PRIORIDADE 2: Detectar ambiente de desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    // ✅ DESENVOLVIMENTO: Usar HTTPS local na porta 5174
    return 'https://localhost:5174';
  }
  
  // ✅ PRIORIDADE 3: Detectar ambiente de produção
  if (process.env.NODE_ENV === 'production') {
    return 'https://fgtsagent.com.br';
  }
  
  // ✅ FALLBACK: URL padrão para desenvolvimento
  return 'https://localhost:5174';
};

// Schema de validação para criação de checkout (SIMPLIFICADO)
const checkoutSchema = Joi.object({
  planType: Joi.string()
    .valid('basic', 'pro', 'premium')
    .required()
    .messages({
      'any.required': 'Tipo do plano é obrigatório',
      'any.only': 'Tipo do plano deve ser basic, pro ou premium'
    }),
  userEmail: Joi.string()
    .email({ tlds: { allow: false } })
    .max(254)
    .optional()
    .messages({
      'string.email': 'Email deve ter formato válido',
      'string.max': 'Email muito longo'
    }),
  userName: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Nome não pode estar vazio',
      'string.max': 'Nome muito longo'
    }),
  interval: Joi.string()
    .valid('monthly', 'semiannual', 'annual')
    .default('monthly')
    .messages({
      'any.only': 'Intervalo deve ser monthly, semiannual ou annual'
    }),
  priceId: Joi.string()
    .optional()
    .messages({
      'string.base': 'ID do preço deve ser uma string'
    }),
  userData: Joi.object({
    firstName: Joi.string()
      .min(1)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Nome não pode estar vazio',
        'string.max': 'Nome muito longo'
      }),
    lastName: Joi.string()
      .min(1)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Sobrenome não pode estar vazio',
        'string.max': 'Sobrenome muito longo'
      }),
    phone: Joi.string()
      .optional()
      .messages({
        'string.base': 'Telefone deve ser uma string'
      }),
    password: Joi.string()
      .optional()
      .messages({
        'string.base': 'Senha deve ser uma string'
      }),
    planType: Joi.string()
      .valid('basic', 'pro', 'premium')
      .optional()
      .messages({
        'any.only': 'Tipo do plano deve ser basic, pro ou premium'
      }),
    source: Joi.string()
      .optional()
      .default('signup_with_plans')
      .messages({
        'string.base': 'Fonte deve ser uma string'
      })
  }).optional(),
  successUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'URL de sucesso deve ser válida'
    }),
  cancelUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'URL de cancelamento deve ser válida'
    })
}).unknown(true); // ✅ PERMITIR campos adicionais

/**
 * GET /api/stripe/plans
 * Lista todos os planos disponíveis
 */
router.get('/plans', async (req, res) => {
  try {
    console.log('🔄 GET /plans - Listando planos disponíveis...');
    
    const plans = await stripeService.getAvailablePlans();
    
    console.log(`✅ ${plans.length} planos encontrados`);
    
    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('❌ Erro ao listar planos:', error);
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
 * Cria uma sessão de checkout para assinatura
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { planType, userEmail, userName, interval = 'monthly', userData, usePopup = false } = req.body;
    
    console.log('🔄 Criando Checkout Session com 3DS:', { planType, userEmail, interval, usePopup });
    
    // ✅ VALIDAÇÃO SIMPLES
    if (!planType || !userEmail || !userName) {
      return res.status(400).json({
        success: false,
        message: 'planType, userEmail e userName são obrigatórios'
      });
    }
    
    // ✅ DADOS SIMPLIFICADOS
    const checkoutData = {
      planType,
      userEmail,
      userName,
      interval,
      usePopup,
      // ✅ METADADOS ESSENCIAIS
      metadata: {
        plan: planType,
        interval: interval,
        customerEmail: userEmail,
        userName: userName,
        mode: 'signup',
        usePopup: usePopup.toString()
      },
      // ✅ URLs SIMPLES
      successUrl: `${process.env.FRONTEND_URL || 'https://localhost:5173'}/payment/success?plan=${planType}&status=success`,
      cancelUrl: `${process.env.FRONTEND_URL || 'https://localhost:5173'}/payment/cancel?plan=${planType}&status=cancelled`
    };
    
    // ✅ ADICIONAR DADOS DE SIGNUP SE EXISTIREM
    if (userData) {
      checkoutData.metadata.signupData = JSON.stringify({
        firstName: userData.firstName || userData.first_name || '',
        lastName: userData.lastName || userData.last_name || '',
        phone: userData.phone || '',
        planType: planType,
        source: userData.source || 'signup_with_plans'
      });
    }
    
    console.log('📦 Dados preparados para checkout com 3DS:', checkoutData);
    
    // ✅ CRIAR SESSÃO COM 3DS
    const session = await stripeService.createCheckoutSession(
      checkoutData.planType,
      checkoutData.userEmail,
      checkoutData.successUrl,
      checkoutData.cancelUrl,
      checkoutData.metadata,
      checkoutData.interval,
      checkoutData.usePopup
    );
    
    console.log('✅ Sessão com 3DS criada:', {
      id: session.id,
      has3DS: true,
      trialPeriod: 7,
      securityLevel: 'high'
    });
    
    // ✅ RETORNAR RESPOSTA
    res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
        mode: 'signup',
        has3DS: true, // ✅ INDICAR que 3DS está ativo
        trialPeriod: 7, // ✅ INDICAR período de teste
        securityFeatures: {
          threeDSecure: 'automatic', // ✅ Configuração 3DS
          billingAddressRequired: true, // ✅ Endereço obrigatório para 3DS
          trialEndBehavior: 'cancel_if_no_payment_method' // ✅ Comportamento do trial
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar sessão:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/stripe/create-payment-intent
 * Cria E confirma um PaymentIntent em uma operação
 * Ideal para checkout nativo com 3D Secure
 */
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { planType, userEmail, userName, paymentMethodId, interval = 'monthly', userData } = req.body;
    
    // ✅ DEBUG: Log dos dados recebidos na rota create-payment-intent:
    console.log('🔍 Dados recebidos na rota create-payment-intent:', {
      planType,
      userEmail,
      userName,
      paymentMethodId,
      interval,
      userData: userData ? {
        ...userData,
        hasPassword: !!userData.password,
        passwordLength: userData.password ? userData.password.length : 0,
        passwordPreview: userData.password ? `${userData.password.substring(0, 3)}***` : 'não definida'
      } : 'não fornecido',
      body: req.body
    });
    
    // Validações básicas
    if (!planType || !userEmail || !userName || !paymentMethodId) {
      console.log('❌ Validação falhou:', { planType, userEmail, userName, paymentMethodId });
      return res.status(400).json({
        success: false,
        message: 'planType, userEmail, userName e paymentMethodId são obrigatórios'
      });
    }
    
    // ✅ DEBUG: Log antes de chamar getPlanInfo
    console.log('🔍 Chamando getPlanInfo com:', { planType, interval });
    
    // Validar se o plano existe
    const planInfo = await stripeService.getPlanInfo(planType, interval);
    if (!planInfo) {
      console.log('❌ Plano não encontrado:', { planType, interval });
      return res.status(400).json({
        success: false,
        message: `Plano ${planType} com intervalo ${interval} não encontrado`
      });
    }
    
    console.log('✅ Plano encontrado:', planInfo);
    
    // ✅ NOVO MÉTODO: Criar E confirmar PaymentIntent em uma operação
    const paymentIntent = await stripeService.createAndConfirmPaymentIntent(
      planType,
      userEmail,
      paymentMethodId,
      {
        source: 'signup',
        userName: userName.trim(),
        // ✅ DADOS COMPLETOS: Passar todos os dados do usuário para o webhook
        firstName: userData?.firstName || '',
        lastName: userData?.lastName || '',
        fullName: userData?.fullName || userName.trim(),
        phone: userData?.phone || '',
        password: userData?.password || '', // Senha para criação no webhook
        planType: planType,
        interval: interval,
        ...userData // Incluir firstName, lastName, phone, password, etc.
      },
      interval
    );
    
    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        plan: planInfo,
        status: paymentIntent.status,
        requiresAction: paymentIntent.requiresAction,
        nextAction: paymentIntent.nextAction // ✅ Já está correto - vem do serviço
      }
    });
  } catch (error) {
    console.error('❌ Erro ao criar E confirmar PaymentIntent:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao criar E confirmar PaymentIntent'
    });
  }
});

/**
 * POST /api/stripe/create-native-payment-intent
 * Cria um PaymentIntent para checkout nativo (sem PaymentMethod)
 * Ideal para confirmCardPayment no frontend
 */
router.post('/create-native-payment-intent', async (req, res) => {
  try {
    const { planType, userEmail, userName, interval = 'monthly', userData } = req.body;
    
    // ✅ DEBUG: Log dos dados recebidos na rota create-native-payment-intent:
    console.log('🔍 Dados recebidos na rota create-native-payment-intent:', {
      planType,
      userEmail,
      userName,
      interval,
      userData: userData ? {
        ...userData,
        hasPassword: !!userData.password,
        passwordLength: userData.password ? userData.password.length : 0,
        passwordPreview: userData.password ? `${userData.password.substring(0, 3)}***` : 'não definida'
      } : 'não fornecido',
      body: req.body
    });
    
    // ✅ VALIDAÇÃO: Sem paymentMethodId (checkout nativo)
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
    const planInfo = await stripeService.getPlanInfo(planType, interval);
    if (!planInfo) {
      console.log('❌ Plano não encontrado:', { planType, interval });
      return res.status(400).json({
        success: false,
        message: `Plano ${planType} com intervalo ${interval} não encontrado`
      });
    }
    
    console.log('✅ Plano encontrado:', planInfo);
    
    // ✅ NOVO MÉTODO: Criar PaymentIntent (sem confirmar)
    const paymentIntent = await stripeService.createPaymentIntentOnly(
      planType,
      userEmail,
      {
        source: 'signup_native',
        userName: userName.trim(),
        // ✅ DADOS COMPLETOS: Passar todos os dados do usuário para o webhook
        firstName: userData?.firstName || '',
        lastName: userData?.lastName || '',
        fullName: userData?.fullName || userName.trim(),
        phone: userData?.phone || '',
        password: userData?.password || '', // Senha para criação no webhook
        planType: planType,
        interval: interval,
        ...userData // Incluir firstName, lastName, phone, password, etc.
      },
      interval
    );
    
    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        plan: planInfo,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      }
    });
  } catch (error) {
    console.error('❌ Erro ao criar PaymentIntent nativo:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao criar PaymentIntent nativo'
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
    const planInfo = await stripeService.getPlanInfo(planType, interval);
    if (!planInfo) {
      return res.status(400).json({
        success: false,
        message: `Plano ${planType} com intervalo ${interval} não encontrado`
      });
    }
    
    // URLs padrão se não fornecidas
    const defaultSuccessUrl = `${getBaseUrl()}/payment/success?plan=${planType}&session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${getBaseUrl()}/payment/cancel`;
    
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
 * Verifica o status de um pagamento (SEM AUTENTICAÇÃO - para uso no frontend)
 * Suporta tanto Checkout Session IDs quanto Payment Intent IDs
 */
router.get('/payment-status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    let paymentStatus;
    
    // ✅ DETECTAR: Se é Payment Intent ID ou Checkout Session ID
    if (sessionId.startsWith('pi_')) {
      // É um Payment Intent ID
      logger.info(`Verificando Payment Intent: ${sessionId}`);
      paymentStatus = await stripeService.getPaymentIntent(sessionId);
    } else {
      // É um Checkout Session ID
      logger.info(`Verificando Checkout Session: ${sessionId}`);
      paymentStatus = await stripeService.getPaymentStatus(sessionId);
    }
    
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

// ✅ ROTA DE TESTE: Para verificar se o webhook está funcionando
router.get('/webhook/test', (req, res) => {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    res.json({
      success: true,
      message: 'Webhook do Stripe configurado',
      config: {
        hasWebhookSecret: !!webhookSecret,
        webhookSecretLength: webhookSecret?.length || 0,
        hasStripeKey: !!stripeKey,
        stripeKeyLength: stripeKey?.length || 0,
      timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Erro no teste do webhook:', error);
    res.status(500).json({ error: 'Erro interno no teste' });
  }
});

// ✅ ROTA DE TESTE: Simular webhook do Stripe
router.post('/webhook/test-simulate', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    console.log('🧪 Teste de webhook simulado:', {
      contentType: req.headers['content-type'],
      bodyType: typeof req.body,
      bodyLength: req.body?.length || 0,
      isBuffer: Buffer.isBuffer(req.body),
      isString: typeof req.body === 'string',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Teste de webhook simulado',
      bodyInfo: {
        type: typeof req.body,
        length: req.body?.length || 0,
        isBuffer: Buffer.isBuffer(req.body),
        isString: typeof req.body === 'string'
      }
    });
  } catch (error) {
    console.error('❌ Erro no teste simulado:', error);
    res.status(500).json({ error: 'Erro interno no teste' });
  }
});

// ✅ WEBHOOK DO STRIPE: Para processar eventos de pagamento e assinatura
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // ✅ DEBUG: Verificar tipo do corpo da requisição
    console.log('🔍 Webhook recebido:', {
      contentType: req.headers['content-type'],
      bodyType: typeof req.body,
      bodyLength: req.body?.length || 0,
      isBuffer: Buffer.isBuffer(req.body),
      isString: typeof req.body === 'string',
      timestamp: new Date().toISOString()
    });
    
    // ✅ IMPORTANTE: O corpo agora deve vir como Buffer ou string
    if (!req.body || (typeof req.body !== 'string' && !Buffer.isBuffer(req.body))) {
      console.error('❌ Corpo da requisição inválido para webhook');
      return res.status(400).json({
        error: 'Corpo da requisição deve ser string ou Buffer para webhook' 
      });
    }

    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!endpointSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET não configurado');
      return res.status(500).json({ error: 'Webhook secret não configurado' });
    }

    let event;
    
    try {
      // ✅ VERIFICAR: Assinatura do webhook
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log('✅ Webhook Stripe verificado:', event.type);
    } catch (err) {
      console.error('❌ Erro na verificação do webhook:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // ✅ PROCESSAR: Eventos específicos
    switch (event.type) {
      case 'customer.subscription.created':
        console.log('🔄 Assinatura criada:', event.data.object.id);
        await stripeService.handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        console.log('🔄 Assinatura atualizada:', event.data.object.id);
        await stripeService.handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        console.log('🔄 Assinatura cancelada:', event.data.object.id);
        await stripeService.handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'customer.subscription.trial_will_end':
        console.log('🔄 Trial vai terminar em 3 dias:', event.data.object.id);
        await stripeService.handleSubscriptionTrialWillEnd(event.data.object);
        break;
        
      case 'customer.subscription.trial_ended':
        console.log('🔄 Trial terminou:', event.data.object.id);
        await stripeService.handleSubscriptionTrialEnded(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        console.log('🔄 Pagamento de fatura realizado:', event.data.object.id);
        await stripeService.handleInvoicePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        console.log('🔄 Pagamento de fatura falhou:', event.data.object.id);
        await stripeService.handleInvoicePaymentFailed(event.data.object);
        break;
        
      case 'invoice.upcoming':
        console.log('🔄 Próxima fatura criada:', event.data.object.id);
        // TODO: Implementar notificação de próxima cobrança
        break;
        
      case 'customer.created':
        console.log('🔄 Cliente criado:', event.data.object.id);
        await stripeService.handleCustomerCreated(event.data.object);
        break;
        
      case 'payment_method.attached':
        console.log('🔄 Método de pagamento anexado:', event.data.object.id);
        // TODO: Implementar log de método de pagamento anexado
        break;
        
      case 'checkout.session.completed':
        console.log('🔄 Checkout session completada:', event.data.object.id);
        await stripeService.handleCheckoutCompleted(event.data.object);
        break;
        
      default:
        console.log(`⚠️ Evento não processado: ${event.type}`);
    }

    res.json({ received: true });
    
  } catch (error) {
    console.error('❌ Erro no webhook do Stripe:', error);
    res.status(500).json({ error: 'Erro interno no webhook' });
  }
});

// ✅ WEBHOOK AGORA CHAMA O SERVIÇO CORRETO: stripeService.handleCheckoutCompleted

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
 * POST /api/stripe/capture-payment
 * Captura um Payment Intent confirmado
 */
router.post('/capture-payment', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    
    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'paymentIntentId é obrigatório'
      });
    }
    
    const result = await stripeService.capturePaymentIntent(paymentIntentId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Erro ao capturar pagamento:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao capturar pagamento'
    });
  }
});

/**
 * GET /api/stripe/payment-intent/:id
 * Obtém detalhes de um Payment Intent
 */
router.get('/payment-intent/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await stripeService.getPaymentIntent(id);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Erro ao obter Payment Intent:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao obter pagamento'
    });
  }
});

/**
 * POST /api/stripe/retry-payment
 * Tenta novamente um Payment Intent que falhou
 */
router.post('/retry-payment', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    
    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'paymentIntentId é obrigatório'
      });
    }
    
    // ✅ VERIFICAR: Status atual do PaymentIntent
    const currentStatus = await stripeService.getPaymentIntent(paymentIntentId);
    
    if (currentStatus.status === 'succeeded') {
      return res.status(200).json({
        success: true,
        message: 'Pagamento já foi confirmado',
        data: currentStatus
      });
    }
    
    if (currentStatus.status === 'requires_payment_method') {
      // ✅ RETRY: Criar novo PaymentIntent
      const { planType, interval, customerEmail } = currentStatus.metadata;
      
      const newPaymentIntent = await stripeService.createPaymentIntent(
        planType,
        customerEmail,
        { retry: true, originalId: paymentIntentId },
        interval
      );
      
      return res.status(200).json({
        success: true,
        message: 'Novo PaymentIntent criado para retry',
        data: newPaymentIntent
      });
    }
    
    res.status(400).json({
      success: false,
      message: `PaymentIntent não pode ser retry. Status: ${currentStatus.status}`
    });
    
  } catch (error) {
    logger.error('Erro ao tentar retry do pagamento:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao tentar novamente'
    });
  }
});

/**
 * POST /api/stripe/confirm-payment
 * Confirma um pagamento no backend (MAIS SEGURO)
 */
router.post('/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId, paymentMethodId } = req.body;
    
    // ✅ DEBUG: Log completo dos dados recebidos
    logger.info('📥 Dados recebidos na confirmação:', {
      body: req.body,
      paymentIntentId,
      paymentMethodId,
      hasPaymentMethod: !!paymentMethodId,
      timestamp: new Date().toISOString()
    });
    
    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'paymentIntentId é obrigatório'
      });
    }
    
    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: 'paymentMethodId é obrigatório'
      });
    }
    
    logger.info('🔐 Confirmando pagamento no backend:', {
      paymentIntentId,
      paymentMethodId,
      hasPaymentMethod: !!paymentMethodId,
      timestamp: new Date().toISOString()
    });
    
    // ✅ CONFIRMAR: Pagamento no backend usando chave secreta
    const result = await stripeService.confirmPaymentIntent(
      paymentIntentId,
      paymentMethodId
    );
    
    logger.info('✅ Pagamento confirmado com sucesso:', {
      paymentIntentId,
      status: result.status,
      timestamp: new Date().toISOString()
    });
    
    res.status(200).json({
      success: true,
      message: 'Pagamento confirmado com sucesso',
      data: result
    });
    
  } catch (error) {
    logger.error('❌ Erro ao confirmar pagamento:', {
      error: error.message,
      type: error.type,
      code: error.code,
      timestamp: new Date().toISOString()
    });
    
    // ✅ TRATAMENTO ESPECÍFICO: Erros do Stripe
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        message: 'Erro no cartão de crédito',
        error: {
          type: error.type,
          code: error.code,
          message: error.message,
          decline_code: error.decline_code
        }
      });
    }
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        success: false,
        message: 'Requisição inválida para o Stripe',
        error: {
          type: error.type,
          code: error.code,
          message: error.message
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro interno ao confirmar pagamento',
      error: {
        type: error.type || 'UnknownError',
        message: error.message
      }
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

/**
 * GET /api/stripe/temp-password/:paymentIntentId
 * Obtém a senha temporária armazenada no webhook para login automático
 */
router.get('/temp-password/:paymentIntentId', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    
    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment Intent ID é obrigatório'
      });
    }
    
    // ✅ BUSCAR: PaymentIntent no Stripe para obter metadados
    const paymentIntent = await stripeService.getPaymentIntent(paymentIntentId);
    
    if (!paymentIntent) {
      return res.status(404).json({
        success: false,
        message: 'Payment Intent não encontrado'
      });
    }
    
    // ✅ VERIFICAR: Se o pagamento foi confirmado
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Pagamento ainda não foi confirmado'
      });
    }
    
    // ✅ OBTER: Senha temporária dos metadados (se disponível)
    const metadata = paymentIntent.metadata;
    const tempPassword = metadata.tempPasswordForLogin;
    const tempPasswordExpiresAt = metadata.tempPasswordExpiresAt;
    
    if (!tempPassword) {
      return res.status(404).json({
        success: false,
        message: 'Senha temporária não encontrada'
      });
    }
    
    // ✅ VERIFICAR: Se a senha ainda é válida
    if (tempPasswordExpiresAt && new Date(tempPasswordExpiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Senha temporária expirou'
      });
    }
    
    // ✅ RETORNAR: Senha temporária para login automático
    res.status(200).json({
      success: true,
      data: {
        email: metadata.customerEmail || metadata.email,
        tempPassword: tempPassword,
        expiresAt: tempPasswordExpiresAt,
        note: 'Senha temporária para login automático após pagamento confirmado'
      }
    });
    
  } catch (error) {
    logger.error('Erro ao obter senha temporária:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao obter senha temporária'
    });
  }
});

/**
 * POST /api/stripe/process-payment
 * Processa ASSINATURA RECORRENTE completa com Stripe (criação de conta + assinatura)
 * ✅ NOVA ARQUITETURA: Frontend envia dados do cartão, backend processa tudo
 */
router.post('/process-payment', async (req, res) => {
  try {
    const { planType, userEmail, userName, cardData, interval = 'monthly', userData } = req.body;
    
    // ✅ DEBUG: Log dos dados recebidos para ASSINATURA RECORRENTE
    console.log('🔍 Dados recebidos para ASSINATURA RECORRENTE:', {
      planType,
      userEmail,
      userName,
      hasCardData: !!cardData,
      interval,
      userData: userData ? {
        ...userData,
        hasPassword: !!userData.password,
        passwordLength: userData.password ? userData.password.length : 0,
        passwordPreview: userData.password ? `${userData.password.substring(0, 3)}***` : 'não definida'
      } : 'não fornecido',
      body: req.body
    });
    
    // ✅ VALIDAÇÃO: Todos os campos obrigatórios
    if (!planType || !userEmail || !userName || !cardData) {
      console.log('❌ Validação falhou:', { planType, userEmail, userName, hasCardData: !!cardData });
      return res.status(400).json({
        success: false,
        message: 'planType, userEmail, userName e cardData são obrigatórios'
      });
    }
    
    // ✅ DEBUG: Log antes de chamar getPlanInfo
    console.log('🔍 Chamando getPlanInfo com:', { planType, interval });
    
    // Validar se o plano existe
    const planInfo = await stripeService.getPlanInfo(planType, interval);
    if (!planInfo) {
      console.log('❌ Plano não encontrado:', { planType, interval });
      return res.status(400).json({
        success: false,
        message: `Plano ${planType} com intervalo ${interval} não encontrado`
      });
    }
    
    console.log('✅ Plano encontrado:', planInfo);
    
    // ✅ PROCESSAR ASSINATURA RECORRENTE COMPLETA: Criação de conta + assinatura
    console.log('🔄 Processando ASSINATURA RECORRENTE completa com Stripe...');
    
    const result = await stripeService.processCompletePayment(
      planType,
      userEmail,
      cardData, // ✅ Agora recebe cardData para backend processar
      {
        source: 'signup_processed',
        userName: userName.trim(),
        // ✅ DADOS COMPLETOS: Passar todos os dados do usuário
        firstName: userData?.firstName || '',
        lastName: userData?.lastName || '',
        fullName: userData?.fullName || userName.trim(),
        phone: userData?.phone || '',
        password: userData?.password || '', // Senha para criação no Supabase
        planType: planType,
        interval: interval,
        ...userData // Incluir firstName, lastName, phone, password, etc.
      },
      interval
    );
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Assinatura recorrente processada com sucesso',
        plan: planInfo,
        status: result.status,
        subscriptionStatus: result.subscriptionStatus,
        customerId: result.customerId,
        subscriptionId: result.subscriptionId,
        // ✅ INFORMAÇÕES IMPORTANTES PARA ASSINATURA
        nextBillingDate: result.nextBillingDate,
        interval: result.interval,
        amount: result.amount,
        currency: result.currency
      }
    });
  } catch (error) {
    console.error('❌ Erro ao processar assinatura recorrente:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao processar assinatura recorrente'
    });
  }
});

/**
 * POST /api/stripe/create-setup-intent
 * Cria um SetupIntent para Payment Element
 */
router.post('/create-setup-intent', async (req, res) => {
  try {
    const { planType, userEmail, interval = 'monthly' } = req.body;
    
    console.log('🔄 Criando SetupIntent para Payment Element:', { planType, userEmail, interval });
    
    // ✅ VALIDAÇÃO: Campos obrigatórios
    if (!planType || !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'planType e userEmail são obrigatórios'
      });
    }

    // ✅ CRIAR SETUP INTENT: Para Payment Element
    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ['card'],
      // ✅ CORREÇÃO: Usar 'customer' em vez de 'customer_email'
      // ✅ NOTA: Para SetupIntent, não precisamos criar customer ainda
      metadata: {
        planType,
        interval,
        source: 'signup_with_plans',
        userEmail
      },
      // ✅ NOVO: Configurações para assinatura
      usage: 'off_session', // ✅ Para cobranças futuras (assinaturas)
      // ✅ ADICIONAR: Configurações específicas para 3DS
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic' // ✅ Solicitar 3DS automaticamente
        }
      }
      // ❌ REMOVIDO: confirm_params não existe na API do Stripe
    });

    console.log('✅ SetupIntent criado com sucesso:', setupIntent.id);

    res.status(200).json({
      success: true,
      data: {
        id: setupIntent.id,
        client_secret: setupIntent.client_secret,
        status: setupIntent.status,
        planType,
        interval,
        userEmail
      }
    });

  } catch (error) {
    console.error('❌ Erro ao criar SetupIntent:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/stripe/verify-captcha
 * Verifica o captcha e confirma o SetupIntent
 */
router.post('/verify-captcha', async (req, res) => {
  try {
    const { setupIntentId, captchaToken, rqdata } = req.body;
    
    console.log('🔄 Verificando captcha para SetupIntent:', { setupIntentId, hasCaptchaToken: !!captchaToken, hasRqdata: !!rqdata });
    
    // ✅ VALIDAÇÃO: Campos obrigatórios
    if (!setupIntentId || !captchaToken) {
      return res.status(400).json({
        success: false,
        message: 'setupIntentId e captchaToken são obrigatórios'
      });
    }

    // ✅ RECUPERAR SETUP INTENT
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    console.log('📋 SetupIntent recuperado:', { id: setupIntent.id, status: setupIntent.status });

    if (!setupIntent) {
      return res.status(404).json({
        success: false,
        message: 'SetupIntent não encontrado'
      });
    }

    // ✅ VERIFICAR SE AINDA PRECISA DE AÇÃO
    if (setupIntent.status !== 'requires_action') {
      return res.status(400).json({
        success: false,
        message: `SetupIntent não requer ação. Status atual: ${setupIntent.status}`
      });
    }

    // ✅ VERIFICAR CAPTCHA COM STRIPE
    try {
      const verificationResponse = await stripe.request({
        method: 'POST',
        url: setupIntent.next_action.use_stripe_sdk.stripe_js.verification_url,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: new URLSearchParams({
          captcha_token: captchaToken,
          rqdata: rqdata || ''
        }).toString()
      });

      console.log('✅ Captcha verificado com sucesso');

      // ✅ RECUPERAR SETUP INTENT ATUALIZADO
      const updatedSetupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      console.log('📋 SetupIntent após captcha:', { id: updatedSetupIntent.id, status: updatedSetupIntent.status });

      // ✅ PROCESSAR RESULTADO
      if (updatedSetupIntent.status === 'succeeded') {
        console.log('✅ SetupIntent confirmado com sucesso após captcha');
        
        // ✅ PROCESSAR WEBHOOK (criar usuário no Supabase)
        const webhookResult = await stripeService.handleSetupIntentSucceeded(updatedSetupIntent);
        
        res.status(200).json({
          success: true,
          data: {
            message: 'Captcha verificado e SetupIntent confirmado com sucesso',
            setupIntentId: updatedSetupIntent.id,
            status: updatedSetupIntent.status,
            customerId: updatedSetupIntent.customer,
            paymentMethodId: updatedSetupIntent.payment_method,
            webhookProcessed: webhookResult
          }
        });
      } else if (updatedSetupIntent.status === 'requires_action') {
        console.log('⚠️ SetupIntent ainda requer ação após captcha:', updatedSetupIntent.next_action);
        
        res.status(200).json({
          success: true,
          data: {
            message: 'Captcha verificado, mas SetupIntent ainda requer ação',
            setupIntentId: updatedSetupIntent.id,
            status: updatedSetupIntent.status,
            nextAction: updatedSetupIntent.next_action,
            requiresAction: true
          }
        });
      } else {
        console.log('❌ SetupIntent falhou após captcha:', updatedSetupIntent.status);
        
        res.status(400).json({
          success: false,
          message: `SetupIntent falhou após verificação do captcha. Status: ${updatedSetupIntent.status}`,
          setupIntentId: updatedSetupIntent.id,
          status: updatedSetupIntent.status,
          lastSetupError: updatedSetupIntent.last_setup_error
        });
      }

    } catch (verificationError) {
      console.error('❌ Erro ao verificar captcha com Stripe:', verificationError);
      
      res.status(400).json({
        success: false,
        message: 'Falha na verificação do captcha',
        error: verificationError.message
      });
    }

  } catch (error) {
    console.error('❌ Erro ao verificar captcha:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
});

// ✅ ROTA REMOVIDA: Esta rota estava duplicada e conflitante
// A rota principal /payment-status/:sessionId já trata tanto Payment Intent quanto Checkout Session

// ✅ NOVA ROTA: LISTAR PRODUTOS DISPONÍVEIS
router.get('/products', async (req, res) => {
  try {
    console.log('🔄 Listando produtos disponíveis...');
    
    const stripeProductService = require('../services/stripeProductService');
    const products = await stripeProductService.getAvailableProducts();
    
    console.log(`✅ ${products.length} produtos encontrados`);
    
    res.json({
      success: true,
      data: products
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar produtos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ NOVA ROTA: BUSCAR PRODUTO ESPECÍFICO
router.get('/products/:planType', async (req, res) => {
  try {
    const { planType } = req.params;
    const { interval = 'monthly' } = req.query;
    
    console.log('🔄 Buscando produto:', { planType, interval });
    
    const stripeProductService = require('../services/stripeProductService');
    const product = await stripeProductService.getProductByPlanType(planType);
    const price = await stripeProductService.getPriceByPlanAndInterval(planType, interval);
    
    console.log('✅ Produto e preço encontrados:', { product: product.name, price: price.id });
    
    res.json({
      success: true,
      data: {
        product,
        price
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar produto:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/stripe/create-subscription
 * Cria uma assinatura recorrente com free trial
 * Ideal para modelos SaaS com cobrança recorrente
 */
router.post('/create-subscription', async (req, res) => {
  try {
    const { planType, userEmail, userName, interval = 'monthly', userData } = req.body;
    
    // ✅ DEBUG: Log dos dados recebidos
    console.log('🔍 Dados recebidos na rota create-subscription:', {
      planType,
      userEmail,
      userName,
      interval,
      userData: userData ? {
        ...userData,
        hasPassword: !!userData.password,
        passwordLength: userData.password ? userData.password.length : 0,
        passwordPreview: userData.password ? `${userData.password.substring(0, 3)}***` : 'não definida'
      } : 'não fornecido'
    });
    
    // ✅ VALIDAÇÃO: Campos obrigatórios
    if (!planType || !userEmail || !userName) {
      console.log('❌ Validação falhou:', { planType, userEmail, userName });
      return res.status(400).json({
        success: false,
        message: 'planType, userEmail e userName são obrigatórios'
      });
    }
    
    // ✅ VALIDAR PLANO
    const planInfo = await stripeService.getPlanInfo(planType, interval);
    if (!planInfo) {
      console.log('❌ Plano não encontrado:', { planType, interval });
      return res.status(400).json({
        success: false,
        message: `Plano ${planType} com intervalo ${interval} não encontrado`
      });
    }
    
    console.log('✅ Plano encontrado:', planInfo);
    
    // ✅ CRIAR ASSINATURA RECORRENTE
    const subscriptionData = await stripeService.createSubscriptionWithTrial(
      planType,
      userEmail,
      userName,
      {
        source: 'signup_subscription',
        userName: userName.trim(),
        // ✅ DADOS COMPLETOS: Passar todos os dados do usuário para o webhook
        firstName: userData?.firstName || '',
        lastName: userData?.lastName || '',
        fullName: userData?.fullName || userName.trim(),
        phone: userData?.phone || '',
        password: userData?.password || '', // Senha para criação no webhook
        planType: planType,
        interval: interval,
        ...userData
      },
      interval
    );
    
    res.status(200).json({
      success: true,
      data: {
        subscription: subscriptionData.subscription,
        setupIntent: subscriptionData.setupIntent,
        plan: planInfo,
        status: subscriptionData.subscription.status,
        trialEnd: subscriptionData.subscription.trial_end,
        currentPeriodEnd: subscriptionData.subscription.current_period_end
      }
    });
  } catch (error) {
    console.error('❌ Erro ao criar assinatura recorrente:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao criar assinatura recorrente'
    });
  }
});

/**
 * POST /api/stripe/attach-payment-method
 * Anexa um método de pagamento a uma assinatura existente
 * Necessário para manter a assinatura ativa após o free trial
 */
router.post('/attach-payment-method', async (req, res) => {
  try {
    const { subscriptionId, paymentMethodId } = req.body;
    
    // ✅ VALIDAR DADOS OBRIGATÓRIOS
    if (!subscriptionId || !paymentMethodId) {
      console.log('❌ Validação falhou:', { subscriptionId, paymentMethodId });
      return res.status(400).json({
        success: false,
        message: 'Subscription ID e Payment Method ID são obrigatórios'
        });
    }

    console.log('🔍 Anexando método de pagamento:', { subscriptionId, paymentMethodId });

    // ✅ ANEXAR MÉTODO DE PAGAMENTO À ASSINATURA
    const result = await stripeService.attachPaymentMethodToSubscription(
      subscriptionId,
      paymentMethodId
    );

    // ✅ RETORNAR SUCESSO
    res.status(200).json({
      success: true,
      message: 'Método de pagamento anexado com sucesso',
      data: result
    });

  } catch (error) {
    console.error('❌ Erro ao anexar método de pagamento:', error);
    res.status(500).json({
      success: false,
      message: `Erro ao anexar método de pagamento: ${error.message}`
    });
  }
});

module.exports = router; 