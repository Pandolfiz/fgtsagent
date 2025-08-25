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
   * Cria um PaymentIntent para checkout nativo (sem confirmar)
   * Ideal para confirmCardPayment no frontend
   */
  async createPaymentIntentOnly(planType, customerEmail, metadata = {}, interval = 'monthly') {
    try {
      const plan = PLANS[planType.toUpperCase()];
      if (!plan) {
        throw new Error('Plano não encontrado');
      }

      const priceConfig = plan.prices[interval];
      if (!priceConfig) {
        throw new Error(`Intervalo de pagamento '${interval}' não suportado para este plano`);
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
        description: `Assinatura ${plan.name} - ${interval} (Checkout Nativo)`,
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
        status: paymentIntent.status
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
   * Cria uma sessão de checkout
   */
  async createCheckoutSession(planType, customerEmail, successUrl, cancelUrl, metadata = {}, interval = 'monthly', usePopup = false) {
    try {
      const plan = PLANS[planType.toUpperCase()];
      if (!plan) {
        throw new Error('Plano não encontrado');
      }

      const priceConfig = plan.prices[interval];
      if (!priceConfig) {
        throw new Error(`Intervalo de pagamento '${interval}' não suportado para este plano`);
      }

      // ✅ CONFIGURAÇÃO: Para popup ou redirect
      const sessionConfig = {
        payment_method_types: ['card'],
        line_items: [{
          price: priceConfig.priceId,
          quantity: 1,
        }],
        mode: 'subscription',
        customer_email: customerEmail,
        metadata: {
          plan: planType,
          interval: interval,
          customerEmail,
          usePopup: usePopup.toString(),
          ...metadata
        },
        locale: 'pt-BR',
        subscription_data: {
          metadata: {
            plan: planType,
            interval: interval,
            customerEmail,
            usePopup: usePopup.toString()
          }
        }
      };

      // ✅ POPUP: URLs específicas para popup
      if (usePopup) {
        sessionConfig.success_url = `${successUrl}?popup=true&session_id={CHECKOUT_SESSION_ID}`;
        sessionConfig.cancel_url = `${cancelUrl}?popup=true&cancelled=true`;
        sessionConfig.payment_method_collection = 'always'; // Forçar coleta de método de pagamento
      } else {
        // ✅ REDIRECT: URLs tradicionais
        sessionConfig.success_url = successUrl;
        sessionConfig.cancel_url = cancelUrl;
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

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
   * Processa pagamento completo com Stripe (criação de conta + assinatura RECORRENTE)
   * Frontend envia dados do cartão, backend processa tudo
   */
  async processCompletePayment(planType, customerEmail, cardData = {}, metadata = {}, interval = 'monthly') {
    try {
      console.log('🔄 Iniciando processamento completo de ASSINATURA RECORRENTE...');
      
      // ✅ VALIDAR PLANO
      const plan = PLANS[planType.toUpperCase()];
      if (!plan) {
        throw new Error('Plano não encontrado');
      }

      const priceConfig = plan.prices[interval];
      if (!priceConfig) {
        throw new Error(`Intervalo de pagamento '${interval}' não suportado para este plano`);
      }

      console.log('✅ Plano validado:', { planType, interval, price: priceConfig });

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

      // ✅ CRIAR ASSINATURA RECORRENTE DIRETAMENTE (sem PaymentMethod)
      console.log('🔄 Criando ASSINATURA RECORRENTE...');
      
      const subscriptionData = {
        customer: customer.id,
        items: [{ price: priceConfig.priceId }],
        // ✅ CONFIGURAÇÃO PARA ASSINATURA RECORRENTE
        payment_behavior: 'default_incomplete', // Permite pagamento inicial falhar
        payment_settings: { 
          save_default_payment_method: 'on_subscription', // Salva método de pagamento
          payment_method_types: ['card'] // Aceita apenas cartão
        },
        // ✅ METADADOS IMPORTANTES PARA ASSINATURA
        metadata: {
          plan: planType,
          interval: interval,
          source: metadata.source,
          user_agent: 'fgtsagent_backend',
          customer_email: customerEmail,
          customer_name: metadata.userName,
          ...metadata
        },
        // ✅ EXPANDIR DADOS IMPORTANTES
        expand: ['latest_invoice.payment_intent']
      };

      console.log('🔄 Dados da assinatura:', subscriptionData);

      const subscription = await stripe.subscriptions.create(subscriptionData);

      console.log('✅ Assinatura RECORRENTE criada:', subscription.id);

      // ✅ PROCESSAR PRIMEIRA FATURA (pagamento inicial)
      console.log('🔄 Processando primeira fatura da assinatura...');
      
      // ✅ CORREÇÃO: subscription.latest_invoice é um objeto, precisamos do ID
      let invoice = null;
      if (subscription.latest_invoice) {
        if (typeof subscription.latest_invoice === 'string') {
          // ✅ Se for string (ID), usar diretamente
          invoice = await stripe.invoices.retrieve(subscription.latest_invoice);
        } else if (subscription.latest_invoice.id) {
          // ✅ Se for objeto, usar o ID
          invoice = await stripe.invoices.retrieve(subscription.latest_invoice.id);
        } else {
          console.log('⚠️ latest_invoice não tem ID válido:', subscription.latest_invoice);
        }
      }
      
      if (invoice) {
        console.log('✅ Primeira fatura processada:', invoice.id, 'Status:', invoice.status);
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
        // ✅ DADOS DA PRIMEIRA COBRANÇA (pode ser null)
        firstInvoiceStatus: invoice ? invoice.status : 'not_created',
        firstPaymentStatus: invoice && invoice.payment_intent ? 'pending' : 'not_required'
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
      // ✅ DESENVOLVIMENTO: Usar HTTPS local na porta 5174
      return 'https://localhost:5174/payment/return';
    }
    
    // ✅ PRIORIDADE 3: Detectar ambiente de produção
    if (process.env.NODE_ENV === 'production') {
      return 'https://fgtsagent.com.br/payment/return';
    }
    
    // ✅ FALLBACK: URL padrão para desenvolvimento
    return 'https://localhost:5174/payment/return';
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
      // ✅ DESENVOLVIMENTO: Usar HTTPS local na porta 5174
      return `https://localhost:5174/payment/success?plan=${planType}`;
    }
    
    // ✅ PRIORIDADE 3: Detectar ambiente de produção
    if (process.env.NODE_ENV === 'production') {
      return `https://fgtsagent.com.br/payment/success?plan=${planType}`;
    }
    
    // ✅ FALLBACK: URL padrão para desenvolvimento
    return `https://localhost:5174/payment/success?plan=${planType}`;
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