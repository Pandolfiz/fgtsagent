const stripeService = require('../services/stripeService');

// ✅ CONTROLADOR ESSENCIAL PARA ASSINATURAS RECORRENTES

// ✅ CRIAR USUÁRIO COM ASSINATURA
const signupWithPlan = async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      password, 
      planType, 
      interval,
      paymentMethodId,
      userData 
    } = req.body;

    console.log('🔄 Iniciando signup com plano:', { planType, interval, hasPaymentMethod: !!paymentMethodId });

    // ✅ VALIDAR: Dados obrigatórios
    if (!firstName || !lastName || !email || !password || !planType || !interval || !paymentMethodId) {
      return res.status(400).json({
        error: 'Todos os campos são obrigatórios: firstName, lastName, email, password, planType, interval, paymentMethodId'
      });
    }

    // ✅ ENRIQUECER: Dados do usuário com informações do Stripe
    const enrichedUserData = {
      ...userData,
      email,
      name: `${firstName} ${lastName}`,
      planType,
      interval,
      firstName,
      lastName,
      phone
    };

    // ✅ CRIAR: Cliente no Stripe
    const customer = await stripeService.getOrCreateCustomer(email, `${firstName} ${lastName}`, enrichedUserData);
    
    // ✅ OBTER: Informações do plano
    const planInfo = await stripeService.getPlanInfo(planType, interval);

    // ✅ CRIAR: Assinatura com free trial
    const { subscription, setupIntent } = await stripeService.createSubscriptionWithTrial(
      customer.id,
      planInfo.priceId,
      paymentMethodId,
      enrichedUserData
    );

    console.log('✅ Assinatura criada:', subscription.id);

    // ✅ SUCESSO: Usuário com assinatura ativa
    res.status(201).json({
      success: true,
      message: 'Usuário criado com assinatura ativa!',
      user: {
        email: email,
        name: `${firstName} ${lastName}`,
        subscription_status: subscription.status,
        trial_end: subscription.trial_end
      },
      subscription: {
        id: subscription.id,
        status: subscription.status,
        trial_end: subscription.trial_end,
        current_period_end: subscription.current_period_end
      },
      setupIntent: {
        id: setupIntent.id,
        status: setupIntent.status
      }
    });

  } catch (error) {
    console.error('❌ Erro no signup com plano:', error);
    res.status(500).json({
      error: `Falha no signup: ${error.message}`
    });
  }
};

// ✅ CONFIRMAR PAGAMENTO (para casos de 3DS pendente)
const confirmPayment = async (req, res) => {
  try {
    const { setupIntentId } = req.body;

    if (!setupIntentId) {
      return res.status(400).json({ error: 'setupIntentId é obrigatório' });
    }

    console.log('🔄 Confirmando pagamento para SetupIntent:', setupIntentId);

    // ✅ VERIFICAR: Status do SetupIntent
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    if (setupIntent.status === 'succeeded') {
      console.log('✅ SetupIntent já confirmado');
      res.json({
        success: true,
        message: 'Pagamento já foi confirmado',
        setupIntent: {
          id: setupIntent.id,
          status: setupIntent.status
        }
      });
    } else if (setupIntent.status === 'requires_action') {
      console.log('⚠️ SetupIntent requer ação adicional');
      res.json({
        success: false,
        requires_action: true,
        setupIntent: {
          id: setupIntent.id,
          status: setupIntent.status,
          next_action: setupIntent.next_action
        }
      });
    } else {
      console.log('❌ SetupIntent com status inesperado:', setupIntent.status);
      res.status(400).json({
        error: `SetupIntent com status inválido: ${setupIntent.status}`
      });
    }

  } catch (error) {
    console.error('❌ Erro ao confirmar pagamento:', error);
    res.status(500).json({
      error: `Falha ao confirmar pagamento: ${error.message}`
    });
  }
};

// ✅ OBTER STATUS DA ASSINATURA
const getSubscriptionStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório' });
    }

    // ✅ IMPLEMENTAR: Lógica para obter status da assinatura
    // Por enquanto, retornar mensagem de implementação pendente
    res.json({
      message: 'Funcionalidade de status da assinatura será implementada em breve',
      userId
    });

  } catch (error) {
    console.error('❌ Erro ao obter status da assinatura:', error);
    res.status(500).json({
      error: `Falha ao obter status: ${error.message}`
    });
  }
};

module.exports = {
  signupWithPlan,
  confirmPayment,
  getSubscriptionStatus
}; 