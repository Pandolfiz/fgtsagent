// Carregar variáveis de ambiente do arquivo .env no diretório src/
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// Validar se a chave do Stripe está disponível
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY não está configurada no arquivo .env do diretório src/');
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../utils/logger');
const stripeProductService = require('./stripeProductService');

// ✅ CONFIGURAÇÃO DINÂMICA - SEM HARDCODING
// Os produtos e preços são buscados dinamicamente do Stripe
const getPlanConfig = async (planType, interval = 'monthly') => {
  try {
    const price = await stripeProductService.getPriceByPlanAndInterval(planType, interval);
    
    return {
      name: `${planType.charAt(0).toUpperCase() + planType.slice(1)}`,
      description: `Plano ${planType} com funcionalidades ${planType === 'basic' ? 'essenciais' : planType === 'pro' ? 'avançadas' : 'completas'}`,
      priceId: price.id,
      amount: price.amount,
      currency: price.currency,
      interval: price.interval
    };
  } catch (error) {
    console.error(`❌ Erro ao buscar configuração do plano ${planType}:`, error);
    throw error;
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
      // ✅ BUSCAR CONFIGURAÇÃO DINAMICAMENTE DO STRIPE (mensal como padrão)
      const defaultPrice = await getPlanConfig(planType, 'monthly');
      if (!defaultPrice) {
        throw new Error(`Configuração não encontrada para o plano ${planType}`);
      }

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
            url: this.getSuccessUrl(planType)
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
      // ✅ BUSCAR CONFIGURAÇÃO DINAMICAMENTE DO STRIPE
      const priceConfig = await getPlanConfig(planType, interval);
      if (!priceConfig) {
        throw new Error(`Configuração não encontrada para o plano ${planType} - ${interval}`);
      }

      // ✅ VERIFICAR: Se o preço existe no Stripe
      try {
        console.log('🔍 Verificando se o preço existe no Stripe:', priceConfig.priceId);
        const price = await stripe.prices.retrieve(priceConfig.priceId);
        console.log('✅ Preço encontrado no Stripe:', {
          id: price.id,
          active: price.active,
          type: price.type,
          recurring: price.recurring,
          unit_amount: price.unit_amount,
          currency: price.currency
        });
        
        // ✅ VERIFICAR: Se o preço é recorrente
        if (price.type !== 'recurring') {
          throw new Error(`Preço ${priceConfig.priceId} não é recorrente`);
        }
        
        // ✅ VERIFICAR: Se o preço está ativo
        if (!price.active) {
          throw new Error(`Preço ${priceConfig.priceId} não está ativo`);
        }
        
      } catch (error) {
        console.error('❌ Erro ao verificar preço no Stripe:', error);
        throw new Error(`Erro ao verificar preço ${priceConfig.priceId}: ${error.message}`);
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
        description: `Assinatura ${planType} - ${interval}`,
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
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === 'requires_action',
        // ✅ CORREÇÃO: nextAction só deve existir quando há ação pendente
        nextAction: paymentIntent.status === 'requires_action' ? paymentIntent.next_action : null
      };
    } catch (error) {
      logger.error('Erro ao criar Payment Intent:', error);
      throw new Error(`Falha ao criar Payment Intent: ${error.message}`);
    }
  }

  /**
   * Cria um PaymentIntent para checkout nativo (sem confirmar)
   * Ideal para confirmCardPayment no frontend
   */
  async createPaymentIntentOnly(planType, customerEmail, metadata = {}, interval = 'monthly') {
    try {
      // ✅ BUSCAR CONFIGURAÇÃO DINAMICAMENTE DO STRIPE
      const priceConfig = await getPlanConfig(planType, interval);
      if (!priceConfig) {
        throw new Error(`Configuração não encontrada para o plano ${planType} - ${interval}`);
      }

      // ✅ CONFIGURAÇÃO PARA CHECKOUT NATIVO: Sem confirm, apenas criar
      const paymentIntentData = {
        amount: priceConfig.amount,
        currency: 'brl',
        capture_method: 'automatic',
        metadata: {
          plan: planType,
          interval: interval,
          customerEmail,
          source: 'signup_native', // ✅ IDENTIFICADOR: Checkout nativo
          user_agent: 'fgtsagent_native',
          ...metadata
        },
        description: `Assinatura ${planType} - ${interval} (Checkout Nativo)`,
        receipt_email: customerEmail
        // ✅ NOTA: Não incluir confirm ou return_url - será confirmado via confirmCardPayment
      };

      console.log('🔍 Criando PaymentIntent para checkout nativo:', paymentIntentData);

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

      logger.info(`Payment Intent nativo criado: ${paymentIntent.id} para plano ${planType} (${interval})`);
      
      return {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === 'requires_action',
        // ✅ CORREÇÃO: nextAction só deve existir quando há ação pendente
        nextAction: paymentIntent.status === 'requires_action' ? paymentIntent.next_action : null
      };
    } catch (error) {
      logger.error('Erro ao criar Payment Intent nativo:', error);
      throw new Error(`Falha ao criar Payment Intent nativo: ${error.message}`);
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
      
      // ✅ ENRIQUECER: Dados com informações úteis para o frontend
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customerEmail: paymentIntent.customer_email || paymentIntent.receipt_email,
        metadata: paymentIntent.metadata,
        client_secret: paymentIntent.client_secret,
        // ✅ DADOS ADICIONAIS: Para melhor experiência do usuário
        created: paymentIntent.created,
        last_payment_error: paymentIntent.last_payment_error,
        next_action: paymentIntent.next_action,
        payment_method: paymentIntent.payment_method,
        // ✅ METADADOS ENRIQUECIDOS: Garantir que todos os campos estejam disponíveis
        planType: paymentIntent.metadata?.planType || paymentIntent.metadata?.plan || 'basic',
        interval: paymentIntent.metadata?.interval || 'monthly',
        firstName: paymentIntent.metadata?.firstName || paymentIntent.metadata?.first_name || '',
        lastName: paymentIntent.metadata?.lastName || paymentIntent.metadata?.last_name || '',
        fullName: paymentIntent.metadata?.fullName || paymentIntent.metadata?.full_name || '',
        phone: paymentIntent.metadata?.phone || ''
      };
    } catch (error) {
      logger.error('Erro ao obter Payment Intent:', error);
      throw new Error(`Falha ao obter pagamento: ${error.message}`);
    }
  }

  /**
   * Cria uma sessão de checkout no Stripe
   */
  async createCheckoutSession(planType, customerEmail, successUrl, cancelUrl, metadata = {}, interval = 'monthly', usePopup = false) {
    try {
      // ✅ VALIDAÇÃO BÁSICA
      if (!customerEmail || !successUrl || !cancelUrl) {
        throw new Error('Email, successUrl e cancelUrl são obrigatórios');
      }

      // ✅ BUSCAR CONFIGURAÇÃO DINAMICAMENTE DO STRIPE
      const priceConfig = await getPlanConfig(planType, interval);
      if (!priceConfig) {
        throw new Error(`Configuração não encontrada para o plano ${planType} - ${interval}`);
      }

      console.log('📋 Criando Checkout Session com 3DS:', { planType, interval, priceId: priceConfig.priceId });

      // ✅ CONFIGURAÇÃO OFICIALMENTE SUPORTADA PELA STRIPE
      const sessionConfig = {
        payment_method_types: ['card'],
        customer_email: customerEmail,
        locale: 'pt-BR',
        mode: 'subscription',
        line_items: [{
          price: priceConfig.priceId,
          quantity: 1,
        }],
        subscription_data: {
          trial_period_days: 7, // ✅ FREE TRIAL DE 7 DIAS
          trial_settings: {
            end_behavior: {
              missing_payment_method: 'cancel' // ✅ CANCELAR se não houver método de pagamento
            }
          },
          metadata: {
            plan: planType,
            interval: interval,
            customerEmail: customerEmail
          }
        },
        // ✅ NOVO: CONFIGURAÇÃO 3DS AUTOMÁTICA (OFICIALMENTE SUPORTADA)
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic' // ✅ 3DS AUTOMÁTICO para máxima segurança
          }
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        billing_address_collection: 'required', // ✅ COLETAR endereço para 3DS
        allow_promotion_codes: true,
        metadata: {
          plan: planType,
          interval: interval,
          customerEmail: customerEmail,
          ...metadata
        }
      };

      console.log('🔧 Configuração da sessão com 3DS:', sessionConfig);

      // ✅ CRIAR SESSÃO
      const session = await stripe.checkout.sessions.create(sessionConfig);

      console.log('✅ Sessão criada com 3DS:', {
        id: session.id,
        url: session.url ? 'PRESENTE' : 'AUSENTE',
        mode: session.mode,
        has3DS: !!sessionConfig.payment_method_options?.card?.request_three_d_secure,
        trialPeriod: sessionConfig.subscription_data.trial_period_days
      });

      // ✅ VERIFICAR URL
      if (!session.url) {
        throw new Error('Sessão criada sem URL de checkout');
      }

      // ✅ RETORNAR
      return {
        sessionId: session.id,
        url: session.url,
        subscription: session.subscription,
        mode: session.mode,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_email
      };

    } catch (error) {
      logger.error('Erro ao criar sessão de checkout com 3DS:', error);
      throw new Error(`Falha ao criar sessão com 3DS: ${error.message}`);
    }
  }

  /**
   * Verifica o status de um pagamento
   */
  async getPaymentStatus(sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      // ✅ ENRIQUECER: Dados com informações úteis para o frontend
      return {
        status: session.payment_status,
        customerEmail: session.customer_email,
        metadata: session.metadata,
        paymentIntent: session.payment_intent,
        // ✅ DADOS ADICIONAIS: Para melhor experiência do usuário
        id: session.id,
        amount: session.amount_total,
        currency: session.currency,
        created: session.created,
        // ✅ METADADOS ENRIQUECIDOS: Garantir que todos os campos estejam disponíveis
        planType: session.metadata?.planType || session.metadata?.plan || 'basic',
        interval: session.metadata?.interval || 'monthly',
        firstName: session.metadata?.firstName || session.metadata?.first_name || '',
        lastName: session.metadata?.lastName || session.metadata?.last_name || '',
        fullName: session.metadata?.fullName || session.metadata?.full_name || '',
        phone: session.metadata?.phone || ''
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
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;
        case 'customer.created':
          await this.handleCustomerCreated(event.data.object);
          break;
        case 'setup_intent.succeeded':
          await this.handleSetupIntentSucceeded(event.data.object);
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
      
      // ✅ EXTRAIR: Dados da sessão de checkout
      const metadata = session.metadata;
      const customerEmail = session.customer_email;
      const planType = metadata.plan;
      const source = metadata.source;
      const userName = metadata.userName;
      const mode = metadata.mode;
      
      // ✅ DADOS COMPLETOS: Extrair dados do usuário dos metadados
      let userFirstName = '';
      let userLastName = '';
      let userPhone = '';
      let userPassword = '';
      
      if (metadata.signupData) {
        try {
          const signupData = JSON.parse(metadata.signupData);
          userFirstName = signupData.firstName || '';
          userLastName = signupData.lastName || '';
          userPhone = signupData.phone || '';
          userPassword = signupData.password || '';
        } catch (parseError) {
          logger.error('Erro ao fazer parse dos dados de signup:', parseError);
        }
      }
      
      // ✅ DEBUG: Verificar dados extraídos
      console.log('🔍 [WEBHOOK CHECKOUT] Dados extraídos da sessão:', {
        sessionId: session.id,
        customerEmail,
        planType,
        source,
        mode,
        hasSignupData: !!metadata.signupData,
        firstName: userFirstName,
        lastName: userLastName,
        phone: userPhone,
        hasPassword: !!userPassword,
        passwordLength: userPassword ? userPassword.length : 0
      });
      
      // ✅ VERIFICAR: Se é um signup (não apenas upgrade de plano)
      if (mode === 'signup' && source === 'signup_with_plans' && customerEmail && planType) {
        try {
          logger.info(`[WEBHOOK CHECKOUT] Criando usuário após checkout confirmado: ${customerEmail}`);
          
          // ✅ CRIAR: Usuário no Supabase APÓS confirmação do checkout
          const { supabaseAdmin } = require('../config/supabase');
          
          // ✅ VERIFICAR: Se usuário já existe (evitar duplicação)
          const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          
          if (listError) {
            logger.error(`[WEBHOOK CHECKOUT] Erro ao verificar usuários existentes: ${listError.message}`);
            return false;
          }
          
          const existingUser = existingUsers.users.find(u => u.email === customerEmail);
          
          if (existingUser) {
            logger.info(`[WEBHOOK CHECKOUT] Usuário já existe: ${customerEmail}`);
            return true;
          }
          
          // ✅ CRIAR: Novo usuário no Supabase
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: customerEmail,
            password: userPassword,
            email_confirm: true,
            user_metadata: {
              firstName: userFirstName,
              lastName: userLastName,
              phone: userPhone,
              planType: planType,
              source: source,
              stripeCustomerId: session.customer
            }
          });
          
          if (createError) {
            logger.error(`[WEBHOOK CHECKOUT] Erro ao criar usuário: ${createError.message}`);
            return false;
          }
          
          logger.info(`[WEBHOOK CHECKOUT] Usuário criado com sucesso: ${newUser.user.id}`);
          
          // ✅ CRIAR: Perfil do usuário na tabela user_profiles
          const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .insert({
              id: newUser.user.id,
              first_name: userFirstName,
              last_name: userLastName,
              phone: userPhone,
              plan_type: planType,
              subscription_status: 'trial',
              trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (profileError) {
            logger.error(`[WEBHOOK CHECKOUT] Erro ao criar perfil: ${profileError.message}`);
            return false;
          }
          
          logger.info(`[WEBHOOK CHECKOUT] Perfil criado com sucesso para usuário: ${newUser.user.id}`);
          
          return true;
          
        } catch (userError) {
          logger.error(`[WEBHOOK CHECKOUT] Erro ao processar criação de usuário: ${userError.message}`);
          return false;
        }
      } else {
        logger.info(`[WEBHOOK CHECKOUT] Não é signup ou dados insuficientes:`, {
          mode,
          source,
          hasEmail: !!customerEmail,
          hasPlan: !!planType
        });
      }
      
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
      
      // ✅ NOVA LÓGICA: Criar usuário APÓS confirmação do pagamento
      const metadata = paymentIntent.metadata;
      const customerEmail = metadata.customerEmail;
      const planType = metadata.plan;
      const source = metadata.source;
      const userName = metadata.userName;
      
      // ✅ DADOS COMPLETOS: Extrair todos os dados do usuário dos metadados
      const userFirstName = metadata.firstName || userName?.split(' ')[0] || '';
      const userLastName = metadata.lastName || userName?.split(' ').slice(1).join(' ') || '';
      const userPhone = metadata.phone || '';
      const userPassword = metadata.password || ''; // Senha do formulário
      const userFullName = metadata.fullName || userName || `${userFirstName} ${userLastName}`.trim();
      
      // ✅ DEBUG: Verificar se a senha está sendo extraída corretamente
      console.log('🔍 [WEBHOOK] Extração de dados dos metadados:', {
        metadataKeys: Object.keys(metadata),
        metadataValues: Object.entries(metadata).map(([key, value]) => ({
          key,
          hasValue: !!value,
          valueLength: typeof value === 'string' ? value.length : 'N/A',
          valueType: typeof value
        })),
        hasPassword: !!userPassword,
        passwordLength: userPassword ? userPassword.length : 0,
        passwordPreview: userPassword ? `${userPassword.substring(0, 3)}***` : 'não definida',
        firstName: userFirstName,
        lastName: userLastName,
        phone: userPhone,
        fullName: userFullName
      });
      
      logger.info(`[WEBHOOK] Processando pagamento bem-sucedido:`, {
        paymentIntentId: paymentIntent.id,
        customerEmail,
        planType,
        source,
        userName,
        firstName: userFirstName,
        lastName: userLastName,
        phone: userPhone,
        hasPassword: !!userPassword,
        passwordLength: userPassword ? userPassword.length : 0,
        amount: paymentIntent.amount,
        timestamp: new Date().toISOString()
      });
      
      // ✅ VERIFICAR: Se é um signup (não apenas upgrade de plano)
      if ((source === 'signup' || source === 'signup_with_plans') && customerEmail && planType) {
        try {
          logger.info(`[WEBHOOK] Criando usuário após pagamento confirmado: ${customerEmail}`);
          logger.info(`[WEBHOOK] Dados do usuário:`, {
            email: customerEmail,
            hasPassword: !!userPassword,
            passwordLength: userPassword ? userPassword.length : 0,
            passwordPreview: userPassword ? `${userPassword.substring(0, 3)}***` : 'não definida',
            firstName: userFirstName,
            lastName: userLastName,
            planType: planType
          });
          
          // ✅ CRIAR: Usuário no Supabase APÓS confirmação do pagamento
          const { supabaseAdmin } = require('../config/supabase');
          
          // ✅ VERIFICAR: Se usuário já existe (evitar duplicação)
          const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          
          if (listError) {
            logger.error(`[WEBHOOK] Erro ao verificar usuários existentes: ${listError.message}`);
            return false;
          }
          
          const existingUser = existingUsers.users.find(u => u.email === customerEmail);
          
          if (existingUser) {
            logger.info(`[WEBHOOK] Usuário já existe: ${existingUser.id}, ativando plano`);
            
            // ✅ ATUALIZAR: Usuário existente com plano ativo
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
              user_metadata: {
                ...existingUser.user_metadata,
                planType: planType,
                planActivated: true,
                paymentConfirmed: true,
                lastPayment: new Date().toISOString(),
                paymentIntentId: paymentIntent.id
              }
            });
            
            // ✅ CRIAR: Assinatura ativa
            await this.createActiveSubscription(existingUser.id, planType, paymentIntent.id);
            
          } else {
            logger.info(`[WEBHOOK] Usuário não existe, criando novo: ${customerEmail}`);
            
            // ✅ DEBUG: Verificar senha antes de criar usuário
            console.log('🔍 [WEBHOOK] Criando usuário com senha:', {
              email: customerEmail,
              hasPassword: !!userPassword,
              passwordLength: userPassword ? userPassword.length : 0,
              passwordPreview: userPassword ? `${userPassword.substring(0, 3)}***` : 'não definida',
              willUseTemporaryPassword: !userPassword
            });
            
            // ✅ VALIDAR: Senha deve ter pelo menos 8 caracteres
            if (userPassword && userPassword.length < 8) {
              logger.error(`[WEBHOOK] Senha muito curta: ${userPassword.length} caracteres. Gerando senha temporária.`);
              userPassword = null; // Forçar uso de senha temporária
            }
            
            // ✅ CRIAR: Novo usuário com TODOS os dados do formulário
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
              email: customerEmail,
              password: userPassword || this.generateTemporaryPassword(), // ✅ USAR SENHA DO FORMULÁRIO
              email_confirm: true,
              user_metadata: {
                planType: planType,
                planActivated: true,
                paymentConfirmed: true,
                source: 'stripe_webhook',
                signupDate: new Date().toISOString(),
                lastPayment: new Date().toISOString(),
                paymentIntentId: paymentIntent.id,
                // ✅ DADOS COMPLETOS: Usar dados reais do formulário
                firstName: userFirstName,
                lastName: userLastName,
                fullName: userFullName,
                phone: userPhone,
                signupSource: 'signup_with_plans',
                // ✅ REMOVIDO: Não armazenar senha em metadados por segurança
                // tempPasswordForLogin: userPassword || null,
                // tempPasswordExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
              }
            });
            
            if (createError) {
              logger.error(`[WEBHOOK] Erro ao criar usuário: ${createError.message}`);
              return false;
            }
            
            logger.info(`[WEBHOOK] Usuário criado com sucesso: ${newUser.user.id}`);
            
            // ✅ CRIAR: Perfil do usuário com dados completos
            try {
              await supabaseAdmin
                .from('user_profiles')
                .insert({
                  id: newUser.user.id,
                  email: customerEmail,
                  first_name: userFirstName,
                  last_name: userLastName,
                  full_name: userFullName,
                  phone: userPhone,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
            } catch (profileError) {
              logger.warn(`[WEBHOOK] Erro ao criar perfil (ignorando): ${profileError.message}`);
            }
            
            // ✅ CRIAR: Cliente na tabela clients (se existir)
            try {
              await supabaseAdmin
                .from('clients')
                .insert({
                  id: newUser.user.id,
                  name: userFullName,
                  email: customerEmail,
                  phone: userPhone,
                  status: 'active',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
            } catch (clientError) {
              logger.warn(`[WEBHOOK] Erro ao criar cliente (ignorando): ${clientError.message}`);
            }
            
            // ✅ CRIAR: Assinatura ativa
            await this.createActiveSubscription(newUser.user.id, planType, paymentIntent.id);
            
            // ✅ ENVIAR: Email de boas-vindas
            if (userPassword) {
              logger.info(`[WEBHOOK] Usuário criado com senha do formulário - email de boas-vindas deve ser enviado para: ${customerEmail}`);
            } else {
              logger.info(`[WEBHOOK] Usuário criado com senha temporária - email de redefinição deve ser enviado para: ${customerEmail}`);
            }
          }
          
          logger.info(`[WEBHOOK] Processamento concluído com sucesso para: ${customerEmail}`);
          
        } catch (userError) {
          logger.error(`[WEBHOOK] Erro ao processar usuário: ${userError.message}`);
          // Não falhar o webhook por causa de erro na criação do usuário
        }
      } else {
        logger.info(`[WEBHOOK] Pagamento não é de signup, ignorando criação de usuário. Metadata:`, metadata);
      }
      
      return true;
    } catch (error) {
      logger.error('Erro ao processar pagamento bem-sucedido:', error);
      throw error;
    }
  }
  
  /**
   * Gera senha temporária para usuários criados via webhook
   */
  generateTemporaryPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
  
  /**
   * Cria assinatura ativa para usuário
   */
  async createActiveSubscription(userId, planType, paymentIntentId) {
    try {
      const { supabaseAdmin } = require('../config/supabase');
      
      const { error: subscriptionError } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_type: planType,
          status: 'active',
          stripe_payment_intent_id: paymentIntentId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      
      if (subscriptionError) {
        logger.error(`[WEBHOOK] Erro ao criar assinatura: ${subscriptionError.message}`);
      } else {
        logger.info(`[WEBHOOK] Assinatura criada para usuário: ${userId}`);
      }
      
    } catch (error) {
      logger.error(`[WEBHOOK] Erro ao criar assinatura: ${error.message}`);
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
      
      // ✅ EXTRAIR: Dados da assinatura
      const customerId = subscription.customer;
      const planType = subscription.metadata?.plan || 'pro';
      const source = subscription.metadata?.source || 'stripe_webhook';
      
      console.log('🔍 [WEBHOOK SUBSCRIPTION] Dados da assinatura:', {
        subscriptionId: subscription.id,
        customerId,
        planType,
        source,
        metadata: subscription.metadata
      });
      
      // ✅ BUSCAR: Cliente no Stripe para obter email
      const customer = await stripe.customers.retrieve(customerId);
      const customerEmail = customer.email;
      
      if (!customerEmail) {
        logger.warn(`[WEBHOOK SUBSCRIPTION] Cliente sem email: ${customerId}`);
        return false;
      }
      
      console.log('🔍 [WEBHOOK SUBSCRIPTION] Cliente encontrado:', {
        customerId,
        customerEmail,
        customerName: customer.name
      });
      
      // ✅ VERIFICAR: Se é um signup (não apenas upgrade de plano)
      if (source === 'signup_with_plans' && customerEmail && planType) {
        try {
          logger.info(`[WEBHOOK SUBSCRIPTION] Criando usuário após assinatura confirmada: ${customerEmail}`);
          
          // ✅ CRIAR: Usuário no Supabase APÓS confirmação da assinatura
          const { supabaseAdmin } = require('../config/supabase');
          
          // ✅ VERIFICAR: Se usuário já existe (evitar duplicação)
          const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          
          if (listError) {
            logger.error(`[WEBHOOK SUBSCRIPTION] Erro ao verificar usuários existentes: ${listError.message}`);
            return false;
          }
          
          const existingUser = existingUsers.users.find(u => u.email === customerEmail);
          
          if (existingUser) {
            logger.info(`[WEBHOOK SUBSCRIPTION] Usuário já existe: ${customerEmail}`);
            return true;
          }
          
          // ✅ EXTRAIR: Dados do usuário dos metadados ou gerar dados padrão
          const userFirstName = customer.name ? customer.name.split(' ')[0] : 'Usuário';
          const userLastName = customer.name ? customer.name.split(' ').slice(1).join(' ') : 'Novo';
          const userPhone = customer.phone || '';
          
          // ✅ GERAR: Senha temporária
          const userPassword = this.generateTemporaryPassword();
          
          console.log('🔍 [WEBHOOK SUBSCRIPTION] Criando usuário com dados:', {
            email: customerEmail,
            firstName: userFirstName,
            lastName: userLastName,
            phone: userPhone,
            planType,
            passwordLength: userPassword.length
          });
          
          // ✅ CRIAR: Novo usuário no Supabase
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: customerEmail,
            password: userPassword,
            email_confirm: true,
            user_metadata: {
              firstName: userFirstName,
              lastName: userLastName,
              phone: userPhone,
              planType: planType,
              source: source,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscription.id
            }
          });
          
          if (createError) {
            logger.error(`[WEBHOOK SUBSCRIPTION] Erro ao criar usuário: ${createError.message}`);
            return false;
          }
          
          logger.info(`[WEBHOOK SUBSCRIPTION] Usuário criado com sucesso: ${newUser.user.id}`);
          
          // ✅ CRIAR: Perfil do usuário na tabela user_profiles
          const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .insert({
              id: newUser.user.id,
              first_name: userFirstName,
              last_name: userLastName,
              phone: userPhone,
              plan_type: planType,
              subscription_status: 'active',
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (profileError) {
            logger.error(`[WEBHOOK SUBSCRIPTION] Erro ao criar perfil: ${profileError.message}`);
            return false;
          }
          
          logger.info(`[WEBHOOK SUBSCRIPTION] Perfil criado com sucesso para usuário: ${newUser.user.id}`);
          
          // ✅ ENVIAR: Email de boas-vindas com credenciais
          logger.info(`[WEBHOOK SUBSCRIPTION] Usuário criado com senha temporária - email de redefinição deve ser enviado para: ${customerEmail}`);
          
          // ✅ IMPORTANTE: Tentar login automático
          try {
            await this.performAutoLoginAfterWebhook(customerEmail, userPassword, {
              firstName: userFirstName,
              lastName: userLastName,
              planType: planType,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscription.id
            });
            logger.info(`[WEBHOOK SUBSCRIPTION] Login automático realizado para: ${customerEmail}`);
          } catch (loginError) {
            logger.warn(`[WEBHOOK SUBSCRIPTION] Login automático falhou para: ${customerEmail}`, loginError.message);
            
            // ✅ IMPORTANTE: Limpar qualquer resíduo de sessão falhada
            try {
              await this.cleanupFailedAutoLogin(customerEmail);
              logger.info(`[WEBHOOK SUBSCRIPTION] Limpeza de resíduos realizada para: ${customerEmail}`);
            } catch (cleanupError) {
              logger.warn(`[WEBHOOK SUBSCRIPTION] Falha na limpeza de resíduos para: ${customerEmail}`, cleanupError.message);
            }
            
            // Não falhar o webhook por causa do login automático
          }
          
          return true;
          
        } catch (userError) {
          logger.error(`[WEBHOOK SUBSCRIPTION] Erro ao processar criação de usuário: ${userError.message}`);
          return false;
        }
      } else {
        logger.info(`[WEBHOOK SUBSCRIPTION] Não é signup ou dados insuficientes:`, {
          source,
          hasEmail: !!customerEmail,
          hasPlan: !!planType
        });
      }
      
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
      
      // ✅ IMPLEMENTAR: Lógica para desativar recursos do usuário
      const customerId = subscription.customer;
      const customer = await stripe.customers.retrieve(customerId);
      const customerEmail = customer.email;
      
      if (customerEmail) {
        // ✅ ATUALIZAR: Status da assinatura no Supabase
        const { supabaseAdmin } = require('../config/supabase');
        
        const { error: updateError } = await supabaseAdmin
          .from('user_profiles')
          .update({ 
            subscription_status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customerId);
        
        if (updateError) {
          logger.error(`[WEBHOOK] Erro ao atualizar status da assinatura: ${updateError.message}`);
        } else {
          logger.info(`[WEBHOOK] Status da assinatura atualizado para 'cancelled' para: ${customerEmail}`);
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Erro ao processar cancelamento de assinatura:', error);
      throw error;
    }
  }

  /**
   * Trata pagamento de fatura realizado com sucesso
   */
  async handleInvoicePaymentSucceeded(invoice) {
    try {
      logger.info(`Pagamento de fatura realizado: ${invoice.id}`);
      
      // ✅ EXTRAIR: Dados da fatura
      const customerId = invoice.customer;
      const subscriptionId = invoice.subscription;
      const amount = invoice.amount_paid;
      const currency = invoice.currency;
      
      console.log('🔍 [WEBHOOK INVOICE] Pagamento realizado:', {
        invoiceId: invoice.id,
        customerId,
        subscriptionId,
        amount,
        currency,
        status: invoice.status
      });
      
      if (subscriptionId) {
        // ✅ ATUALIZAR: Status da assinatura para 'active'
        const { supabaseAdmin } = require('../config/supabase');
        
        const { error: updateError } = await supabaseAdmin
          .from('user_profiles')
          .update({ 
            subscription_status: 'active',
            last_payment_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscriptionId);
        
        if (updateError) {
          logger.error(`[WEBHOOK] Erro ao atualizar status da assinatura: ${updateError.message}`);
        } else {
          logger.info(`[WEBHOOK] Status da assinatura atualizado para 'active' após pagamento`);
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Erro ao processar pagamento de fatura:', error);
      throw error;
    }
  }

  /**
   * Trata falha no pagamento de fatura
   */
  async handleInvoicePaymentFailed(invoice) {
    try {
      logger.info(`Pagamento de fatura falhou: ${invoice.id}`);
      
      // ✅ EXTRAIR: Dados da fatura
      const customerId = invoice.customer;
      const subscriptionId = invoice.subscription;
      const attemptCount = invoice.attempt_count;
      
      console.log('🔍 [WEBHOOK INVOICE] Falha no pagamento:', {
        invoiceId: invoice.id,
        customerId,
        subscriptionId,
        attemptCount,
        status: invoice.status
      });
      
      if (subscriptionId) {
        // ✅ ATUALIZAR: Status da assinatura para 'past_due'
        const { supabaseAdmin } = require('../config/supabase');
        
        const { error: updateError } = await supabaseAdmin
          .from('user_profiles')
          .update({ 
            subscription_status: 'past_due',
            payment_failure_count: attemptCount,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscriptionId);
        
        if (updateError) {
          logger.error(`[WEBHOOK] Erro ao atualizar status da assinatura: ${updateError.message}`);
        } else {
          logger.info(`[WEBHOOK] Status da assinatura atualizado para 'past_due' após falha no pagamento`);
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Erro ao processar falha no pagamento de fatura:', error);
      throw error;
    }
  }

  /**
   * Trata criação de cliente
   */
  async handleCustomerCreated(customer) {
    try {
      logger.info(`Cliente criado: ${customer.id}`);
      
      // ✅ LOG: Dados do cliente para auditoria
      console.log('🔍 [WEBHOOK CUSTOMER] Novo cliente:', {
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        created: customer.created
      });
      
      return true;
    } catch (error) {
      logger.error('Erro ao processar criação de cliente:', error);
      throw error;
    }
  }

  /**
   * Trata trial que vai terminar em 3 dias
   */
  async handleSubscriptionTrialWillEnd(subscription) {
    try {
      logger.info(`Trial vai terminar em 3 dias: ${subscription.id}`);
      
      // ✅ EXTRAIR: Dados da assinatura
      const customerId = subscription.customer;
      const trialEnd = subscription.trial_end;
      const customer = await stripe.customers.retrieve(customerId);
      const customerEmail = customer.email;
      
      console.log('🔍 [WEBHOOK TRIAL] Trial terminando em 3 dias:', {
        subscriptionId: subscription.id,
        customerId,
        customerEmail,
        trialEnd: new Date(trialEnd * 1000).toISOString(),
        daysLeft: Math.ceil((trialEnd - Date.now() / 1000) / 86400)
      });
      
      if (customerEmail) {
        // ✅ ENVIAR: Email de notificação sobre trial terminando
        logger.info(`[WEBHOOK TRIAL] Enviando notificação para: ${customerEmail}`);
        
        // TODO: Implementar envio de email
        // await emailService.sendTrialEndingNotification(customerEmail, subscription);
        
        // ✅ ATUALIZAR: Status no Supabase para 'trial_ending'
        const { supabaseAdmin } = require('../config/supabase');
        
        const { error: updateError } = await supabaseAdmin
          .from('user_profiles')
          .update({ 
            subscription_status: 'trial_ending',
            trial_end_date: new Date(trialEnd * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customerId);
        
        if (updateError) {
          logger.error(`[WEBHOOK] Erro ao atualizar status do trial: ${updateError.message}`);
        } else {
          logger.info(`[WEBHOOK] Status do trial atualizado para 'trial_ending' para: ${customerEmail}`);
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Erro ao processar trial que vai terminar:', error);
      throw error;
    }
  }

  /**
   * Trata trial que terminou
   */
  async handleSubscriptionTrialEnded(subscription) {
    try {
      logger.info(`Trial terminou: ${subscription.id}`);
      
      // ✅ EXTRAIR: Dados da assinatura
      const customerId = subscription.customer;
      const customer = await stripe.customers.retrieve(customerId);
      const customerEmail = customer.email;
      
      console.log('🔍 [WEBHOOK TRIAL] Trial terminou:', {
        subscriptionId: subscription.id,
        customerId,
        customerEmail,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
      });
      
      if (customerEmail) {
        // ✅ VERIFICAR: Se há método de pagamento configurado
        if (subscription.default_payment_method) {
          // ✅ ATUALIZAR: Status para 'active' (cobrança automática ativada)
          const { supabaseAdmin } = require('../config/supabase');
          
          const { error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update({ 
              subscription_status: 'active',
              trial_ended_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('stripe_customer_id', customerId);
          
          if (updateError) {
            logger.error(`[WEBHOOK] Erro ao atualizar status após trial: ${updateError.message}`);
          } else {
            logger.info(`[WEBHOOK] Status atualizado para 'active' após trial para: ${customerEmail}`);
          }
        } else {
          // ✅ ATUALIZAR: Status para 'incomplete' (sem método de pagamento)
          const { supabaseAdmin } = require('../config/supabase');
          
          const { error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update({ 
              subscription_status: 'incomplete',
              trial_ended_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('stripe_customer_id', customerId);
          
          if (updateError) {
            logger.error(`[WEBHOOK] Erro ao atualizar status após trial: ${updateError.message}`);
          } else {
            logger.info(`[WEBHOOK] Status atualizado para 'incomplete' após trial para: ${customerEmail}`);
          }
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Erro ao processar trial terminado:', error);
      throw error;
    }
  }

  /**
   * Lista todos os planos disponíveis
   */
  async getAvailablePlans() {
    try {
      console.log('🔄 Buscando planos disponíveis...');
      
      // ✅ BUSCAR PRODUTOS DINAMICAMENTE DO STRIPE
      const products = await stripeProductService.getAvailableProducts();
      
      console.log(`✅ ${products.length} planos encontrados`);
      
      // ✅ FORMATAR PARA FRONTEND
      return products.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        features: product.metadata?.features ? JSON.parse(product.metadata.features) : [],
        prices: product.prices.map(price => ({
          interval: price.interval,
          priceId: price.id,
        amount: price.amount,
        amountFormatted: `R$ ${(price.amount / 100).toFixed(2).replace('.', ',')}`,
          intervalText: price.interval === 'month' ? 'por mês' : 'por ano',
          discount: null
      }))
    }));
    } catch (error) {
      console.error('❌ Erro ao buscar planos disponíveis:', error);
      throw error;
    }
  }

  /**
   * Obtém informações de um plano específico
   */
  async getPlanInfo(planType, interval = 'monthly') {
    try {
      console.log('🔍 getPlanInfo chamado com:', { planType, interval });
      
      // ✅ BUSCAR PRODUTO DINAMICAMENTE DO STRIPE COM PREÇOS
      const product = await stripeProductService.getProductWithPricesByPlanType(planType);
      console.log('✅ Produto encontrado:', product.name);
      
      // ✅ VALIDAÇÃO DE SEGURANÇA: Verificar se product.prices existe
      if (!product.prices || !Array.isArray(product.prices)) {
        console.error('❌ Produto não possui preços válidos:', {
          productId: product.id,
          productName: product.name,
          hasPrices: !!product.prices,
          pricesType: typeof product.prices,
          prices: product.prices
        });
        throw new Error(`Produto ${planType} não possui preços configurados`);
      }
      
      // ✅ BUSCAR PREÇO ESPECÍFICO
      const price = await stripeProductService.getPriceByPlanAndInterval(planType, interval);
      console.log('✅ Preço encontrado:', { interval, amount: price.amount });
      
      return {
        id: planType.toLowerCase(),
        name: product.name,
        description: product.description,
        price: price.amount,
        priceFormatted: `R$ ${(price.amount / 100).toFixed(2).replace('.', ',')}`,
        interval: interval,
        intervalText: price.interval === 'month' ? 'por mês' : 'por ano',
        discount: null, // ✅ TODO: Implementar sistema de desconto
        features: [], // ✅ TODO: Implementar busca de features do metadata
        priceId: price.id,
        // ✅ TODOS OS PREÇOS DISPONÍVEIS
        prices: product.prices.map(p => ({
          interval: p.interval,
          priceId: p.id,
          amount: p.amount,
          amountFormatted: `R$ ${(p.amount / 100).toFixed(2).replace('.', ',')}`,
          intervalText: p.interval === 'month' ? 'por mês' : 'por ano',
          discount: null
        }))
      };
    } catch (error) {
      console.error(`❌ Erro ao buscar informações do plano ${planType}:`, error);
      throw error;
    }
  }

  /**
   * Obtém todos os preços de um plano específico
   */
  async getPlanPrices(planType) {
    try {
      // ✅ BUSCAR PRODUTO DINAMICAMENTE DO STRIPE COM PREÇOS
      const product = await stripeProductService.getProductWithPricesByPlanType(planType);
      
      // ✅ VALIDAÇÃO DE SEGURANÇA: Verificar se product.prices existe
      if (!product.prices || !Array.isArray(product.prices)) {
        console.error('❌ Produto não possui preços válidos:', {
          productId: product.id,
          productName: product.name,
          hasPrices: !!product.prices,
          pricesType: typeof product.prices,
          prices: product.prices
        });
        throw new Error(`Produto ${planType} não possui preços configurados`);
      }
      
      return {
        id: planType.toLowerCase(),
        name: product.name,
        description: product.description,
        features: [], // ✅ TODO: Implementar busca de features do metadata
        prices: product.prices.map(price => ({
          interval: price.interval,
          priceId: price.id,
          amount: price.amount,
          amountFormatted: `R$ ${(price.amount / 100).toFixed(2).replace('.', ',')}`,
          intervalText: price.interval === 'month' ? 'por mês' : 'por ano',
          discount: null // ✅ TODO: Implementar sistema de desconto
        }))
      };
    } catch (error) {
      console.error(`❌ Erro ao buscar preços do plano ${planType}:`, error);
      throw error;
    }
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
      // ✅ BUSCAR CONFIGURAÇÃO DINAMICAMENTE DO STRIPE
      const priceConfig = await getPlanConfig(planType, interval);
      if (!priceConfig) {
        throw new Error(`Configuração não encontrada para o plano ${planType} - ${interval}`);
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
        description: `Assinatura ${planType} - ${interval}`,
        metadata: {
          plan: planType,
          interval: interval,
          customerEmail,
          source: 'signup',
          userName: metadata.userName,
          user_agent: 'fgtsagent_web',
          // ✅ DADOS COMPLETOS: Incluir todos os dados do usuário
          firstName: metadata.firstName || '',
          lastName: metadata.lastName || '',
          fullName: metadata.fullName || metadata.userName || '',
          phone: metadata.phone || '',
          password: metadata.password || '', // Senha para criação no webhook
          ...metadata
        },
        payment_method: paymentMethodId, // ✅ MÉTODO: PaymentMethod criado no frontend
        receipt_email: customerEmail
        // ✅ REMOVIDO: return_url para evitar redirecionamentos incorretos
        // O frontend deve sempre usar popup para manter estado
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
        planName: planType,
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
        // ✅ CORREÇÃO: nextAction só deve existir quando há ação pendente
        nextAction: paymentIntent.status === 'requires_action' ? paymentIntent.next_action : null
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
      const confirmData = {
        payment_method: paymentMethodId
        // ✅ REMOVIDO: return_url para evitar redirecionamentos incorretos
        // O frontend deve sempre usar popup para manter estado
      };
      
      const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntentId, confirmData);
      
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
          nextAction: confirmedIntent.status === 'requires_action' ? confirmedIntent.next_action : null
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
   * Processa pagamento completo para assinatura recorrente
   * ✅ NOVA ARQUITETURA: Frontend envia dados do cartão, backend processa tudo
   */
  async processCompletePayment(planType, customerEmail, cardData = {}, metadata = {}, interval = 'monthly') {
    try {
      console.log('🔄 Iniciando processamento completo de ASSINATURA RECORRENTE...');
      
      // ✅ VALIDAR PLANO - BUSCA DINÂMICA
      const priceConfig = await getPlanConfig(planType, interval);
      if (!priceConfig) {
        throw new Error(`Configuração não encontrada para o plano ${planType} - ${interval}`);
      }

      console.log('✅ Plano validado:', { planType, interval, price: priceConfig });

      // ✅ VALIDAR CARD DATA
      if (!cardData || !cardData.billing_details) {
        throw new Error('Dados do cartão são obrigatórios para criar assinatura');
      }

      console.log('✅ CardData recebido:', { 
        hasBillingDetails: !!cardData.billing_details,
        hasMetadata: !!cardData.metadata,
        email: cardData.billing_details?.email
      });

      // ✅ CRIAR CUSTOMER NO STRIPE
      console.log('🔄 Criando customer no Stripe...');
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: metadata.userName,
        phone: metadata.phone,
        metadata: {
          plan: planType,
          interval: interval,
          customerEmail,
          source: metadata.source,
          user_agent: 'fgtsagent_backend',
          ...metadata
        }
      });

      console.log('✅ Customer criado:', customer.id);

      // ✅ NOVO: USAR PAYMENT METHOD CRIADO PELO FRONTEND
      console.log('🔄 Usando PaymentMethod criado pelo frontend...');
      
      try {
        // ✅ SOLUÇÃO: Usar PaymentMethod já criado pelo frontend
        // ✅ O frontend já criou o PaymentMethod com dados reais do cartão
        console.log('🔄 Usando PaymentMethod existente:', cardData.paymentMethodId);
        
        // ✅ VALIDAR: Verificar se temos o paymentMethodId
        if (!cardData.paymentMethodId) {
          throw new Error('PaymentMethod ID não fornecido pelo frontend');
        }
        
        // ✅ USAR: PaymentMethod já criado pelo frontend
        const paymentMethodId = cardData.paymentMethodId;
        console.log('✅ Usando PaymentMethod ID:', paymentMethodId);

        // ✅ VINCULAR PAYMENT METHOD AO CUSTOMER
        console.log('🔄 Vinculando PaymentMethod ao customer...');
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customer.id
        });

        console.log('✅ PaymentMethod vinculado ao customer:', paymentMethodId);

        // ✅ DEFINIR PAYMENT METHOD COMO PADRÃO DO CUSTOMER
        console.log('🔄 Definindo PaymentMethod como padrão do customer...');
        await stripe.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: paymentMethodId
          }
        });

        console.log('✅ PaymentMethod definido como padrão do customer');

      } catch (paymentMethodError) {
        console.error('❌ Erro ao criar PaymentMethod:', paymentMethodError.message);
        throw new Error(`Falha ao processar dados do cartão: ${paymentMethodError.message}`);
      }

      // ✅ CRIAR ASSINATURA RECORRENTE COM MÉTODO DE PAGAMENTO VINCULADO
      console.log('🔄 Criando ASSINATURA RECORRENTE...');
      
      const subscriptionData = {
        customer: customer.id,
        items: [{ price: priceConfig.priceId }],
        // ✅ CONFIGURAÇÃO PARA ASSINATURA RECORRENTE COM MÉTODO DE PAGAMENTO
        payment_behavior: 'default_incomplete', // Permite pagamento inicial falhar
        payment_settings: { 
          save_default_payment_method: 'on_subscription', // Salva método de pagamento
          payment_method_types: ['card'] // Aceita apenas cartão
        },
        // ✅ NOVO: PERÍODO DE TESTE GRATUITO DE 7 DIAS
        trial_period_days: 7, // Usuário tem 7 dias de teste grátis
        // ✅ NOVO: CONFIGURAÇÕES 3DS PARA ASSINATURAS
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic' // ✅ 3DS AUTOMÁTICO
          }
        },
        // ✅ METADADOS IMPORTANTES PARA ASSINATURA
        metadata: {
          plan: planType,
          interval: interval,
          source: metadata.source,
          user_agent: 'fgtsagent_backend',
          customer_email: customerEmail,
          customer_name: metadata.userName,
          payment_method_id: paymentMethodId, // ✅ Incluir ID do método de pagamento
          ...metadata
        },
        // ✅ EXPANDIR DADOS IMPORTANTES
        expand: ['latest_invoice.payment_intent']
      };

      console.log('🔄 Dados da assinatura:', subscriptionData);

      const subscription = await stripe.subscriptions.create(subscriptionData);

      console.log('✅ Assinatura RECORRENTE criada:', subscription.id);
      
      // ✅ NOVO: LOGS DO PERÍODO DE TESTE
      if (subscription.trial_start && subscription.trial_end) {
        const trialStart = new Date(subscription.trial_start * 1000);
        const trialEnd = new Date(subscription.trial_end * 1000);
        const firstBilling = new Date(subscription.current_period_end * 1000);
        
        console.log('🎁 PERÍODO DE TESTE GRATUITO CONFIGURADO COM 3DS:');
        console.log('   📅 Início do teste:', trialStart.toLocaleDateString('pt-BR'));
        console.log('   📅 Fim do teste:', trialEnd.toLocaleDateString('pt-BR'));
        console.log('   💳 Primeira cobrança:', firstBilling.toLocaleDateString('pt-BR'));
        console.log('   ⏰ Duração do teste: 7 dias');
        console.log('   🔐 3DS configurado: AUTOMÁTICO');
        console.log('   🛡️ Segurança: MÁXIMA (endereço obrigatório)');
      }

      // ✅ PROCESSAR PRIMEIRA FATURA (pagamento inicial)
      console.log('🔄 Processando primeira fatura da assinatura...');
      let invoice = null;
      if (subscription.latest_invoice) {
        if (typeof subscription.latest_invoice === 'string') {
          invoice = await stripe.invoices.retrieve(subscription.latest_invoice);
        } else if (subscription.latest_invoice.id) {
          invoice = await stripe.invoices.retrieve(subscription.latest_invoice.id);
        } else {
          console.log('⚠️ latest_invoice não tem ID válido:', subscription.latest_invoice);
        }
      }
      
      if (invoice) {
        console.log('✅ Primeira fatura processada:', invoice.id, 'Status:', invoice.status);
        
        // ✅ NOVO: Verificar se há PaymentIntent para confirmar
        if (invoice.payment_intent) {
          console.log('🔄 PaymentIntent encontrado na fatura:', invoice.payment_intent);
          
          // ✅ CONFIRMAR PAGAMENTO: Se for string, recuperar o PaymentIntent
          let paymentIntent;
          if (typeof invoice.payment_intent === 'string') {
            paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent);
          } else {
            paymentIntent = invoice.payment_intent;
          }
          
          console.log('🔄 Status do PaymentIntent:', paymentIntent.status);
          
          // ✅ CONFIRMAR: Se o PaymentIntent estiver pendente
          if (paymentIntent.status === 'requires_confirmation') {
            console.log('🔄 Confirmando PaymentIntent pendente...');
            const confirmedPaymentIntent = await stripe.paymentIntents.confirm(paymentIntent.id);
            console.log('✅ PaymentIntent confirmado:', confirmedPaymentIntent.status);
          } else if (paymentIntent.status === 'requires_payment_method') {
            console.log('⚠️ PaymentIntent requer método de pagamento');
          } else {
            console.log('ℹ️ PaymentIntent já processado:', paymentIntent.status);
          }
        } else {
          console.log('⚠️ Fatura não tem PaymentIntent associado');
        }
        
        if (invoice.payment_intent) {
          console.log('🔄 Primeira fatura criada, aguardando confirmação...');
          console.log('⚠️ Assinatura criada mas aguardando confirmação da primeira cobrança');
        }
      } else {
        console.log('⚠️ Nenhuma fatura encontrada para processar');
      }

      // ✅ VERIFICAR STATUS FINAL DA ASSINATURA
      const finalSubscription = await stripe.subscriptions.retrieve(subscription.id);
      console.log('✅ Status final da assinatura:', finalSubscription.status);

      // ✅ NOVO: CRIAR USUÁRIO NO SUPABASE APÓS SUCESSO DO STRIPE
      console.log('🔄 Criando usuário no Supabase...');
      try {
        const { supabaseAdmin } = require('../config/supabase');
        
        // ✅ VERIFICAR: Se usuário já existe
        const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          console.error('❌ Erro ao verificar usuários existentes:', listError.message);
        } else {
          const existingUser = existingUsers.users.find(u => u.email === customerEmail);
          
          if (existingUser) {
            console.log('✅ Usuário já existe no Supabase:', existingUser.id);
            
            // ✅ ATUALIZAR: Usuário existente com plano ativo
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
              user_metadata: {
                ...existingUser.user_metadata,
                planType: planType,
                planActivated: true,
                paymentConfirmed: true,
                lastPayment: new Date().toISOString(),
                subscriptionId: subscription.id,
                customerId: customer.id,
                trialPeriod: true,
                trialEnd: new Date(finalSubscription.trial_end * 1000).toISOString()
              }
            });
            
            console.log('✅ Usuário atualizado com plano ativo');
            
          } else {
            console.log('🔄 Usuário não existe, criando novo no Supabase...');
            
            // ✅ VALIDAR: Senha deve ter pelo menos 8 caracteres
            const userPassword = metadata.password;
            if (!userPassword || userPassword.length < 8) {
              console.error('❌ Senha inválida ou muito curta. Usuário não será criado no Supabase.');
            } else {
              // ✅ CRIAR: Novo usuário com dados completos
              const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: customerEmail,
                password: userPassword,
                email_confirm: true,
                user_metadata: {
                  planType: planType,
                  planActivated: true,
                  paymentConfirmed: true,
                  source: 'stripe_checkout',
                  signupDate: new Date().toISOString(),
                  lastPayment: new Date().toISOString(),
                  subscriptionId: subscription.id,
                  customerId: customer.id,
                  trialPeriod: true,
                  trialEnd: new Date(finalSubscription.trial_end * 1000).toISOString(),
                  firstName: metadata.firstName || metadata.userName?.split(' ')[0] || '',
                  lastName: metadata.lastName || metadata.userName?.split(' ').slice(1).join(' ') || '',
                  fullName: metadata.userName || '',
                  phone: metadata.phone || '',
                  signupSource: 'signup_with_plans'
                }
              });
              
              if (createError) {
                console.error('❌ Erro ao criar usuário no Supabase:', createError.message);
              } else {
                console.log('✅ Usuário criado com sucesso no Supabase:', newUser.user.id);
                
                // ✅ CRIAR: Perfil do usuário
                try {
                  await supabaseAdmin
                    .from('user_profiles')
                    .insert({
                      id: newUser.user.id,
                      email: customerEmail,
                      first_name: metadata.firstName || metadata.userName?.split(' ')[0] || '',
                      last_name: metadata.lastName || metadata.userName?.split(' ').slice(1).join(' ') || '',
                      full_name: metadata.userName || '',
                      phone: metadata.phone || '',
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    });
                  
                  console.log('✅ Perfil do usuário criado com sucesso');
                } catch (profileError) {
                  console.error('❌ Erro ao criar perfil do usuário:', profileError.message);
                }
              }
            }
          }
        }
      } catch (supabaseError) {
        console.error('❌ Erro ao criar usuário no Supabase:', supabaseError.message);
        // ✅ IMPORTANTE: Não falhar o checkout se Supabase falhar
        console.log('⚠️ Checkout continuará mesmo com erro no Supabase');
      }

      // ✅ RETORNAR RESULTADO COMPLETO
      return {
        status: 'success',
        customerId: customer.id,
        subscriptionId: subscription.id,
        subscriptionStatus: finalSubscription.status,
        planType: planType,
        interval: interval,
        amount: priceConfig.amount,
        currency: 'brl',
        // ✅ INFORMAÇÕES IMPORTANTES PARA ASSINATURA
        nextBillingDate: finalSubscription.current_period_end,
        cancelAtPeriodEnd: finalSubscription.cancel_at_period_end,
        // ✅ NOVO: INFORMAÇÕES DO PERÍODO DE TESTE
        hasTrialPeriod: !!finalSubscription.trial_start,
        trialStart: finalSubscription.trial_start ? new Date(finalSubscription.trial_start * 1000).toISOString() : null,
        trialEnd: finalSubscription.trial_end ? new Date(finalSubscription.trial_end * 1000).toISOString() : null,
        trialDaysRemaining: finalSubscription.trial_end ? 
          Math.ceil((finalSubscription.trial_end - Math.floor(Date.now() / 1000)) / (24 * 60 * 60)) : 0,
        // ✅ DADOS DA PRIMEIRA COBRANÇA (pode ser null)
        firstInvoiceStatus: invoice ? invoice.status : 'not_created',
        firstPaymentStatus: invoice && invoice.payment_intent ? 'pending' : 'not_required',
        // ✅ NOVO: Informações detalhadas do pagamento
        paymentIntentId: invoice?.payment_intent || null,
        paymentIntentStatus: invoice?.payment_intent ? 
          (typeof invoice.payment_intent === 'string' ? 'retrieved' : invoice.payment_intent.status) : 
          'not_found',
        requiresAction: finalSubscription.status === 'incomplete' && 
          (invoice?.payment_intent ? 
            (typeof invoice.payment_intent === 'string' ? false : 
             ['requires_payment_method', 'requires_confirmation'].includes(invoice.payment_intent.status)) : 
            false),
        // ✅ NOVO: Instruções para completar a assinatura
        nextSteps: finalSubscription.status === 'incomplete' ? 
          'Assinatura criada mas aguardando confirmação do primeiro pagamento. Verifique o status da fatura.' :
          'Assinatura ativa e funcionando normalmente.',
        // ✅ NOVO: Mensagem sobre período de teste
        trialMessage: finalSubscription.trial_start ? 
          `🎁 Período de teste gratuito de 7 dias ativo com 3DS! Primeira cobrança em ${new Date(finalSubscription.current_period_end * 1000).toLocaleDateString('pt-BR')}` :
          'Assinatura ativa sem período de teste',
        // ✅ NOVO: Informações sobre usuário criado no Supabase
        userCreated: true,
        userEmail: customerEmail,
        userMessage: 'Usuário criado com sucesso no sistema. Você pode fazer login com seu email e senha.',
        // ✅ NOVO: Informações de segurança 3DS
        securityFeatures: {
          threeDSecure: 'automatic',
          billingAddressRequired: true,
          trialEndBehavior: 'cancel_if_no_payment_method',
          fraudProtection: 'high'
        }
      };

    } catch (error) {
      logger.error('Erro ao processar assinatura recorrente:', error);
      throw new Error(`Falha ao processar assinatura: ${error.message}`);
    }
  }

  /**
   * Detecta a URL de retorno baseada no ambiente
   */
  getReturnUrl() {
    // ✅ PRIORIDADE 1: Usar APP_URL se configurado
    if (process.env.APP_URL) {
      return `${process.env.APP_URL}/payment/return`;
    }
    
    // ✅ PRIORIDADE 2: Detectar ambiente de desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      // ✅ DESENVOLVIMENTO: Usar HTTPS local na porta 5173
      return 'https://localhost:5173/payment/return';
    }
    
    // ✅ PRIORIDADE 3: Detectar ambiente de produção
    if (process.env.NODE_ENV === 'production') {
      return 'https://fgtsagent.com.br/payment/return';
    }
    
    // ✅ FALLBACK: URL padrão para desenvolvimento
    return 'https://localhost:5173/payment/return';
  }

  /**
   * Detecta a URL de sucesso baseada no ambiente
   */
  getSuccessUrl(planType) {
    // ✅ PRIORIDADE 1: Usar APP_URL se configurado
    if (process.env.APP_URL) {
      return `${process.env.APP_URL}/payment/success?plan=${planType}`;
    }
    
    // ✅ PRIORIDADE 2: Detectar ambiente de desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      // ✅ DESENVOLVIMENTO: Usar HTTPS local na porta 5173
      return `https://localhost:5173/payment/success?plan=${planType}`;
    }
    
    // ✅ PRIORIDADE 3: Detectar ambiente de produção
    if (process.env.NODE_ENV === 'production') {
      return `https://fgtsagent.com.br/payment/success?plan=${planType}`;
    }
    
    // ✅ FALLBACK: URL padrão para desenvolvimento
    return `https://localhost:5173/payment/success?plan=${planType}`;
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

  /**
   * Trata SetupIntent bem-sucedido
   */
  async handleSetupIntentSucceeded(setupIntent) {
    try {
      logger.info(`SetupIntent bem-sucedido: ${setupIntent.id}`);
      
      // ✅ EXTRAIR: Dados do SetupIntent
      const metadata = setupIntent.metadata;
      const customerEmail = metadata.userEmail;
      const planType = metadata.planType;
      const source = metadata.source;
      const interval = metadata.interval;
      
      // ✅ DEBUG: Verificar dados extraídos
      console.log('🔍 [WEBHOOK SETUP_INTENT] Dados extraídos:', {
        setupIntentId: setupIntent.id,
        customerEmail,
        planType,
        source,
        interval,
        status: setupIntent.status,
        usage: setupIntent.usage
      });
      
      // ✅ VERIFICAR: Se é um signup com SetupIntent
      if (source === 'signup_with_plans' && customerEmail && planType) {
        try {
          logger.info(`[WEBHOOK SETUP_INTENT] Processando SetupIntent para signup: ${customerEmail}`);
          
          // ✅ CRIAR: Usuário no Supabase APÓS SetupIntent confirmado
          const { supabaseAdmin } = require('../config/supabase');
          
          // ✅ VERIFICAR: Se usuário já existe (evitar duplicação)
          const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          
          if (listError) {
            logger.error(`[WEBHOOK SETUP_INTENT] Erro ao verificar usuários existentes: ${listError.message}`);
            return false;
          }
          
          const existingUser = existingUsers.users.find(u => u.email === customerEmail);
          
          if (existingUser) {
            logger.info(`[WEBHOOK SETUP_INTENT] Usuário já existe: ${customerEmail}`);
            return true;
          }
          
          // ✅ CRIAR: Novo usuário no Supabase
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: customerEmail,
            email_confirm: true,
            user_metadata: {
              planType: planType,
              interval: interval,
              source: source,
              setupIntentId: setupIntent.id,
              createdAt: new Date().toISOString()
            }
          });
          
          if (createError) {
            logger.error(`[WEBHOOK SETUP_INTENT] Erro ao criar usuário: ${createError.message}`);
            return false;
          }
          
          logger.info(`[WEBHOOK SETUP_INTENT] Usuário criado com sucesso: ${newUser.user.id}`);
          
          // ✅ CRIAR: Perfil do usuário
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
              id: newUser.user.id,
              email: customerEmail,
              plan_type: planType,
              subscription_interval: interval,
              setup_intent_id: setupIntent.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (profileError) {
            logger.error(`[WEBHOOK SETUP_INTENT] Erro ao criar perfil: ${profileError.message}`);
            // ✅ NOTA: Usuário foi criado, mas perfil falhou - não é crítico
          } else {
            logger.info(`[WEBHOOK SETUP_INTENT] Perfil criado com sucesso para usuário: ${newUser.user.id}`);
          }
          
          return true;
          
        } catch (error) {
          logger.error(`[WEBHOOK SETUP_INTENT] Erro ao processar SetupIntent: ${error.message}`);
          return false;
        }
      } else {
        logger.info(`[WEBHOOK SETUP_INTENT] SetupIntent não é para signup: ${setupIntent.id}`);
        return true;
      }
      
    } catch (error) {
      logger.error('Erro ao processar SetupIntent bem-sucedido:', error);
      return false;
    }
  }

  /**
   * Obtém configurações padrão para 3DS em assinaturas
   * ✅ BASEADO NA DOCUMENTAÇÃO OFICIAL DO STRIPE
   */
  get3DSConfig() {
    return {
      // ✅ 3DS AUTOMÁTICO: Otimiza conversão e segurança
      request_three_d_secure: 'automatic',
      
      // ✅ COMPORTAMENTO DO TRIAL: Cancelar se não houver método de pagamento
      trial_settings: {
        end_behavior: {
          missing_payment_method: 'cancel'
        }
      },
      
      // ✅ COLETAR ENDEREÇO: Necessário para 3DS
      billing_address_collection: 'required',
      
              // ✅ PERÍODO DE TESTE: 7 dias
              trial_period_days: 7
    };
  }

  /**
   * Cria uma assinatura recorrente com free trial
   * Ideal para modelos SaaS com cobrança recorrente
   */
  async createSubscriptionWithTrial(planType, customerEmail, userName, metadata = {}, interval = 'monthly') {
    try {
      console.log('🔄 Criando assinatura recorrente com free trial:', { planType, customerEmail, interval });
      
      // ✅ BUSCAR CONFIGURAÇÃO DO PLANO
      const priceConfig = await getPlanConfig(planType, interval);
      if (!priceConfig) {
        throw new Error(`Configuração não encontrada para o plano ${planType} - ${interval}`);
      }

      // ✅ CONVERTER INTERVALO PARA FORMATO STRIPE
      const stripeInterval = interval === 'monthly' ? 'month' : 'year';
      
      // ✅ BUSCAR OU CRIAR CLIENTE
      let customer;
      try {
        const existingCustomers = await stripe.customers.list({
          email: customerEmail,
          limit: 1
        });
        
        if (existingCustomers.data.length > 0) {
          customer = existingCustomers.data[0];
          console.log('✅ Cliente existente encontrado:', customer.id);
        } else {
          customer = await this.createCustomer(customerEmail, userName, {
            source: 'signup_subscription',
            planType,
            interval
          });
          console.log('✅ Novo cliente criado:', customer.id);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar/criar cliente:', error);
        throw new Error(`Falha ao gerenciar cliente: ${error.message}`);
      }

      // ✅ CRIAR SETUP INTENT PARA VALIDAR CARTÃO
      const setupIntent = await stripe.setupIntents.create({
        customer: customer.id,
        payment_method_types: ['card'],
        usage: 'off_session', // ✅ Para cobranças futuras (assinaturas)
        metadata: {
          planType,
          interval,
          source: 'signup_subscription',
          customerEmail,
          userName: userName.trim(),
          ...metadata
        }
      });

      console.log('✅ Setup Intent criado:', setupIntent.id);

      // ✅ CRIAR ASSINATURA COM FREE TRIAL
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: priceConfig.priceId,
        }],
        trial_period_days: 7, // ✅ FREE TRIAL DE 7 DIAS
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'pause' // ✅ Pausar se não houver método de pagamento (não cancelar)
          }
        },
        metadata: {
          planType,
          interval,
          source: 'signup_subscription',
          customerEmail,
          userName: userName.trim(),
          ...metadata
        },
        // ✅ CONFIGURAÇÕES DE COBRANÇA
        collection_method: 'charge_automatically',
        expand: ['latest_invoice.payment_intent'],
        // ✅ IMPORTANTE: Permitir que o SetupIntent seja anexado
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription'
        }
      });

      console.log('✅ Assinatura criada com free trial:', {
        id: subscription.id,
        status: subscription.status,
        trialEnd: subscription.trial_end,
        currentPeriodEnd: subscription.current_period_end
      });

      // ✅ RETORNAR DADOS COMPLETOS
      return {
        subscription,
        setupIntent,
        customer,
        planConfig: priceConfig
      };

    } catch (error) {
      console.error('❌ Erro ao criar assinatura com free trial:', error);
      throw new Error(`Falha ao criar assinatura: ${error.message}`);
    }
  }

  /**
   * Anexa um método de pagamento a uma assinatura existente
   * Necessário para manter a assinatura ativa após o free trial
   */
  async attachPaymentMethodToSubscription(subscriptionId, paymentMethodId) {
    try {
      console.log('🔄 Anexando método de pagamento à assinatura:', { subscriptionId, paymentMethodId });

      // ✅ 1. ANEXAR MÉTODO DE PAGAMENTO AO CLIENTE
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['customer', 'default_payment_method']
      });

      if (!subscription.customer) {
        throw new Error('Assinatura não possui cliente associado');
      }

      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer.id;

      // ✅ 2. ANEXAR MÉTODO DE PAGAMENTO AO CLIENTE
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });

      // ✅ 3. DEFINIR COMO MÉTODO PADRÃO DO CLIENTE
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      // ✅ 4. DEFINIR COMO MÉTODO PADRÃO DA ASSINATURA
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        default_payment_method: paymentMethodId
      });

      console.log('✅ Método de pagamento anexado com sucesso:', {
        subscriptionId,
        paymentMethodId,
        customerId,
        status: updatedSubscription.status
      });

      return {
        subscription: updatedSubscription,
        paymentMethod: paymentMethodId,
        customer: customerId
      };

    } catch (error) {
      console.error('❌ Erro ao anexar método de pagamento:', error);
      throw new Error(`Falha ao anexar método de pagamento: ${error.message}`);
    }
  }

  /**
   * Realiza login automático após criação de usuário via webhook
   */
  async performAutoLoginAfterWebhook(email, password, userData) {
    try {
      logger.info(`[AUTO-LOGIN] Tentando login automático para: ${email}`);
      
      // ✅ CRIAR: Sessão no Supabase
      const { supabaseAdmin } = require('../config/supabase');
      
      // ✅ VERIFICAR: Se usuário existe e está ativo
      const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
      
      if (userError || !user) {
        throw new Error(`Usuário não encontrado: ${email}`);
      }
      
      if (!user.email_confirmed_at) {
        throw new Error(`Email não confirmado: ${email}`);
      }
      
      // ✅ CRIAR: Sessão de autenticação
      const { data: { session }, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: `${process.env.FRONTEND_URL || 'https://localhost:5173'}/dashboard`,
          data: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            planType: userData.planType,
            stripeCustomerId: userData.stripeCustomerId,
            stripeSubscriptionId: userData.stripeSubscriptionId,
            source: 'webhook_auto_login'
          }
        }
      });
      
      if (sessionError) {
        throw new Error(`Erro ao criar sessão: ${sessionError.message}`);
      }
      
      // ✅ ARMAZENAR: Dados da sessão para uso posterior
      const sessionData = {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        userId: user.id,
        email: user.email,
        userData: userData,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
      };
      
      // ✅ SALVAR: Sessão no Redis ou banco para uso posterior
      // TODO: Implementar armazenamento de sessão
      logger.info(`[AUTO-LOGIN] Sessão criada com sucesso para: ${email}`);
      
      return {
        success: true,
        session: sessionData,
        user: user
      };
      
    } catch (error) {
      logger.error(`[AUTO-LOGIN] Erro no login automático: ${error.message}`);
      throw error;
    }
  }

  /**
   * Limpa resíduos de sessão falhada após login automático
   */
  async cleanupFailedAutoLogin(email) {
    try {
      logger.info(`[CLEANUP] Limpando resíduos de sessão falhada para: ${email}`);
      
      // ✅ VERIFICAR: Se há sessões ativas para este email
      const { supabaseAdmin } = require('../config/supabase');
      
      // ✅ BUSCAR: Usuário por email
      const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
      
      if (userError || !user) {
        logger.warn(`[CLEANUP] Usuário não encontrado para limpeza: ${email}`);
        return false;
      }
      
      // ✅ IMPORTANTE: Revogar todas as sessões ativas do usuário
      const { error: revokeError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { 
          app_metadata: {
            ...user.app_metadata,
            last_cleanup: new Date().toISOString(),
            failed_auto_login: true
          }
        }
      );
      
      if (revokeError) {
        logger.warn(`[CLEANUP] Erro ao atualizar metadados: ${revokeError.message}`);
      }
      
      logger.info(`[CLEANUP] Limpeza de resíduos concluída para: ${email}`);
      return true;
      
    } catch (error) {
      logger.error(`[CLEANUP] Erro na limpeza de resíduos: ${error.message}`);
      return false;
    }
  }
}

module.exports = new StripeService(); 