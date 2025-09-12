const express = require('express');
const router = express.Router();
const tokenBillingService = require('../services/tokenBillingService');
const logger = require('../utils/logger');

/**
 * @route POST /api/token-billing/create-subscription
 * @desc Criar subscription mensal com taxa fixa
 * @access Public
 */
router.post('/create-subscription', async (req, res) => {
  try {
    const { customerId } = req.body;
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID é obrigatório'
      });
    }

    console.log('🔄 Criando subscription mensal para cliente:', customerId);
    
    const subscription = await tokenBillingService.createMonthlySubscription(customerId);
    
    logger.info('Monthly subscription created via API', {
      customerId,
      subscriptionId: subscription.id
    });

    res.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        amount: 40000, // R$ 400
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end
      }
    });

  } catch (error) {
    console.error('❌ Erro ao criar subscription:', error);
    
    logger.error('Failed to create subscription via API', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Erro ao criar subscription',
      details: error.message
    });
  }
});

/**
 * @route POST /api/token-billing/process-usage
 * @desc Processar uso de tokens e cobrar quando necessário
 * @access Public
 */
router.post('/process-usage', async (req, res) => {
  try {
    const { 
      clientId, 
      tokensUsed
    } = req.body;
    
    if (!clientId || tokensUsed === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Client ID e tokens usados são obrigatórios'
      });
    }

    console.log(`🔄 Processando uso de ${tokensUsed} tokens para cliente:`, clientId);
    
    const result = await tokenBillingService.processTokenUsage(clientId, tokensUsed);
    
    logger.info('Token usage processed via API', {
      clientId,
      tokensUsed,
      result
    });

    res.json({
      success: true,
      message: 'Uso de tokens processado com sucesso',
      data: result
    });

  } catch (error) {
    console.error('❌ Erro ao processar uso de tokens:', error);
    
    logger.error('Failed to process token usage via API', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Erro ao processar uso de tokens',
      details: error.message
    });
  }
});

/**
 * @route POST /api/token-billing/reset-cycle
 * @desc Resetar ciclo de cobrança (início do mês)
 * @access Public
 */
router.post('/reset-cycle', async (req, res) => {
  try {
    const { customerId } = req.body;
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID é obrigatório'
      });
    }

    console.log('🔄 Resetando ciclo de cobrança para cliente:', customerId);
    
    const resetData = await tokenBillingService.resetBillingCycle(customerId);
    
    logger.info('Billing cycle reset via API', {
      customerId,
      resetData
    });

    res.json({
      success: true,
      message: 'Ciclo de cobrança resetado com sucesso',
      data: resetData
    });

  } catch (error) {
    console.error('❌ Erro ao resetar ciclo de cobrança:', error);
    
    logger.error('Failed to reset billing cycle via API', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Erro ao resetar ciclo de cobrança',
      details: error.message
    });
  }
});

/**
 * @route GET /api/token-billing/summary/:customerId
 * @desc Obter resumo de cobrança do cliente
 * @access Public
 */
router.get('/summary/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    console.log('📊 Obtendo resumo de cobrança para cliente:', customerId);
    
    const summary = await tokenBillingService.getBillingSummary(customerId);
    
    logger.info('Billing summary retrieved via API', {
      customerId
    });

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('❌ Erro ao obter resumo de cobrança:', error);
    
    logger.error('Failed to get billing summary via API', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Erro ao obter resumo de cobrança',
      details: error.message
    });
  }
});

/**
 * @route GET /api/token-billing/user-summary/:userId
 * @desc Obter resumo de uso de tokens do usuário
 * @access Public
 */
router.get('/user-summary/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { periodStart } = req.query;
    
    console.log('📊 Obtendo resumo de uso para usuário:', userId);
    
    const summary = await tokenBillingService.getUserTokenSummary(userId, periodStart);
    
    logger.info('User token summary retrieved via API', {
      userId,
      periodStart
    });

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('❌ Erro ao obter resumo de uso:', error);
    
    logger.error('Failed to get user token summary via API', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Erro ao obter resumo de uso',
      details: error.message
    });
  }
});

/**
 * @route GET /api/token-billing/client-summary/:clientId
 * @desc Obter resumo consolidado de uso de tokens por cliente
 * @access Public
 */
router.get('/client-summary/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { periodStart } = req.query;
    
    console.log('📊 Obtendo resumo consolidado para cliente:', clientId);
    console.log('📊 Period start:', periodStart);
    
    const summary = await tokenBillingService.getClientTokenSummary(clientId, periodStart);
    
    console.log('📊 Resumo obtido:', JSON.stringify(summary, null, 2));
    
    logger.info('Client token summary retrieved via API', {
      clientId,
      periodStart,
      summary
    });

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('❌ Erro ao obter resumo de cliente:', error);
    
    logger.error('Failed to get client token summary via API', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Erro ao obter resumo de cliente',
      details: error.message
    });
  }
});

/**
 * @route POST /api/token-billing/sync-dynamic-limit
 * @desc Sincronizar limite dinâmico baseado no valor total cobrado
 * @access Public
 */
router.post('/sync-dynamic-limit', async (req, res) => {
  try {
    const { clientId } = req.body;
    
    if (!clientId) {
      return res.status(400).json({
        success: false,
        error: 'Client ID é obrigatório'
      });
    }

    console.log(`🔄 Sincronizando limite dinâmico para cliente ${clientId}`);
    
    // Buscar resumo atual
    const { data: summary, error: fetchError } = await supabase
      .from('token_usage_summary')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      throw new Error(`Erro ao buscar resumo: ${fetchError.message}`);
    }

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Cliente não encontrado'
      });
    }

    // Recalcular limite dinâmico
    const { data: newLimit, error: calcError } = await supabase.rpc('calculate_dynamic_token_limit', {
      total_charged_cents: summary.total_amount_charged
    });

    if (calcError) {
      throw new Error(`Erro ao calcular limite: ${calcError.message}`);
    }

    // Atualizar limite dinâmico
    const { data: updatedSummary, error: updateError } = await supabase
      .from('token_usage_summary')
      .update({
        dynamic_token_limit: newLimit,
        updated_at: new Date().toISOString()
      })
      .eq('id', summary.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Erro ao atualizar limite: ${updateError.message}`);
    }

    console.log(`✅ Limite dinâmico sincronizado: ${newLimit/1000000}M tokens`);

    res.json({
      success: true,
      message: 'Limite dinâmico sincronizado com sucesso',
      data: {
        client_id: clientId,
        total_amount_charged: summary.total_amount_charged,
        dynamic_token_limit: newLimit,
        limit_in_millions: newLimit / 1000000
      }
    });

  } catch (error) {
    console.error('❌ Erro ao sincronizar limite dinâmico:', error);
    
    logger.error('Failed to sync dynamic limit via API', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Erro ao sincronizar limite dinâmico',
      details: error.message
    });
  }
});

/**
 * @route POST /api/token-billing/set-subscription-day
 * @desc Definir dia de início da assinatura para um cliente
 * @access Public
 */
router.post('/set-subscription-day', async (req, res) => {
  try {
    const { clientId, startDay } = req.body;
    
    if (!clientId || !startDay) {
      return res.status(400).json({
        success: false,
        error: 'Client ID e dia de início são obrigatórios'
      });
    }

    if (startDay < 1 || startDay > 31) {
      return res.status(400).json({
        success: false,
        error: 'Dia de início deve estar entre 1 e 31'
      });
    }

    console.log(`📅 Definindo dia de início da assinatura para cliente ${clientId}: dia ${startDay}`);
    
    const result = await tokenBillingService.setSubscriptionStartDay(clientId, startDay);
    
    logger.info('Subscription start day set via API', {
      clientId,
      startDay,
      result
    });

    res.json({
      success: true,
      message: 'Dia de início da assinatura definido com sucesso',
      data: result
    });

  } catch (error) {
    console.error('❌ Erro ao definir dia de início da assinatura:', error);
    
    logger.error('Failed to set subscription start day via API', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Erro ao definir dia de início da assinatura',
      details: error.message
    });
  }
});

/**
 * @route POST /api/token-billing/charge-tier
 * @desc Cobrar por faixa específica (para testes)
 * @access Public
 */
router.post('/charge-tier', async (req, res) => {
  try {
    const { customerId, amount, description } = req.body;
    
    if (!customerId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID e amount são obrigatórios'
      });
    }

    console.log(`💳 Cobrando ${amount} centavos para cliente:`, customerId);
    
    const paymentIntent = await tokenBillingService.chargeForTier(
      customerId, 
      amount, 
      description || 'Cobrança por faixa de tokens'
    );
    
    logger.info('Tier charge created via API', {
      customerId,
      amount,
      paymentIntentId: paymentIntent.id
    });

    res.json({
      success: true,
      message: 'Cobrança realizada com sucesso',
      data: {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status,
        description: paymentIntent.description
      }
    });

  } catch (error) {
    console.error('❌ Erro ao cobrar por faixa:', error);
    
    logger.error('Failed to charge tier via API', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Erro ao cobrar por faixa',
      details: error.message
    });
  }
});

module.exports = router;
