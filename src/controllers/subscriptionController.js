const stripeService = require('../services/stripeService');
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

class SubscriptionController {
  /**
   * Cria uma nova assinatura após o cadastro do usuário
   */
  async createSubscription(userId, planType, stripeCustomerId, sessionId) {
    try {
      // Inserir ou atualizar a assinatura na base de dados
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_type: planType,
          stripe_customer_id: stripeCustomerId,
          stripe_session_id: sessionId,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        logger.error('Erro ao criar assinatura:', error);
        throw new Error('Falha ao criar assinatura');
      }

      logger.info(`Assinatura criada para usuário ${userId} com plano ${planType}`);
      return data;
    } catch (error) {
      logger.error('Erro ao processar assinatura:', error);
      throw error;
    }
  }

  /**
   * Obtém a assinatura atual do usuário
   */
  async getUserSubscription(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
        logger.error('Erro ao buscar assinatura:', error);
        throw new Error('Falha ao buscar assinatura');
      }

      return data;
    } catch (error) {
      logger.error('Erro ao obter assinatura do usuário:', error);
      throw error;
    }
  }

  /**
   * Atualiza o status da assinatura
   */
  async updateSubscriptionStatus(userId, status, metadata = {}) {
    try {
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status,
          metadata,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        logger.error('Erro ao atualizar status da assinatura:', error);
        throw new Error('Falha ao atualizar assinatura');
      }

      logger.info(`Status da assinatura atualizado para ${status} - usuário ${userId}`);
      return data;
    } catch (error) {
      logger.error('Erro ao atualizar assinatura:', error);
      throw error;
    }
  }

  /**
   * Cancela uma assinatura
   */
  async cancelSubscription(userId) {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        throw new Error('Assinatura não encontrada');
      }

      // Atualizar status no banco
      await this.updateSubscriptionStatus(userId, 'cancelled');

      logger.info(`Assinatura cancelada para usuário ${userId}`);
      return true;
    } catch (error) {
      logger.error('Erro ao cancelar assinatura:', error);
      throw error;
    }
  }

  /**
   * Processo completo de signup com plano
   */
  async signupWithPlan(userRegistrationData, planType) {
    try {
      const { email, password, firstName, lastName } = userRegistrationData;
      
      // 1. Criar usuário no Supabase
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirmar email
        user_metadata: {
          firstName: firstName || '',
          lastName: lastName || '',
          signupPlan: planType
        }
      });

      if (authError) {
        logger.error('Erro ao criar usuário:', authError);
        throw new Error(`Falha ao criar usuário: ${authError.message}`);
      }

      const user = authData.user;

      // 2. Criar perfil do usuário
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          first_name: firstName || '',
          last_name: lastName || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        logger.error('Erro ao criar perfil:', profileError);
        // Não falhar aqui, apenas registrar o erro
      }

      // 3. Criar cliente no Stripe
      const stripeCustomer = await stripeService.createCustomer(
        email,
        `${firstName} ${lastName}`.trim(),
        {
          userId: user.id,
          signupPlan: planType
        }
      );

      // 4. Criar sessão de checkout
      // ✅ POPUP: Verificar se deve usar popup ou redirect
      const usePopup = req.query.popup === 'true';
      
      const checkoutSession = await stripeService.createCheckoutSession(
        planType,
        email,
        `${process.env.APP_URL}/payment/success?plan=${planType}&user_id=${user.id}`,
        `${process.env.APP_URL}/payment/cancel?user_id=${user.id}`,
        {
          userId: user.id,
          stripeCustomerId: stripeCustomer.id,
          isSignup: 'true',
          usePopup: usePopup
        },
        'monthly', // interval padrão
        usePopup
      );

      // 5. Criar assinatura inicial com status pending
      await this.createSubscription(user.id, planType, stripeCustomer.id, checkoutSession.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: firstName || '',
          lastName: lastName || ''
        },
        subscription: {
          planType,
          status: 'pending'
        },
        checkout: {
          sessionId: checkoutSession.id,
          url: checkoutSession.url
        }
      };
    } catch (error) {
      logger.error('Erro no signup com plano:', error);
      throw error;
    }
  }

  /**
   * Confirma o pagamento e ativa a assinatura
   */
  async confirmPayment(sessionId) {
    try {
      // Verificar status do pagamento no Stripe
      const paymentStatus = await stripeService.getPaymentStatus(sessionId);
      
      if (paymentStatus.status === 'paid') {
        const metadata = paymentStatus.metadata;
        const userId = metadata.userId;
        
        if (userId) {
          // Ativar assinatura
          await this.updateSubscriptionStatus(userId, 'active', {
            paymentConfirmedAt: new Date().toISOString(),
            stripeSessionId: sessionId
          });
          
          logger.info(`Pagamento confirmado e assinatura ativada para usuário ${userId}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Erro ao confirmar pagamento:', error);
      throw error;
    }
  }

  /**
   * Middleware para verificar se o usuário tem assinatura ativa
   */
  async requireActiveSubscription(req, res, next) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription || subscription.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Assinatura ativa necessária',
          requiresSubscription: true
        });
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      logger.error('Erro ao verificar assinatura:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = new SubscriptionController(); 