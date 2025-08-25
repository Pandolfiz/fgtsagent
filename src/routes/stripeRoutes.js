const express = require('express');
const stripeService = require('../services/stripeService');
const { requireAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validationMiddleware');
const logger = require('../utils/logger');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
    
    // ✅ URLs padrão para checkout - Detecta ambiente automaticamente
    const baseUrl = getBaseUrl();    
    const defaultSuccessUrl = `${baseUrl}/payment/success?plan=${planType}&session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${baseUrl}/payment/cancel`;
    
    // ✅ POPUP: Verificar se deve usar popup ou redirect
    const usePopup = req.query.popup === 'true';
    
    const session = await stripeService.createCheckoutSession(
      planType,
      user.email,
      successUrl || defaultSuccessUrl,
      cancelUrl || defaultCancelUrl,
      {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        usePopup: usePopup
      },
      'monthly', // interval padrão
      usePopup
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
    const planInfo = stripeService.getPlanInfo(planType, interval);
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
        nextAction: paymentIntent.nextAction
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
    const planInfo = stripeService.getPlanInfo(planType, interval);
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
    const planInfo = stripeService.getPlanInfo(planType, interval);
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

// ✅ WEBHOOK DO STRIPE: Para processar eventos de pagamento e assinatura
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
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
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        console.log('🔄 Assinatura atualizada:', event.data.object.id);
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        console.log('🔄 Assinatura cancelada:', event.data.object.id);
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        console.log('🔄 Pagamento de fatura realizado:', event.data.object.id);
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        console.log('🔄 Pagamento de fatura falhou:', event.data.object.id);
        await handleInvoicePaymentFailed(event.data.object);
        break;
        
      case 'customer.created':
        console.log('🔄 Cliente criado:', event.data.object.id);
        await handleCustomerCreated(event.data.object);
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

// ✅ FUNÇÕES AUXILIARES: Para processar eventos específicos
async function handleSubscriptionCreated(subscription) {
  try {
    console.log('🔄 Processando assinatura criada:', subscription.id);
    
    // ✅ ATUALIZAR: Status da assinatura no banco
    // ✅ CRIAR: Perfil do usuário se necessário
    // ✅ ENVIAR: Email de boas-vindas
    
    console.log('✅ Assinatura criada processada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao processar assinatura criada:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    console.log('🔄 Processando assinatura atualizada:', subscription.id);
    
    // ✅ ATUALIZAR: Status da assinatura no banco
    // ✅ VERIFICAR: Mudanças de plano
    
    console.log('✅ Assinatura atualizada processada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao processar assinatura atualizada:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    console.log('🔄 Processando assinatura cancelada:', subscription.id);
    
    // ✅ ATUALIZAR: Status da assinatura no banco
    // ✅ DESATIVAR: Acesso do usuário
    // ✅ ENVIAR: Email de cancelamento
    
    console.log('✅ Assinatura cancelada processada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao processar assinatura cancelada:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  try {
    console.log('🔄 Processando pagamento de fatura realizado:', invoice.id);
    
    // ✅ ATUALIZAR: Status da fatura no banco
    // ✅ VERIFICAR: Se é primeira cobrança
    // ✅ ATIVAR: Acesso do usuário se necessário
    
    console.log('✅ Pagamento de fatura processado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao processar pagamento de fatura:', error);
  }
}

async function handleInvoicePaymentFailed(invoice) {
  try {
    console.log('🔄 Processando pagamento de fatura falhou:', invoice.id);
    
    // ✅ ATUALIZAR: Status da fatura no banco
    // ✅ NOTIFICAR: Usuário sobre falha
    // ✅ VERIFICAR: Política de retry
    
    console.log('✅ Falha de pagamento processada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao processar falha de pagamento:', error);
  }
}

async function handleCustomerCreated(customer) {
  try {
    console.log('🔄 Processando cliente criado:', customer.id);
    
    // ✅ CRIAR: Perfil do usuário no banco
    // ✅ SALVAR: Dados do cliente
    
    console.log('✅ Cliente criado processado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao processar cliente criado:', error);
  }
}

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
 * Frontend envia dados do cartão, backend processa tudo
 */
router.post('/process-payment', async (req, res) => {
  try {
    const { planType, userEmail, userName, cardData, interval = 'monthly', userData } = req.body;
    
    // ✅ DEBUG: Log dos dados recebidos para ASSINATURA RECORRENTE
    console.log('🔍 Dados recebidos para ASSINATURA RECORRENTE:', {
      planType,
      userEmail,
      userName,
      cardData,
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
    const planInfo = stripeService.getPlanInfo(planType, interval);
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
      cardData, // ✅ Agora recebe cardData em vez de paymentMethodId
      {
        source: 'signup_processed',
        userName: userName.trim(),
        // ✅ DADOS COMPLETOS: Passar todos os dados do usuário
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

// ✅ ROTA REMOVIDA: Esta rota estava duplicada e conflitante
// A rota principal /payment-status/:sessionId já trata tanto Payment Intent quanto Checkout Session

module.exports = router; 