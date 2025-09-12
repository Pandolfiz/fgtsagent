const logger = require('../utils/logger');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const TokenBillingService = require('./tokenBillingService');

class WebhookService {
  constructor() {
    this.supportedEvents = [
      'customer.subscription.created',
      'customer.subscription.trial_will_end',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'invoice.payment_action_required',
      'mandate.updated',
      'mandate.canceled',
      'payment_method.attached',
      'customer.subscription.paused'
    ];
  }

  /**
   * Processar evento do webhook
   */
  async handleEvent(event) {
    const eventType = event.type;
    const eventId = event.id;
    
    logger.info('Webhook event received', {
      eventType,
      eventId,
      timestamp: new Date().toISOString()
    });

    console.log(`🔔 Processando evento: ${eventType}`);

    // Verificar se o evento é suportado
    if (!this.supportedEvents.includes(eventType)) {
      logger.warn('Unsupported webhook event', { eventType, eventId });
      console.log(`⚠️ Evento não suportado: ${eventType}`);
      return;
    }

    try {
      switch (eventType) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;
        
        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object);
          break;
        
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        
        case 'invoice.payment_action_required':
          await this.handlePaymentActionRequired(event.data.object);
          break;
        
        case 'mandate.updated':
          await this.handleMandateUpdated(event.data.object);
          break;
        
        case 'mandate.canceled':
          await this.handleMandateCanceled(event.data.object);
          break;
        
        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event.data.object);
          break;
        
        case 'customer.subscription.paused':
          await this.handleSubscriptionPaused(event.data.object);
          break;
        
        default:
          logger.warn('Unhandled webhook event', { eventType, eventId });
          console.log(`⚠️ Evento não tratado: ${eventType}`);
      }

      logger.info('Webhook event processed successfully', {
        eventType,
        eventId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Webhook event processing failed', {
        eventType,
        eventId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      console.error(`❌ Erro ao processar evento ${eventType}:`, error);
      throw error;
    }
  }

  /**
   * Assinatura criada
   */
  async handleSubscriptionCreated(subscription) {
    try {
      console.log(`🚀 Assinatura criada: ${subscription.id}`);
      console.log(`👤 Customer: ${subscription.customer}`);
      console.log(`📋 Plano: ${subscription.metadata?.planType || 'N/A'}`);
      console.log(`🆓 Trial end: ${subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : 'N/A'}`);

      logger.info('Subscription created', {
        event: 'customer.subscription.created',
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        planType: subscription.metadata?.planType,
        trialEnd: subscription.trial_end,
        status: subscription.status,
        timestamp: new Date().toISOString()
      });

      // Salvar dados do Stripe no perfil do usuário
      await this.updateUserProfileWithStripeData(subscription);
      
      // Definir automaticamente o dia de início da assinatura para cobrança de tokens
      await this.setupTokenBillingForSubscription(subscription);
      
      // TODO: Implementar lógica de provisionamento de acesso
      // - Ativar conta do usuário
      // - Enviar email de boas-vindas
      // - Configurar permissões
      
    } catch (error) {
      console.error('❌ Erro ao processar subscription.created:', error);
      throw error;
    }
  }

  /**
   * Trial terminando em 3 dias
   */
  async handleTrialWillEnd(subscription) {
    try {
      console.log(`⚠️ Trial terminando para: ${subscription.id}`);
      console.log(`👤 Customer: ${subscription.customer}`);
      console.log(`📅 Trial end: ${new Date(subscription.trial_end * 1000).toISOString()}`);

      logger.info('Trial will end', {
        event: 'customer.subscription.trial_will_end',
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        trialEnd: subscription.trial_end,
        timestamp: new Date().toISOString()
      });

      // TODO: Implementar envio de email de aviso
      // - Notificar usuário sobre fim do trial
      // - Lembrar de verificar método de pagamento
      
    } catch (error) {
      console.error('❌ Erro ao processar trial_will_end:', error);
      throw error;
    }
  }

  /**
   * Assinatura atualizada
   */
  async handleSubscriptionUpdated(subscription) {
    try {
      console.log(`📝 Assinatura atualizada: ${subscription.id}`);
      console.log(`📊 Status: ${subscription.status}`);

      logger.info('Subscription updated', {
        event: 'customer.subscription.updated',
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        timestamp: new Date().toISOString()
      });

      // TODO: Implementar sincronização de status
      // - Atualizar status no banco de dados
      // - Notificar mudanças relevantes
      
    } catch (error) {
      console.error('❌ Erro ao processar subscription.updated:', error);
      throw error;
    }
  }

  /**
   * Assinatura cancelada
   */
  async handleSubscriptionDeleted(subscription) {
    try {
      console.log(`❌ Assinatura cancelada: ${subscription.id}`);
      console.log(`👤 Customer: ${subscription.customer}`);

      logger.info('Subscription deleted', {
        event: 'customer.subscription.deleted',
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        timestamp: new Date().toISOString()
      });

      // TODO: Implementar revogação de acesso
      // - Pausar conta do usuário
      // - Enviar email de cancelamento
      // - Limpar permissões
      
    } catch (error) {
      console.error('❌ Erro ao processar subscription.deleted:', error);
      throw error;
    }
  }

  /**
   * Pagamento realizado com sucesso
   */
  async handlePaymentSucceeded(invoice) {
    try {
      console.log(`✅ Pagamento realizado: ${invoice.id}`);
      console.log(`👤 Customer: ${invoice.customer}`);
      console.log(`💰 Amount: ${invoice.amount_paid} ${invoice.currency}`);

      logger.info('Payment succeeded', {
        event: 'invoice.payment_succeeded',
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        timestamp: new Date().toISOString()
      });

      // TODO: Implementar confirmação de acesso
      // - Reativar conta se estava pausada
      // - Enviar confirmação de pagamento
      // - Atualizar status de assinatura
      
    } catch (error) {
      console.error('❌ Erro ao processar payment_succeeded:', error);
      throw error;
    }
  }

  /**
   * Pagamento falhou
   */
  async handlePaymentFailed(invoice) {
    try {
      console.log(`❌ Pagamento falhou: ${invoice.id}`);
      console.log(`👤 Customer: ${invoice.customer}`);
      console.log(`💰 Amount: ${invoice.amount_due} ${invoice.currency}`);

      logger.info('Payment failed', {
        event: 'invoice.payment_failed',
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amount: invoice.amount_due,
        currency: invoice.currency,
        timestamp: new Date().toISOString()
      });

      // TODO: Implementar pausa de acesso
      // - Pausar conta do usuário
      // - Enviar notificação de falha
      // - Oferecer métodos alternativos
      
    } catch (error) {
      console.error('❌ Erro ao processar payment_failed:', error);
      throw error;
    }
  }

  /**
   * Ação requerida para pagamento (3DS, mandate)
   */
  async handlePaymentActionRequired(invoice) {
    try {
      console.log(`⚠️ Ação requerida para pagamento: ${invoice.id}`);
      console.log(`👤 Customer: ${invoice.customer}`);
      console.log(`🔒 Status: ${invoice.status}`);

      logger.info('Payment action required', {
        event: 'invoice.payment_action_required',
        invoiceId: invoice.id,
        customerId: invoice.customer,
        status: invoice.status,
        timestamp: new Date().toISOString()
      });

      // TODO: Implementar notificação de ação requerida
      // - Enviar email com link para autenticação
      // - Notificar sobre necessidade de ação
      
    } catch (error) {
      console.error('❌ Erro ao processar payment_action_required:', error);
      throw error;
    }
  }

  /**
   * Mandate atualizado
   */
  async handleMandateUpdated(mandate) {
    try {
      console.log(`📝 Mandate atualizado: ${mandate.id}`);
      console.log(`👤 Customer: ${mandate.customer}`);
      console.log(`📊 Status: ${mandate.status}`);

      logger.info('Mandate updated', {
        event: 'mandate.updated',
        mandateId: mandate.id,
        customerId: mandate.customer,
        status: mandate.status,
        timestamp: new Date().toISOString()
      });

      // TODO: Implementar verificação de status do mandate
      // - Verificar se mandate ainda é válido
      // - Atualizar status no banco de dados
      
    } catch (error) {
      console.error('❌ Erro ao processar mandate.updated:', error);
      throw error;
    }
  }

  /**
   * Mandate cancelado
   */
  async handleMandateCanceled(mandate) {
    try {
      console.log(`❌ Mandate cancelado: ${mandate.id}`);
      console.log(`👤 Customer: ${mandate.customer}`);

      logger.info('Mandate canceled', {
        event: 'mandate.canceled',
        mandateId: mandate.id,
        customerId: mandate.customer,
        timestamp: new Date().toISOString()
      });

      // TODO: Implementar pausa de assinatura
      // - Pausar assinatura relacionada
      // - Notificar usuário sobre cancelamento
      // - Solicitar novo mandate
      
    } catch (error) {
      console.error('❌ Erro ao processar mandate.canceled:', error);
      throw error;
    }
  }

  /**
   * Método de pagamento anexado
   */
  async handlePaymentMethodAttached(paymentMethod) {
    try {
      console.log(`💳 Método de pagamento anexado: ${paymentMethod.id}`);
      console.log(`👤 Customer: ${paymentMethod.customer}`);
      console.log(`🔒 Type: ${paymentMethod.type}`);

      logger.info('Payment method attached', {
        event: 'payment_method.attached',
        paymentMethodId: paymentMethod.id,
        customerId: paymentMethod.customer,
        type: paymentMethod.type,
        timestamp: new Date().toISOString()
      });

      // Salvar payment_method_id no perfil do usuário
      await this.updateUserProfileWithPaymentMethod(paymentMethod);
      
    } catch (error) {
      console.error('❌ Erro ao processar payment_method.attached:', error);
      throw error;
    }
  }

  /**
   * Assinatura pausada por falha
   */
  async handleSubscriptionPaused(subscription) {
    try {
      console.log(`⏸️ Assinatura pausada: ${subscription.id}`);
      console.log(`👤 Customer: ${subscription.customer}`);
      console.log(`📊 Status: ${subscription.status}`);

      logger.info('Subscription paused', {
        event: 'customer.subscription.paused',
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        timestamp: new Date().toISOString()
      });

      // TODO: Implementar notificação e alternativas
      // - Notificar cliente sobre pausa
      // - Oferecer métodos de pagamento alternativos
      // - Explicar como reativar
      
    } catch (error) {
      console.error('❌ Erro ao processar subscription.paused:', error);
      throw error;
    }
  }

  /**
   * Verificar se evento é suportado
   */
  isEventSupported(eventType) {
    return this.supportedEvents.includes(eventType);
  }

  /**
   * Configurar cobrança de tokens para nova assinatura
   */
  async setupTokenBillingForSubscription(subscription) {
    try {
      const customerId = subscription.customer;
      const subscriptionId = subscription.id;
      
      // Extrair o dia da data de criação da assinatura
      const subscriptionCreatedDate = new Date(subscription.created * 1000);
      const subscriptionDay = subscriptionCreatedDate.getDate();
      
      console.log(`📅 Configurando cobrança de tokens para cliente ${customerId}`);
      console.log(`📅 Dia da assinatura: ${subscriptionDay}`);
      console.log(`📅 Data de criação: ${subscriptionCreatedDate.toISOString()}`);
      
      // Buscar client_id baseado no customer_id do Stripe
      const clientId = await this.findClientIdByStripeCustomerId(customerId);
      
      if (!clientId) {
        console.log(`⚠️ Cliente não encontrado para customer_id: ${customerId}`);
        logger.warn('Client not found for Stripe customer', {
          customerId,
          subscriptionId,
          subscriptionDay
        });
        return;
      }
      
      // Definir o dia de início da assinatura no sistema de cobrança de tokens
      const tokenBillingService = new TokenBillingService();
      await tokenBillingService.setSubscriptionStartDay(clientId, subscriptionDay);
      
      console.log(`✅ Dia de início da assinatura definido: ${subscriptionDay} para cliente ${clientId}`);
      
      logger.info('Token billing subscription day set', {
        clientId,
        customerId,
        subscriptionId,
        subscriptionDay,
        subscriptionCreatedDate: subscriptionCreatedDate.toISOString()
      });
      
    } catch (error) {
      console.error('❌ Erro ao configurar cobrança de tokens:', error);
      logger.error('Failed to setup token billing for subscription', {
        error: error.message,
        stack: error.stack,
        subscriptionId: subscription.id,
        customerId: subscription.customer
      });
      // Não re-throw para não quebrar o processamento do webhook
    }
  }

  /**
   * Buscar client_id baseado no customer_id do Stripe
   */
  async findClientIdByStripeCustomerId(stripeCustomerId) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      
      // Buscar cliente na tabela user_profiles
      const { data: client, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();
      
      if (error) {
        console.log(`⚠️ Erro ao buscar cliente: ${error.message}`);
        return null;
      }
      
      return client?.id || null;
      
    } catch (error) {
      console.error('❌ Erro ao buscar client_id:', error);
      return null;
    }
  }

  /**
   * Obter lista de eventos suportados
   */
  getSupportedEvents() {
    return this.supportedEvents;
  }

  /**
   * Atualizar perfil do usuário com dados da assinatura Stripe
   */
  async updateUserProfileWithStripeData(subscription) {
    try {
      const customerId = subscription.customer;
      const subscriptionId = subscription.id;
      
      console.log(`💾 Salvando dados do Stripe para customer: ${customerId}`);
      
      // Buscar client_id baseado no customer_id do Stripe
      const clientId = await this.findClientIdByStripeCustomerId(customerId);
      
      if (!clientId) {
        console.log(`⚠️ Cliente não encontrado para customer_id: ${customerId}`);
        return;
      }
      
      // Buscar método de pagamento padrão do customer
      const customer = await stripe.customers.retrieve(customerId);
      const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;
      
      // Atualizar user_profiles com dados do Stripe
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      
      const updateData = {
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString()
      };
      
      // Adicionar payment_method_id se disponível
      if (defaultPaymentMethodId) {
        updateData.stripe_payment_method_id = defaultPaymentMethodId;
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', clientId);
      
      if (error) {
        console.error(`❌ Erro ao atualizar perfil: ${error.message}`);
        logger.error('Failed to update user profile with Stripe data', {
          error: error.message,
          clientId,
          customerId,
          subscriptionId
        });
      } else {
        console.log(`✅ Perfil atualizado com dados do Stripe para cliente ${clientId}`);
        logger.info('User profile updated with Stripe data', {
          clientId,
          customerId,
          subscriptionId,
          defaultPaymentMethodId
        });
      }
      
    } catch (error) {
      console.error('❌ Erro ao salvar dados do Stripe:', error);
      logger.error('Failed to save Stripe data to user profile', {
        error: error.message,
        stack: error.stack,
        subscriptionId: subscription.id,
        customerId: subscription.customer
      });
    }
  }

  /**
   * Atualizar perfil do usuário com método de pagamento
   */
  async updateUserProfileWithPaymentMethod(paymentMethod) {
    try {
      const customerId = paymentMethod.customer;
      const paymentMethodId = paymentMethod.id;
      
      console.log(`💳 Salvando método de pagamento ${paymentMethodId} para customer: ${customerId}`);
      
      // Buscar client_id baseado no customer_id do Stripe
      const clientId = await this.findClientIdByStripeCustomerId(customerId);
      
      if (!clientId) {
        console.log(`⚠️ Cliente não encontrado para customer_id: ${customerId}`);
        return;
      }
      
      // Atualizar user_profiles com payment_method_id
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          stripe_payment_method_id: paymentMethodId,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId);
      
      if (error) {
        console.error(`❌ Erro ao atualizar método de pagamento: ${error.message}`);
        logger.error('Failed to update payment method in user profile', {
          error: error.message,
          clientId,
          customerId,
          paymentMethodId
        });
      } else {
        console.log(`✅ Método de pagamento atualizado para cliente ${clientId}`);
        logger.info('Payment method updated in user profile', {
          clientId,
          customerId,
          paymentMethodId
        });
      }
      
    } catch (error) {
      console.error('❌ Erro ao salvar método de pagamento:', error);
      logger.error('Failed to save payment method to user profile', {
        error: error.message,
        stack: error.stack,
        paymentMethodId: paymentMethod.id,
        customerId: paymentMethod.customer
      });
    }
  }
}

module.exports = new WebhookService();






