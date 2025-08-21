// Carregar variáveis de ambiente do arquivo .env no diretório src/
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// Validar se a chave do Stripe está disponível
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY não está configurada no arquivo .env do diretório src/');
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../utils/logger');

// Configuração dos planos disponíveis (IDs atualizados para produção)
const PLANS = {
  BASIC: {
    name: 'Plano Básico',
    description: 'Ideal para pequenos negócios',
    prices: {
      monthly: {
        priceId: 'price_1RxYwzH8jGtRbIKFzM62Xmkj',
        amount: 10000, // R$ 100,00
        interval: 'month',
        intervalCount: 1
      },
      semiannual: {
        priceId: 'price_1RxYwzH8jGtRbIKFNdCDRlrr',
        amount: 9500, // R$ 95,00
        interval: 'month',
        intervalCount: 6,
        discount: '5%'
      },
      annual: {
        priceId: 'price_1RxYwzH8jGtRbIKFOZFuYVGV',
        amount: 9000, // R$ 90,00
        interval: 'year',
        intervalCount: 1,
        discount: '10%'
      }
    },
    productId: 'prod_StLe32rSb1vwni',
    features: [
      'Até 50 consultas mensais',
      'Relatórios básicos',
      'Suporte por email',
      'Dashboard simples'
    ]
  },
  PRO: {
    name: 'Plano Pro',
    description: 'Perfeito para empresas em crescimento',
    prices: {
      monthly: {
        priceId: 'price_1RxgK6H8jGtRbIKF79rax6aZ',
        amount: 29999, // R$ 299,99
        interval: 'month',
        intervalCount: 1
      },
      semiannual: {
        priceId: 'price_1RxgLiH8jGtRbIKFjjtdhuQ4',
        amount: 28999, // R$ 289,99
        interval: 'month',
        intervalCount: 6,
        discount: '3.3%'
      },
      annual: {
        priceId: 'price_1RxgLiH8jGtRbIKFSdpy1d3E',
        amount: 27499, // R$ 274,99
        interval: 'year',
        intervalCount: 1,
        discount: '8.3%'
      }
    },
    productId: 'prod_StTGwa0T0ZPLjJ',
    features: [
      'Consultas ilimitadas',
      'Notificações em tempo real',
      'Relatórios avançados',
      'Suporte prioritário',
      'API de integração',
      'Múltiplos usuários'
    ]
  },
  PREMIUM: {
    name: 'Plano Premium',
    description: 'Solução completa para grandes empresas',
    prices: {
      monthly: {
        priceId: 'price_1RxgMnH8jGtRbIKFO9Ictegk',
        amount: 49999, // R$ 499,99
        interval: 'month',
        intervalCount: 1
      },
      semiannual: {
        priceId: 'price_1RxgNdH8jGtRbIKFugHg15Dv',
        amount: 48999, // R$ 489,99
        interval: 'month',
        intervalCount: 6,
        discount: '2%'
      },
      annual: {
        priceId: 'price_1RxgNdH8jGtRbIKFsVrqDeHq',
        amount: 44999, // R$ 449,99
        interval: 'year',
        intervalCount: 1,
        discount: '10%'
      }
    },
    productId: 'prod_StTJjcT9YTpvCz',
    features: [
      'Todas as funcionalidades Pro',
      'API dedicada',
      'Integração personalizada',
      'Gerente de conta dedicado',
      'SLA garantido',
      'Treinamento personalizado',
      'Suporte 24/7'
    ]
  }
};

class StripeService {
  /**
   * Cria um cliente no Stripe
   */
  async createCustomer(email, name, metadata = {}) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          source: 'fgts_agent',
          ...metadata
        }
      });

      logger.info(`Cliente Stripe criado: ${customer.id} para ${email}`);
      return customer;
    } catch (error) {
      logger.error('Erro ao criar cliente no Stripe:', error);
      throw new Error(`Falha ao criar cliente: ${error.message}`);
    }
  }

  /**
   * Cria um link de pagamento para um plano específico
   */
  async createPaymentLink(planType, customerEmail, metadata = {}) {
    try {
      const plan = PLANS[planType.toUpperCase()];
      if (!plan) {
        throw new Error('Plano não encontrado');
      }

      // Usar preço mensal como padrão
      const defaultPrice = plan.prices.monthly;

      const paymentLink = await stripe.paymentLinks.create({
        line_items: [{
          price: defaultPrice.priceId,
          quantity: 1,
        }],
        customer_creation: 'always',
        metadata: {
          plan: planType,
          customerEmail,
          ...metadata
        },
        after_completion: {
          type: 'redirect',
          redirect: {
            url: `${process.env.APP_URL}/payment/success?plan=${planType}`
          }
        }
      });

      logger.info(`Link de pagamento criado: ${paymentLink.id} para plano ${planType}`);
      return paymentLink;
    } catch (error) {
      logger.error('Erro ao criar link de pagamento:', error);
      throw new Error(`Falha ao criar link de pagamento: ${error.message}`);
    }
  }

  /**
   * Cria um Payment Intent para checkout nativo
   */
  async createPaymentIntent(planType, customerEmail, metadata = {}, interval = 'monthly') {
    try {
      const plan = PLANS[planType.toUpperCase()];
      if (!plan) {
        throw new Error('Plano não encontrado');
      }

      const priceConfig = plan.prices[interval];
      if (!priceConfig) {
        throw new Error(`Intervalo de pagamento '${interval}' não suportado para este plano`);
      }

      // ✅ CONFIGURAÇÃO LIMPA: Apenas parâmetros válidos e necessários
      const paymentIntentData = {
        amount: priceConfig.amount,
        currency: 'brl',
        capture_method: 'automatic',
        metadata: {
          plan: planType,
          interval: interval,
          customerEmail,
          source: 'web_checkout',
          user_agent: 'fgtsagent_web',
          ...metadata
        },
        description: `Assinatura ${plan.name} - ${interval}`,
        receipt_email: customerEmail
        // ✅ NOTA: confirm e return_url serão configurados na confirmação
        // quando o frontend enviar o PaymentMethod ID real
      };

      console.log('🔍 Criando PaymentIntent com configuração anti-fraude:', paymentIntentData);

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

      logger.info(`Payment Intent criado: ${paymentIntent.id} para plano ${planType} (${interval})`);
      
      return {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      };
    } catch (error) {
      logger.error('Erro ao criar Payment Intent:', error);
      throw new Error(`Falha ao criar Payment Intent: ${error.message}`);
    }
  }

  /**
   * Captura um Payment Intent confirmado
   */
  async capturePaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
      
      logger.info(`Payment Intent capturado: ${paymentIntent.id}`);
      
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customer_email: paymentIntent.customer_email,
        metadata: paymentIntent.metadata
      };
    } catch (error) {
      logger.error('Erro ao capturar Payment Intent:', error);
      throw new Error(`Falha ao capturar pagamento: ${error.message}`);
    }
  }

  /**
   * Obtém detalhes de um Payment Intent
   */
  async getPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customer_email: paymentIntent.customer_email,
        metadata: paymentIntent.metadata,
        client_secret: paymentIntent.client_secret
      };
    } catch (error) {
      logger.error('Erro ao obter Payment Intent:', error);
      throw new Error(`Falha ao obter pagamento: ${error.message}`);
    }
  }

  /**
   * Cria uma sessão de checkout
   */
  async createCheckoutSession(planType, customerEmail, successUrl, cancelUrl, metadata = {}, interval = 'monthly') {
    try {
      const plan = PLANS[planType.toUpperCase()];
      if (!plan) {
        throw new Error('Plano não encontrado');
      }

      const priceConfig = plan.prices[interval];
      if (!priceConfig) {
        throw new Error(`Intervalo de pagamento '${interval}' não suportado para este plano`);
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: priceConfig.priceId,
          quantity: 1,
        }],
        mode: 'subscription',
        customer_email: customerEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          plan: planType,
          interval: interval,
          customerEmail,
          ...metadata
        },
        locale: 'pt-BR',
        subscription_data: {
          metadata: {
            plan: planType,
            interval: interval,
            customerEmail
          }
        }
      });

      logger.info(`Sessão de checkout criada: ${session.id} para plano ${planType} (${interval})`);
      return session;
    } catch (error) {
      logger.error('Erro ao criar sessão de checkout:', error);
      throw new Error(`Falha ao criar sessão de checkout: ${error.message}`);
    }
  }

  /**
   * Verifica o status de um pagamento
   */
  async getPaymentStatus(sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      return {
        status: session.payment_status,
        customerEmail: session.customer_email,
        metadata: session.metadata,
        paymentIntent: session.payment_intent
      };
    } catch (error) {
      logger.error('Erro ao verificar status do pagamento:', error);
      throw new Error(`Falha ao verificar pagamento: ${error.message}`);
    }
  }

  /**
   * Processa webhook do Stripe
   */
  async processWebhook(body, signature) {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      logger.info(`Webhook recebido: ${event.type}`);

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        case 'payment_intent.requires_action':
          await this.handlePaymentRequiresAction(event.data.object);
          break;
        case 'payment_intent.processing':
          await this.handlePaymentProcessing(event.data.object);
          break;
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        default:
          logger.info(`Evento não tratado: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      logger.error('Erro ao processar webhook:', error);
      throw new Error(`Falha no webhook: ${error.message}`);
    }
  }

  /**
   * Trata checkout completado
   */
  async handleCheckoutCompleted(session) {
    try {
      logger.info(`Checkout completado: ${session.id}`);
      
      // Aqui você pode atualizar o banco de dados
      // com as informações da compra do usuário
      const metadata = session.metadata;
      
      // Implementar lógica para ativar o plano do usuário
      // Por exemplo, atualizar tabela de usuários ou assinaturas
      
      return true;
    } catch (error) {
      logger.error('Erro ao processar checkout completado:', error);
      throw error;
    }
  }

  /**
   * Trata pagamento bem-sucedido
   */
  async handlePaymentSucceeded(paymentIntent) {
    try {
      logger.info(`Pagamento bem-sucedido: ${paymentIntent.id}`);
      
      // Implementar lógica para confirmar ativação do plano
      
      return true;
    } catch (error) {
      logger.error('Erro ao processar pagamento bem-sucedido:', error);
      throw error;
    }
  }

  /**
   * Trata falha no pagamento
   */
  async handlePaymentFailed(paymentIntent) {
    try {
      logger.info(`Falha no pagamento: ${paymentIntent.id}`);
      
      // Implementar lógica para lidar com falha no pagamento
      
      return true;
    } catch (error) {
      logger.error('Erro ao processar falha no pagamento:', error);
      throw error;
    }
  }

  /**
   * Trata PaymentIntent que requer ação (3D Secure)
   */
  async handlePaymentRequiresAction(paymentIntent) {
    try {
      logger.info(`PaymentIntent ${paymentIntent.id} requer ação (3D Secure)`);
      
      // ✅ PRODUÇÃO: Log detalhado para debugging
      console.log('🔍 PaymentIntent requer ação:', {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        customer_email: paymentIntent.customer_email,
        metadata: paymentIntent.metadata
      });
      
      // ✅ PRODUÇÃO: Aqui você pode implementar notificação ao usuário
      // ou atualizar o status no banco de dados
      
    } catch (error) {
      logger.error('Erro ao processar PaymentIntent que requer ação:', error);
    }
  }

  /**
   * Trata PaymentIntent em processamento
   */
  async handlePaymentProcessing(paymentIntent) {
    try {
      logger.info(`PaymentIntent ${paymentIntent.id} em processamento`);
      
      // ✅ PRODUÇÃO: Log para acompanhar pagamentos pendentes
      console.log('⏳ PaymentIntent em processamento:', {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount
      });
      
    } catch (error) {
      logger.error('Erro ao processar PaymentIntent em processamento:', error);
    }
  }

  /**
   * Trata criação de assinatura
   */
  async handleSubscriptionCreated(subscription) {
    try {
      logger.info(`Assinatura criada: ${subscription.id}`);
      
      // Implementar lógica para ativar recursos do usuário
      
      return true;
    } catch (error) {
      logger.error('Erro ao processar criação de assinatura:', error);
      throw error;
    }
  }

  /**
   * Trata atualização de assinatura
   */
  async handleSubscriptionUpdated(subscription) {
    try {
      logger.info(`Assinatura atualizada: ${subscription.id}`);
      
      // Implementar lógica para atualizar recursos do usuário
      
      return true;
    } catch (error) {
      logger.error('Erro ao processar atualização de assinatura:', error);
      throw error;
    }
  }

  /**
   * Trata cancelamento de assinatura
   */
  async handleSubscriptionDeleted(subscription) {
    try {
      logger.info(`Assinatura cancelada: ${subscription.id}`);
      
      // Implementar lógica para desativar recursos do usuário
      
      return true;
    } catch (error) {
      logger.error('Erro ao processar cancelamento de assinatura:', error);
      throw error;
    }
  }

  /**
   * Lista todos os planos disponíveis
   */
  getAvailablePlans() {
    return Object.entries(PLANS).map(([key, plan]) => ({
      id: key.toLowerCase(),
      name: plan.name,
      description: plan.description,
      features: plan.features,
      prices: Object.entries(plan.prices).map(([interval, price]) => ({
        interval: interval,
        priceId: price.priceId,
        amount: price.amount,
        amountFormatted: `R$ ${(price.amount / 100).toFixed(2).replace('.', ',')}`,
        intervalText: this.getIntervalText(price.interval, price.intervalCount),
        discount: price.discount || null
      }))
    }));
  }

  /**
   * Obtém informações de um plano específico
   */
  getPlanInfo(planType, interval = 'monthly') {
    console.log('🔍 getPlanInfo chamado com:', { planType, interval });
    console.log('🔍 PLANS disponíveis:', Object.keys(PLANS));
    
    const planKey = planType.toUpperCase();
    console.log('🔍 Procurando plano com chave:', planKey);
    
    const plan = PLANS[planKey];
    if (!plan) {
      console.log('❌ Plano não encontrado para chave:', planKey);
      throw new Error(`Plano ${planType} não encontrado`);
    }
    
    console.log('✅ Plano encontrado:', plan.name);
    console.log('🔍 Preços disponíveis:', Object.keys(plan.prices));
    
    const priceConfig = plan.prices[interval];
    if (!priceConfig) {
      console.log('❌ Intervalo não encontrado:', interval);
      throw new Error(`Intervalo de pagamento '${interval}' não suportado para este plano`);
    }
    
    console.log('✅ Configuração de preço encontrada:', priceConfig);
    
    return {
      id: planType.toLowerCase(),
      name: plan.name,
      description: plan.description,
      price: priceConfig.amount,
      priceFormatted: `R$ ${(priceConfig.amount / 100).toFixed(2).replace('.', ',')}`,
      interval: interval,
      intervalText: this.getIntervalText(priceConfig.interval, priceConfig.intervalCount),
      discount: priceConfig.discount,
      features: plan.features,
      priceId: priceConfig.priceId,
      // Adicionar todos os preços disponíveis para o frontend
      prices: Object.entries(plan.prices).map(([priceInterval, price]) => ({
        interval: priceInterval,
        priceId: price.priceId,
        amount: price.amount,
        amountFormatted: `R$ ${(price.amount / 100).toFixed(2).replace('.', ',')}`,
        intervalText: this.getIntervalText(price.interval, price.intervalCount),
        discount: price.discount || null
      }))
    };
  }

  /**
   * Obtém todos os preços de um plano específico
   */
  getPlanPrices(planType) {
    const plan = PLANS[planType.toUpperCase()];
    if (!plan) {
      throw new Error('Plano não encontrado');
    }

    return {
      id: planType.toLowerCase(),
      name: plan.name,
      description: plan.description,
      features: plan.features,
      prices: Object.entries(plan.prices).map(([interval, price]) => ({
        interval: interval,
        priceId: price.priceId,
        amount: price.amount,
        amountFormatted: `R$ ${(price.amount / 100).toFixed(2).replace('.', ',')}`,
        intervalText: this.getIntervalText(price.interval, price.intervalCount),
        discount: price.discount || null
      }))
    };
  }

  /**
   * Converte configuração de intervalo em texto legível
   */
  getIntervalText(interval, count) {
    if (interval === 'month') {
      if (count === 1) return 'por mês';
      if (count === 6) return 'a cada 6 meses';
      return `a cada ${count} meses`;
    }
    if (interval === 'year') {
      if (count === 1) return 'por ano';
      return `a cada ${count} anos`;
    }
    return `a cada ${count} ${interval}`;
  }

  /**
   * Cria um cupom de desconto
   */
  async createCoupon(code, discountPercent, duration = 'once') {
    try {
      const coupon = await stripe.coupons.create({
        id: code,
        percent_off: discountPercent,
        duration: duration,
        name: `Desconto de ${discountPercent}%`
      });

      logger.info(`Cupom criado: ${coupon.id}`);
      return coupon;
    } catch (error) {
      logger.error('Erro ao criar cupom:', error);
      throw new Error(`Falha ao criar cupom: ${error.message}`);
    }
  }

  /**
   * Cria E confirma um PaymentIntent em uma operação
   * ✅ FLUXO CORRETO: PaymentMethod criado no frontend, PaymentIntent criado E confirmado no backend
   */
  async createAndConfirmPaymentIntent(planType, customerEmail, paymentMethodId, metadata = {}, interval = 'monthly') {
    try {
      const plan = PLANS[planType.toUpperCase()];
      if (!plan) {
        throw new Error('Plano não encontrado');
      }

      const priceConfig = plan.prices[interval];
      if (!priceConfig) {
        throw new Error(`Intervalo de pagamento '${interval}' não suportado para este plano`);
      }
      
      // ✅ VALIDAÇÃO: Verificar se o preço está configurado corretamente
      if (!priceConfig.amount || priceConfig.amount <= 0) {
        throw new Error(`Valor do plano ${planType} (${interval}) não está configurado corretamente`);
      }
      
      console.log('🔍 Configuração de preço validada:', {
        planType,
        interval,
        amount: priceConfig.amount,
        amountFormatted: `R$ ${(priceConfig.amount / 100).toFixed(2)}`,
        priceId: priceConfig.priceId
      });

      // ✅ CONFIGURAÇÃO CORRETA: Criar E confirmar em uma operação
      const paymentIntentData = {
        amount: priceConfig.amount,
        currency: 'brl',
        capture_method: 'automatic',
        confirm: "true", // ✅ CONFIRMAR: Imediatamente após criação (STRING)
        description: `Assinatura ${plan.name} - ${interval}`,
        metadata: {
          plan: planType,
          interval: interval,
          customerEmail,
          source: 'signup',
          userName: metadata.userName,
          user_agent: 'fgtsagent_web',
          ...metadata
        },
        payment_method: paymentMethodId, // ✅ MÉTODO: PaymentMethod criado no frontend
        receipt_email: customerEmail,
        return_url: `${process.env.APP_URL || 'http://localhost:3000'}/payment/return` // ✅ RETURN URL: Para 3D Secure
      };

      console.log('🔍 Criando E confirmando PaymentIntent:', {
        ...paymentIntentData,
        return_url: paymentIntentData.return_url,
        hasReturnUrl: !!paymentIntentData.return_url,
        appUrl: process.env.APP_URL,
        timestamp: new Date().toISOString()
      });
      
      // ✅ DEBUG: Verificar payload exato sendo enviado para o Stripe
      console.log('📤 PAYLOAD EXATO para Stripe:', JSON.stringify(paymentIntentData, null, 2));
      
      // ✅ DEBUG: Verificar configuração do plano
      console.log('🔍 Configuração do plano:', {
        planType,
        interval,
        planName: plan.name,
        amount: priceConfig.amount,
        amountFormatted: `R$ ${(priceConfig.amount / 100).toFixed(2)}`,
        priceId: priceConfig.priceId
      });

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

      logger.info(`PaymentIntent criado E confirmado: ${paymentIntent.id} para plano ${planType} (${interval})`);
      
      // ✅ PROCESSAR: Resultado da criação E confirmação
      if (paymentIntent.status === 'requires_action') {
        logger.info('⚠️ PaymentIntent requer ação adicional (3D Secure):', {
          id: paymentIntent.id,
          nextAction: paymentIntent.next_action?.type,
          redirectUrl: paymentIntent.next_action?.redirect_to_url?.url,
          timestamp: new Date().toISOString()
        });
        
        // ✅ DEBUG: Log detalhado para 3D Secure
        console.log('🔍 3D Secure - Next Action completo:', {
          type: paymentIntent.next_action?.type,
          redirectUrl: paymentIntent.next_action?.redirect_to_url?.url,
          returnUrl: paymentIntent.next_action?.redirect_to_url?.return_url
        });
        
        return {
          ...paymentIntent,
          requiresAction: true,
          nextAction: paymentIntent.next_action
        };
      }

      if (paymentIntent.status === 'succeeded') {
        logger.info('🎉 PaymentIntent confirmado com sucesso:', {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          timestamp: new Date().toISOString()
        });
      }

      return {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === 'requires_action',
        nextAction: paymentIntent.next_action
      };
    } catch (error) {
      logger.error('Erro ao criar E confirmar PaymentIntent:', error);
      throw new Error(`Falha ao criar E confirmar PaymentIntent: ${error.message}`);
    }
  }

  /**
   * Confirma um PaymentIntent no backend (MAIS SEGURO)
   * Usa a chave secreta para máxima segurança
   */
  async confirmPaymentIntent(paymentIntentId, paymentMethodId = null) {
    try {
      // ✅ VALIDAÇÃO: Verificar se os parâmetros estão corretos
      if (!paymentIntentId) {
        throw new Error('paymentIntentId é obrigatório');
      }
      
      if (!paymentMethodId) {
        throw new Error('paymentMethodId é obrigatório para confirmação');
      }
      
      logger.info('🔐 Confirmando PaymentIntent no backend:', {
        paymentIntentId,
        paymentMethodId,
        hasPaymentMethod: !!paymentMethodId,
        timestamp: new Date().toISOString()
      });

      // ✅ OBTER: PaymentIntent atual
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      logger.info('📋 Status atual do PaymentIntent:', {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        timestamp: new Date().toISOString()
      });

      // ✅ VALIDAR: Status antes da confirmação
      if (paymentIntent.status === 'succeeded') {
        logger.info('✅ PaymentIntent já foi confirmado:', paymentIntent.id);
        return paymentIntent;
      }

      if (paymentIntent.status === 'canceled') {
        throw new Error('PaymentIntent foi cancelado e não pode ser confirmado');
      }

      // ✅ CONFIRMAR: PaymentIntent com método de pagamento + return_url
      const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
        return_url: `${process.env.APP_URL || 'http://localhost:3000'}/payment/return`
      });
      
      logger.info('✅ PaymentIntent confirmado com método de pagamento:', {
        id: confirmedIntent.id,
        status: confirmedIntent.status,
        paymentMethod: paymentMethodId,
        timestamp: new Date().toISOString()
      });

      // ✅ PROCESSAR: Resultado da confirmação
      if (confirmedIntent.status === 'requires_action') {
        logger.info('⚠️ PaymentIntent requer ação adicional (3D Secure):', {
          id: confirmedIntent.id,
          nextAction: confirmedIntent.next_action?.type,
          timestamp: new Date().toISOString()
        });
        
        return {
          ...confirmedIntent,
          requiresAction: true,
          nextAction: confirmedIntent.next_action
        };
      }

      if (confirmedIntent.status === 'succeeded') {
        logger.info('🎉 PaymentIntent confirmado com sucesso:', {
          id: confirmedIntent.id,
          amount: confirmedIntent.amount,
          currency: confirmedIntent.currency,
          timestamp: new Date().toISOString()
        });
        
        // ✅ WEBHOOK: Processar eventos de sucesso
        await this.processWebhook({
          type: 'payment_intent.succeeded',
          data: {
            object: confirmedIntent
          }
        });
      }

      return confirmedIntent;

    } catch (error) {
      logger.error('❌ Erro ao confirmar PaymentIntent:', {
        paymentIntentId,
        error: error.message,
        type: error.type,
        code: error.code,
        timestamp: new Date().toISOString()
      });

      // ✅ PROPAGAR: Erro específico do Stripe
      throw error;
    }
  }

  /**
   * Verifica se um cupom é válido
   */
  async validateCoupon(code) {
    try {
      const coupon = await stripe.coupons.retrieve(code);
      
      return {
        valid: coupon.valid,
        percentOff: coupon.percent_off,
        amountOff: coupon.amount_off,
        duration: coupon.duration
      };
    } catch (error) {
      logger.error('Erro ao validar cupom:', error);
      return { valid: false };
    }
  }
}

module.exports = new StripeService(); 