const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Configurar cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class TokenBillingService {
  constructor() {
    // Limites dinâmicos - R$ 100 a cada 8M tokens após os primeiros 8M
    this.baseLimit = 8000000; // 8M tokens inclusos
    this.tierSize = 8000000; // 8M tokens por faixa
    this.tierAmount = 10000; // R$ 100 em centavos
  }

  /**
   * Calcular faixa de cobrança baseada no uso de tokens
   * Agora usa limite dinâmico baseado no valor cobrado
   */
  calculateBillingTier(tokensUsed, dynamicLimit = null) {
    const limit = dynamicLimit || this.baseLimit;
    
    if (tokensUsed <= limit) {
      return `0-${limit/1000000}M`;
    }
    
    const excessTokens = tokensUsed - limit;
    const tierNumber = Math.floor(excessTokens / this.tierSize) + 1;
    const tierStart = limit + (tierNumber - 1) * this.tierSize;
    const tierEnd = limit + tierNumber * this.tierSize;
    
    return `${tierStart/1000000}M-${tierEnd/1000000}M`;
  }

  /**
   * Obter todos os limites que devem ser cobrados para um dado uso de tokens
   * Cobrança imediata quando excede pelo menos 1 token além do limite
   */
  getTierLimitsToCharge(tokensUsed, dynamicLimit = null) {
    const limit = dynamicLimit || this.baseLimit;
    
    if (tokensUsed <= limit) {
      return [];
    }

    const excessTokens = tokensUsed - limit;
    const limits = [];

    // Cobrar R$ 100 imediatamente quando excede o limite (mesmo que seja apenas 1 token)
    if (excessTokens > 0) {
      // Calcular quantas faixas de 8M foram excedidas
      const tiersExceeded = Math.ceil(excessTokens / this.tierSize);
      
      for (let i = 1; i <= tiersExceeded; i++) {
        const tierLimit = limit + i * this.tierSize;
        limits.push({
          tierLimit,
          tier: this.calculateBillingTier(tierLimit, limit),
          amount: this.tierAmount,
          description: `Excedeu ${tierLimit/1000000}M tokens - Cobrança adicional de R$ 100`
        });
      }
    }

    return limits;
  }

  /**
   * Criar subscription mensal com taxa fixa de R$ 400
   */
  async createMonthlySubscription(customerId) {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'Taxa Fixa Mensal - Tokens',
              description: 'Taxa fixa de R$ 400 que inclui até 4 milhões de tokens'
            },
            unit_amount: 40000, // R$ 400 em centavos
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1
        }],
        billing_cycle_anchor: this.getNextMonthStart(),
        metadata: {
          type: 'monthly_fixed_fee',
          tokens_included: 4000000
        }
      });

      logger.info('Monthly subscription created', {
        customerId,
        subscriptionId: subscription.id,
        amount: 40000
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to create monthly subscription', {
        error: error.message,
        customerId
      });
      throw error;
    }
  }

  /**
   * Processar uso de tokens (estrutura simplificada)
   */
  async processTokenUsage(clientId, tokensUsed) {
    try {
      // Registrar consumo de tokens no Supabase (estrutura simplificada)
      const consumptionId = await this.recordTokenConsumption(clientId, tokensUsed);

      // Obter resumo atual do cliente (consolidado)
      const summary = await this.getClientTokenSummary(clientId);
      
      // Verificar se precisa cobrar por faixas
      const tierCharges = await this.checkAndProcessTierCharges(clientId, summary.total_tokens);

      logger.info('Token usage processed', {
        clientId,
        consumptionId,
        tokensUsed,
        totalTokens: summary.total_tokens,
        totalResponses: summary.total_responses,
        tierCharges: tierCharges.length
      });

      return {
        consumptionId,
        totalTokens: summary.total_tokens,
        totalResponses: summary.total_responses,
        averageTokensPerResponse: summary.average_tokens_per_response,
        tierCharges
      };

    } catch (error) {
      logger.error('Failed to process token usage', {
        error: error.message,
        clientId,
        tokensUsed
      });
      throw error;
    }
  }

  /**
   * Cobrar por faixa específica
   */
  async chargeForTier(customerId, amount, description) {
    try {
      // Usar o preço específico para teste com customer que tem método de pagamento
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 100, // R$ 1,00
        currency: 'brl',
        customer: customerId,
        description: `${description} (Teste - R$ 1,00)`,
        payment_method: 'pm_1S6dagH8jGtRbIKFjoX59Ice', // PaymentMethod do customer
        confirm: true,
        off_session: true,
        metadata: {
          type: 'tier_charge',
          original_amount: amount,
          timestamp: new Date().toISOString(),
          customerId,
          test_mode: 'true'
        }
      });

      logger.info('Tier charge created', {
        customerId,
        paymentIntentId: paymentIntent.id,
        amount,
        description,
        status: paymentIntent.status
      });

      return paymentIntent;
    } catch (error) {
      logger.error('Failed to charge for tier', {
        error: error.message,
        customerId,
        amount,
        description
      });
      throw error;
    }
  }

  /**
   * Obter dados de cobrança do cliente
   */
  async getCustomerBillingData(customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      return customer.metadata || {};
    } catch (error) {
      logger.error('Failed to get customer billing data', {
        error: error.message,
        customerId
      });
      return {};
    }
  }

  /**
   * Atualizar status de cobrança do cliente
   */
  async updateCustomerChargedStatus(customerId, field, value) {
    try {
      const customer = await stripe.customers.update(customerId, {
        metadata: {
          [field]: value
        }
      });

      logger.info('Customer billing status updated', {
        customerId,
        field,
        value
      });

      return customer;
    } catch (error) {
      logger.error('Failed to update customer charged status', {
        error: error.message,
        customerId,
        field,
        value
      });
      throw error;
    }
  }

  /**
   * Atualizar uso total de tokens do cliente
   */
  async updateCustomerTokenUsage(customerId, tokensUsed) {
    try {
      const customer = await stripe.customers.update(customerId, {
        metadata: {
          total_tokens_used: tokensUsed,
          last_usage_update: new Date().toISOString()
        }
      });

      return customer;
    } catch (error) {
      logger.error('Failed to update customer token usage', {
        error: error.message,
        customerId,
        tokensUsed
      });
      throw error;
    }
  }

  /**
   * Resetar cobranças no início do novo período
   */
  async resetBillingCycle(customerId) {
    try {
      const resetData = {
        charged_4000000: false,
        charged_12000000: false,
        charged_20000000: false,
        total_tokens_used: 0,
        billing_cycle_reset: new Date().toISOString()
      };

      await stripe.customers.update(customerId, {
        metadata: resetData
      });

      logger.info('Billing cycle reset', {
        customerId,
        resetData
      });

      return resetData;
    } catch (error) {
      logger.error('Failed to reset billing cycle', {
        error: error.message,
        customerId
      });
      throw error;
    }
  }

  /**
   * Calcular próximo início de mês
   */
  getNextMonthStart() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.floor(nextMonth.getTime() / 1000);
  }

  /**
   * Registrar consumo de tokens no Supabase (estrutura simplificada)
   */
  async recordTokenConsumption(clientId, tokensUsed) {
    try {
      const { data, error } = await supabase.rpc('record_token_consumption', {
        p_client_id: clientId,
        p_tokens_used: tokensUsed
      });

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      return data;
    } catch (error) {
      logger.error('Failed to record token consumption', {
        error: error.message,
        clientId,
        tokensUsed
      });
      throw error;
    }
  }

  /**
   * Obter resumo de uso do usuário
   */
  async getUserTokenSummary(userId, periodStart = null) {
    try {
      const { data, error } = await supabase.rpc('get_user_token_summary', {
        p_user_id: userId,
        p_period_start: periodStart || new Date().toISOString().split('T')[0] + 'T00:00:00Z'
      });

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      return data[0] || {
        total_tokens: 0,
        current_tier: '0-8M',
        fixed_fee_charged: 0,
        tier_charges_count: 0,
        tier_charges_total: 0,
        total_charged: 0
      };
    } catch (error) {
      logger.error('Failed to get user token summary', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Obter resumo consolidado de uso por cliente
   * Agora usa período baseado na data da assinatura
   */
  async getClientTokenSummary(clientId, periodStart = null) {
    try {
      const { data, error } = await supabase.rpc('get_client_token_summary', {
        p_client_id: clientId,
        p_period_start: periodStart || null // Se null, calcula baseado na data da assinatura
      });

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      return data[0] || {
        client_id: clientId,
        total_tokens: 0,
        total_responses: 0,
        average_tokens_per_response: 0,
        current_tier: '0-8M',
        fixed_fee_charged: 0,
        tier_charges_total: 0,
        total_charged: 0,
        last_response_at: null,
        billing_period_start: null,
        billing_period_end: null,
        subscription_start_day: 1
      };
    } catch (error) {
      logger.error('Failed to get client token summary', {
        error: error.message,
        clientId
      });
      throw error;
    }
  }

  /**
   * Definir data de início da assinatura para um cliente
   * Isso define o dia do mês em que o período de cobrança deve começar
   */
  async setSubscriptionStartDay(clientId, startDay) {
    try {
      // Validar dia (1-31)
      if (startDay < 1 || startDay > 31) {
        throw new Error('Dia de início da assinatura deve estar entre 1 e 31');
      }

      // Calcular período baseado no dia da assinatura
      const { data: periodData, error: periodError } = await supabase.rpc('calculate_billing_period', {
        subscription_day: startDay
      });

      if (periodError) {
        throw new Error(`Erro ao calcular período: ${periodError.message}`);
      }

      const period = periodData[0];
      if (!period) {
        throw new Error('Período não calculado corretamente');
      }

      // Atualizar ou inserir resumo com o dia da assinatura
      const { data, error } = await supabase
        .from('token_usage_summary')
        .upsert({
          client_id: clientId,
          subscription_start_day: startDay,
          billing_period_start: period.period_start,
          billing_period_end: period.period_end,
          total_tokens_used: 0,
          total_responses: 0,
          average_tokens_per_response: 0,
          fixed_fee_charged: 0,
          tier_charges_total: 0,
          total_amount_charged: 0,
          status: 'active'
        }, {
          onConflict: 'client_id,billing_period_start'
        })
        .select();

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      logger.info('Subscription start day set', {
        clientId,
        startDay
      });

      return data[0];
    } catch (error) {
      logger.error('Failed to set subscription start day', {
        error: error.message,
        clientId,
        startDay
      });
      throw error;
    }
  }

  /**
   * Verificar e processar cobranças por faixas
   */
  async checkAndProcessTierCharges(clientId, totalTokens) {
    try {
      const tierCharges = [];
      
      // Buscar limite dinâmico do cliente
      const { data: summary } = await supabase
        .from('token_usage_summary')
        .select('dynamic_token_limit')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      const dynamicLimit = summary?.dynamic_token_limit || this.baseLimit;
      
      // Obter todos os limites que devem ser cobrados
      const limitsToCharge = this.getTierLimitsToCharge(totalTokens, dynamicLimit);
      
      for (const limitConfig of limitsToCharge) {
        // Verificar se já foi cobrado esta faixa
        const { data: existingCharge } = await supabase
          .from('token_billing_charges')
          .select('id')
          .eq('client_id', clientId)
          .eq('billing_tier', limitConfig.tier)
          .eq('status', 'succeeded')
          .single();

        if (!existingCharge) {
          // Buscar customer_id do Stripe
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('stripe_customer_id')
            .eq('id', clientId)
            .single();

          if (userProfile?.stripe_customer_id) {
            const paymentIntent = await this.chargeForTier(
              userProfile.stripe_customer_id, 
              limitConfig.amount, 
              limitConfig.description
            );

            // Registrar cobrança no Supabase
            const { data: chargeRecord } = await supabase
              .from('token_billing_charges')
              .insert({
                client_id: clientId,
                billing_tier: limitConfig.tier,
                tier_limit: limitConfig.tierLimit,
                tokens_used: totalTokens,
                amount_charged: limitConfig.amount,
                stripe_payment_intent_id: paymentIntent.id,
                stripe_customer_id: userProfile.stripe_customer_id,
                status: paymentIntent.status,
                charged_at: new Date().toISOString()
              })
              .select()
              .single();

            tierCharges.push(chargeRecord);
          }
        }
      }

      return tierCharges;
    } catch (error) {
      logger.error('Failed to check and process tier charges', {
        error: error.message,
        clientId,
        totalTokens
      });
      throw error;
    }
  }

  /**
   * Obter resumo de cobrança do cliente
   */
  async getBillingSummary(customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active'
      });

      const paymentIntents = await stripe.paymentIntents.list({
        customer: customerId,
        limit: 10
      });

      return {
        customer: {
          id: customer.id,
          email: customer.email,
          metadata: customer.metadata
        },
        subscriptions: subscriptions.data,
        recentCharges: paymentIntents.data.filter(pi => 
          pi.metadata?.type === 'tier_charge'
        )
      };
    } catch (error) {
      logger.error('Failed to get billing summary', {
        error: error.message,
        customerId
      });
      throw error;
    }
  }
}

module.exports = new TokenBillingService();
