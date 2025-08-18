// Carregar variáveis de ambiente do arquivo .env na raiz do projeto
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

// Validar se a chave do Stripe está disponível
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY não está configurada no arquivo .env da raiz do projeto');
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../utils/logger');

// Configuração dos planos disponíveis
const PLANS = {
  BASIC: {
    priceId: 'price_1RYdaBRrfRhcM17zE4rOKO9U',
    productId: 'prod_STalRE6RzVNTUu',
    name: 'Plano Básico',
    amount: 9999, // R$ 99,99
    features: [
      'Até 50 consultas mensais',
      'Relatórios básicos',
      'Suporte por email'
    ]
  },
  PRO: {
    priceId: 'price_1RYdaFRrfRhcM17zecmj0hhT',
    productId: 'prod_STalhjSBTyHza7',
    name: 'Plano Pro',
    amount: 19999, // R$ 199,99
    features: [
      'Consultas ilimitadas',
      'Notificações em tempo real',
      'Relatórios avançados',
      'Suporte prioritário'
    ]
  },
  PREMIUM: {
    priceId: 'price_1RYdaJRrfRhcM17zJsOCBmmi',
    productId: 'prod_STalNWvSe9GqRs',
    name: 'Plano Premium',
    amount: 49999, // R$ 499,99
    features: [
      'Todas as funcionalidades Pro',
      'API dedicada',
      'Integração personalizada',
      'Gerente de conta dedicado',
      'SLA garantido'
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

      const paymentLink = await stripe.paymentLinks.create({
        line_items: [{
          price: plan.priceId,
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
   * Cria uma sessão de checkout
   */
  async createCheckoutSession(planType, customerEmail, successUrl, cancelUrl, metadata = {}) {
    try {
      const plan = PLANS[planType.toUpperCase()];
      if (!plan) {
        throw new Error('Plano não encontrado');
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: plan.priceId,
          quantity: 1,
        }],
        mode: 'subscription',
        customer_email: customerEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          plan: planType,
          customerEmail,
          ...metadata
        },
        locale: 'pt-BR'
      });

      logger.info(`Sessão de checkout criada: ${session.id} para plano ${planType}`);
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
   * Lista todos os planos disponíveis
   */
  getAvailablePlans() {
    return Object.entries(PLANS).map(([key, plan]) => ({
      id: key.toLowerCase(),
      name: plan.name,
      price: plan.amount,
      priceFormatted: `R$ ${(plan.amount / 100).toFixed(2).replace('.', ',')}`,
      features: plan.features
    }));
  }

  /**
   * Obtém informações de um plano específico
   */
  getPlanInfo(planType) {
    const plan = PLANS[planType.toUpperCase()];
    if (!plan) {
      throw new Error('Plano não encontrado');
    }

    return {
      id: planType.toLowerCase(),
      name: plan.name,
      price: plan.amount,
      priceFormatted: `R$ ${(plan.amount / 100).toFixed(2).replace('.', ',')}`,
      features: plan.features
    };
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