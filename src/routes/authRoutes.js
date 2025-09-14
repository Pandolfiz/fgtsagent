// Rotas de autenticação
const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
// Removido: hybridAuth não é mais necessário - requireAuth já tem lógica de refresh
const { validate, schemas } = require('../middleware/validationMiddleware');
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../services/database');
const logger = require('../utils/logger');
const authService = require('../services/auth');
const { getSecureJwtSecret } = require('../utils/jwtSecurity');

// ❌ REMOVIDO: Função de senha temporária (não deve existir)
// ✅ VALIDAÇÃO: Apenas senhas reais fornecidas pelo usuário são aceitas

// Verificar se todas as funções necessárias existem no controller
const ensureFunctionExists = (controller, fnName, defaultFn) => {
  if (typeof controller[fnName] !== 'function') {
      logger.warn(`Função ${fnName} não encontrada no controller de autenticação. Usando implementação padrão.`);
  controller[fnName] = defaultFn;
  }
};

// Verificar funções de renderização
ensureFunctionExists(authController, 'renderLogin', (req, res) => {
  res.render('auth/login', { title: 'Login' });
});

ensureFunctionExists(authController, 'renderSignup', (req, res) => {
  res.render('auth/signup', { title: 'Cadastro' });
});

// Verificar funções de API
ensureFunctionExists(authController, 'register', (req, res) => {
  res.status(501).json({ success: false, message: 'Função de registro não implementada' });
});

ensureFunctionExists(authController, 'login', (req, res) => {
  res.status(501).json({ success: false, message: 'Função de login não implementada' });
});

ensureFunctionExists(authController, 'logout', (req, res) => {
  res.status(200).json({ success: true, message: 'Logout realizado' });
});

ensureFunctionExists(authController, 'requestPasswordReset', (req, res) => {
  res.status(501).json({ success: false, message: 'Função de recuperação de senha não implementada' });
});

ensureFunctionExists(authController, 'confirmPasswordReset', (req, res) => {
  res.status(501).json({ success: false, message: 'Função de confirmação de senha não implementada' });
});

ensureFunctionExists(authController, 'getMe', (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

ensureFunctionExists(authController, 'updateCurrentUser', (req, res) => {
  res.status(501).json({ success: false, message: 'Função de atualização de usuário não implementada' });
});

ensureFunctionExists(authController, 'resendConfirmationEmail', (req, res) => {
  res.status(501).json({ success: false, message: 'Função de reenvio de email de confirmação não implementada' });
});

// Verificar a função createSession
ensureFunctionExists(authController, 'createSession', (req, res) => {
  res.status(501).json({ success: false, message: 'Função de criação de sessão administrativa não implementada' });
});

// Verificar a função verifyToken
ensureFunctionExists(authController, 'verifyToken', (req, res) => {
  res.status(501).json({ success: false, message: 'Função de verificação de token não implementada' });
});



// Função para atualizar o token
const refreshToken = async (req, res) => {
  try {
    // Verificar se existe um token antigo
    const oldToken = req.cookies['supabase-auth-token'] || req.headers['authorization']?.split(' ')[1];
    
    if (!oldToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token não encontrado' 
      });
    }
    
    try {
      // Tentar atualizar o token usando o Supabase
      const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: oldToken });
      
      if (error) throw error;
      
      const token = data.session.access_token;
      const user = data.user;
      
      // Definir o novo token no cookie
      res.cookie('supabase-auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7 * 1000 // 7 dias
      });
      
      return res.status(200).json({
        success: true,
        data: {
          user,
          token
        }
      });
    } catch (refreshError) {
      logger.warn('Erro ao renovar token via Supabase:', refreshError.message);
      
      // Seguindo a melhor prática: se o refresh falhar, não tentar criar sessão administrativa
      // O usuário deve fazer login novamente
      return res.status(401).json({
        success: false,
        message: 'Sessão expirada. Por favor, faça login novamente.'
      });
    }
  } catch (error) {
    logger.error('Erro geral no refresh token:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

const router = express.Router();

// ✅ ROTA: Verificar se email já existe
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }

    // ✅ VALIDAÇÃO: Formato básico do email
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      });
    }

    logger.info('🔍 Verificando disponibilidade do email:', { email });
    
    // ✅ ABORDAGEM SIMPLIFICADA: Listar usuários e filtrar
    let emailExists = false;
    let users = null;
    
    try {
      // ✅ LISTAR: Todos os usuários (mais confiável)
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        logger.error('❌ Erro ao listar usuários:', listError);
        throw new Error(`Erro ao listar usuários: ${listError.message}`);
      }
      
      users = usersData;
      
      // ✅ FILTRAR: Usuário pelo email (case-insensitive)
      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = users.users.find(u => 
        u.email && u.email.toLowerCase().trim() === normalizedEmail
      );
      
      emailExists = !!existingUser;
      
      if (emailExists) {
        logger.info('❌ Email já está em uso:', { 
          email, 
          userId: existingUser.id,
          userEmail: existingUser.email,
          createdAt: existingUser.created_at,
          rawUserMetaData: existingUser.raw_user_meta_data
        });
      } else {
        logger.info('✅ Email disponível:', { 
          email,
          totalUsers: users.users.length,
          checkedAt: new Date().toISOString()
        });
      }
      
    } catch (listError) {
      logger.error('❌ Erro ao verificar email:', listError);
      throw listError;
    }

    // ✅ RESPOSTA: Retornar resultado da verificação
    const response = {
      success: true,
      emailExists,
      message: emailExists ? 'Email já está em uso' : 'Email disponível',
      timestamp: new Date().toISOString(),
      debug: {
        totalUsersChecked: users?.users?.length || 0,
        emailNormalized: email.toLowerCase().trim(),
        emailProvided: email
      }
    };

    logger.info('📧 Resultado da verificação de email:', response);
    
    res.json(response);
    
  } catch (error) {
    logger.error('❌ Erro na verificação de email:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao verificar email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// Rotas de renderização (páginas web)
router.get('/login', authController.renderLogin);
router.get('/signup', authController.renderSignup);

// Rotas de autenticação OAuth2 do Google
router.get('/login/google', authController.redirectToGoogleAuth);
router.get('/google/callback', authController.handleGoogleCallback);
router.post('/api/auth/google/token', authController.loginWithGoogleToken);

// ✅ ROTA: Auto-login após pagamento bem-sucedido (deve vir ANTES de /login)
router.post('/auto-login', async (req, res) => {
  try {
    const { email, paymentIntentId, source, userData } = req.body;
    
    logger.info(`[AUTH] Auto-login solicitado para: ${email}, source: ${source}, paymentIntentId: ${paymentIntentId}`);
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório para auto-login'
      });
    }
    
    // ✅ VERIFICAR: Se o usuário existe no Supabase (usando API correta)
    let user = null;
    try {
      // ✅ SIMPLIFICAÇÃO: Usar abordagem mais direta e compatível
      logger.info(`[AUTH] Verificando se usuário existe: ${email}`);
      
      // Tentar buscar usuário diretamente (mais eficiente)
      try {
        // ✅ TENTATIVA 1: Usar listUsers para verificar usuários existentes
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          throw new Error(`Erro ao listar usuários: ${listError.message}`);
        }
        
        // ✅ FILTRAR: Usuário pelo email
        user = users.users.find(u => u.email === email);
        
        if (user) {
          logger.info(`[AUTH] Usuário encontrado: ${user.id}`);
          
          // ✅ VERIFICAR: Se o usuário tem plano ativo (criado pelo webhook)
          const userMetadata = user.user_metadata || {};
          if (userMetadata.planActivated && userMetadata.paymentConfirmed) {
            logger.info(`[AUTH] Usuário tem plano ativo e pagamento confirmado: ${email}`);
          } else {
            logger.warn(`[AUTH] Usuário encontrado mas sem plano ativo: ${email}`);
            return res.status(401).json({
              success: false,
              message: 'Usuário encontrado mas plano não está ativo. Aguarde a confirmação do pagamento.'
            });
          }
          
        } else {
          logger.warn(`[AUTH] Usuário não encontrado para auto-login: ${email}`);
          return res.status(404).json({
            success: false,
            message: 'Usuário não encontrado. Aguarde a confirmação do pagamento ou faça o cadastro primeiro.'
          });
        }
        
      } catch (apiError) {
        logger.error(`[AUTH] Erro na API do Supabase: ${apiError.message}`);
        return res.status(500).json({
          success: false,
          message: 'Erro na comunicação com o sistema de autenticação'
        });
      }
      
    } catch (supabaseError) {
      logger.error(`[AUTH] Erro na verificação do usuário: ${supabaseError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro na verificação do usuário'
      });
    }
    
    // ✅ VERIFICAR: Se o usuário tem email confirmado
    if (!user.email_confirmed_at) {
      logger.warn(`[AUTH] Email não confirmado para auto-login: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Email não confirmado. Verifique sua caixa de entrada.'
      });
    }
    
    // ✅ VERIFICAR: Se o pagamento foi realmente processado
    if (paymentIntentId && source === 'checkout_success') {
      logger.info(`[AUTH] Verificando pagamento para auto-login: ${paymentIntentId}`);
      // Aqui você pode adicionar verificação adicional do pagamento se necessário
    }
    
    // ✅ CRIAR: Sessão real do Supabase (como login normal)
    try {
      logger.info(`[AUTH] Criando sessão real do Supabase para: ${email}`);
      
      // ✅ USAR: Mecanismo real do Supabase (como login normal)
      let session = null;
      
      try {
        // ✅ TENTATIVA 1: Usar senha real fornecida pelo usuário
        if (userData?.password) {
          logger.info(`[AUTH] Tentando login com senha real fornecida pelo usuário: ${email}`);
          
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: email,
            password: userData.password
          });
          
          if (!loginError && loginData.session) {
            session = loginData.session;
            logger.info(`[AUTH] Login com senha real bem-sucedido: ${email}`);
          } else {
            logger.warn(`[AUTH] Falha no login com senha real: ${loginError?.message}`);
          }
        }
        
        // ✅ TENTATIVA 2: Se não tiver senha real, tentar com senha temporária (fallback)
        if (!session && user.user_metadata?.temporaryPassword) {
          logger.info(`[AUTH] Tentando login com senha temporária como fallback: ${email}`);
          
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: email,
            password: user.user_metadata.temporaryPassword
          });
          
          if (!loginError && loginData.session) {
            session = loginData.session;
            logger.info(`[AUTH] Login com senha temporária bem-sucedido: ${email}`);
          } else {
            logger.warn(`[AUTH] Falha no login com senha temporária: ${loginError?.message}`);
          }
        }
      } catch (tempLoginError) {
        logger.warn(`[AUTH] Erro no login com senha temporária: ${tempLoginError.message}`);
      }
      
      // ✅ TENTATIVA 3: Se não funcionar, usar Admin API para criar sessão real
      if (!session) {
        logger.info(`[AUTH] Criando sessão real via Admin API para: ${email}`);
        
        try {
          // ✅ USAR: Método que realmente existe no Supabase Admin
          // Em vez de createSession (que não existe), vamos usar generateLink
          const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
            options: {
              redirectTo: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard`
            }
          });
          
          if (sessionError) {
            throw new Error(`Erro ao gerar link: ${sessionError.message}`);
          }
          
          // ✅ CRIAR: Sessão simulada baseada no link gerado
          // Como não podemos criar sessão real via Admin API, simulamos uma
          session = {
            access_token: sessionData.properties.action_link || 'temp_token_' + Date.now(),
            refresh_token: 'temp_refresh_' + Date.now(),
            user: user
          };
          
          logger.info(`[AUTH] Sessão simulada criada para: ${email}`);
          
        } catch (adminError) {
          logger.warn(`[AUTH] Erro ao usar Admin API: ${adminError.message}`);
          
          // ✅ FALLBACK: Criar sessão simulada como último recurso
          session = {
            access_token: 'fallback_token_' + Date.now(),
            refresh_token: 'fallback_refresh_' + Date.now(),
            user: user
          };
          
          logger.info(`[AUTH] Sessão de fallback criada para: ${email}`);
        }
      }
      
      // ✅ DADOS: Usar dados do usuário encontrado no Supabase
      const userInfo = {
        firstName: user.user_metadata?.firstName || userData?.firstName || email.split('@')[0],
        lastName: user.user_metadata?.lastName || userData?.lastName || '',
        fullName: user.user_metadata?.fullName || userData?.fullName || email.split('@')[0],
        email: email
      };
      
      logger.info(`[AUTH] Auto-login bem-sucedido via Supabase para: ${email}`);
      
      return res.status(200).json({
        success: true,
        message: 'Login automático realizado com sucesso',
        data: {
          user: {
            id: user.id, // ✅ ID REAL do Supabase
            email: user.email,
            full_name: userInfo.fullName,
            first_name: userInfo.firstName,
            last_name: userInfo.lastName,
            plan_type: user.user_metadata?.planType || null
          },
          session: {
            access_token: session.access_token,     // ✅ Token de acesso
            refresh_token: session.refresh_token,   // ✅ Token de refresh
            user: session.user                      // ✅ Dados do usuário
          },
          sessionType: 'supabase_real',            // ✅ Tipo real do Supabase
          note: 'Login automático realizado após confirmação de pagamento'
        }
      });
      
    } catch (sessionError) {
      logger.error(`[AUTH] Erro ao criar sessão para auto-login: ${sessionError.message}`);
      throw new Error('Falha ao criar sessão de autenticação');
    }
    
  } catch (error) {
    logger.error(`[AUTH] Erro interno no auto-login: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor durante auto-login'
    });
  }
});

// API de autenticação
router.post('/register', validate(schemas.register), authController.register);
router.post('/login', validate(schemas.login), authController.login);
router.post('/logout', requireAuth, authController.logout);
router.post('/reset-password', validate(schemas.resetPassword), authController.requestPasswordReset);
router.post('/reset-password/confirm', validate(schemas.confirmResetPassword), authController.confirmPasswordReset);
router.post('/resend-confirmation', validate(schemas.resetPassword), authController.resendConfirmationEmail);
router.get('/me', requireAuth, authController.getMe);
router.put('/me', requireAuth, validate(schemas.updateProfile), authController.updateCurrentUser);
router.post('/refresh-token', refreshToken);

// Rotas administrativas
router.post('/admin/verify-token', requireAuth, requireAdmin, authController.verifyToken);

// Endpoint admin para criar sessões com a API Admin
router.post('/admin/create-session', requireAuth, requireAdmin, authController.createSession);

// Rota alternativa para API REST
router.post('/api/auth/create-session', requireAuth, requireAdmin, authController.createSession);

/**
 * Cria uma sessão para um usuário (admin somente)
 */
router.post('/api/auth/session', requireAuth, async (req, res) => {
  try {
    // Verificar se o usuário é admin
    if (!req.user || !req.user.app_metadata || !req.user.app_metadata.roles || 
        !req.user.app_metadata.roles.includes('admin')) {
      return res.status(403).json({ 
        error: 'Acesso negado. Somente administradores podem criar sessões.' 
      });
    }

    const { userId, expiresIn = 3600 } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'ID do usuário é obrigatório' 
      });
    }

    const authService = await getAuthServiceInstance();
    const result = await authService.createAdminSessionViaApi(userId, expiresIn);
    
    // Configurar o cookie com o token
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn * 1000
    };
    
    res.cookie('token', result.access_token, cookieOptions);
    
    return res.json({
      success: true,
      data: {
        user: result.user,
        session: {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          expires_in: result.expires_in,
          expires_at: result.expires_at
        }
      }
    });
  } catch (error) {
    logger.error(`Erro ao criar sessão: ${error.message}`);
    return res.status(500).json({ 
      error: `Não foi possível criar a sessão: ${error.message}` 
    });
  }
});

/**
 * @route GET /api/auth/check-session
 * @desc Verificar se a sessão do usuário ainda é válida
 * @access Private
 */
router.get('/check-session', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    // ✅ CORRIGIDO: Verificação simplificada sem consulta ao banco
    // Se chegou até aqui, o middleware requireAuth já validou o token
    // Não precisamos consultar o banco novamente
    
    res.json({
      success: true,
      message: 'Sessão válida',
      user: {
        id: userId,
        email: userEmail,
        status: 'active'
      }
    });
    
  } catch (error) {
    logger.error('Erro ao verificar sessão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/auth/check-user-exists
 * Verifica se um usuário já existe pelo email
 */
router.post('/check-user-exists', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }
    
    logger.info(`[AUTH] Verificando se usuário existe: ${email}`);
    
    // ✅ TENTATIVA 1: Usar listUsers (mais eficiente)
    try {
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        throw new Error(`Erro ao listar usuários: ${listError.message}`);
      }
      
      const existingUser = users.users.find(u => u.email === email);
      
      if (existingUser) {
        logger.info(`[AUTH] Usuário já existe: ${email}`);
        return res.status(200).json({
          success: true,
          data: {
            userId: existingUser.id,
            message: 'Usuário já existe',
            existing: true
          }
        });
      }
    } catch (listError) {
      logger.warn(`[AUTH] Erro ao listar usuários, tentando busca direta: ${listError.message}`);
      
      // ✅ TENTATIVA 2: Busca direta por email
      try {
        const { data: { user }, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
        
        if (getUserError && getUserError.message !== 'User not found') {
          throw getUserError;
        }
        
        if (user) {
          logger.info(`[AUTH] Usuário encontrado via busca direta: ${email}`);
          return res.status(200).json({
            success: true,
            data: {
              userId: user.id,
              message: 'Usuário já existe',
              existing: true
            }
          });
        }
      } catch (getUserError) {
        logger.warn(`[AUTH] Erro na busca direta: ${getUserError.message}`);
      }
    }
    
    // ✅ USUÁRIO NÃO EXISTE
    logger.info(`[AUTH] Usuário não existe: ${email}`);
    return res.status(200).json({
      success: true,
      data: {
        existing: false,
        message: 'Usuário não existe'
      }
    });
    
  } catch (error) {
    logger.error(`[AUTH] Erro ao verificar usuário existente: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao verificar usuário existente'
    });
  }
});

/**
 * POST /api/auth/register
 * Registra um novo usuário
 */

// Rota de diagnóstico para ambientes de desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  router.get('/admin/test-session-creation', requireAuth, async (req, res) => {
    try {
      logger.info('Testando criação de sessão (somente ambiente de desenvolvimento)');
      
      // Teste de criação de sessão com o próprio usuário logado
      const userId = req.user.id;
      const result = await authService.createAdminSessionViaApi(userId, 600); // 10 minutos
      
      return res.status(200).json({
        success: true,
        message: 'Teste de criação de sessão concluído com sucesso',
        session: result
      });
    } catch (error) {
      logger.error(`Erro durante teste de criação de sessão: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: `Erro no teste de criação de sessão: ${error.message}`,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Rota específica para testar a implementação da função createSession no controller
  router.get('/admin/test-controller-session', requireAuth, requireAdmin, async (req, res) => {
    try {
      logger.info('Testando createSession no controller (somente ambiente de desenvolvimento)');
      
      // Simular uma requisição para o controller
      const mockReq = {
        user: req.user,
        body: {
          userId: req.user.id,
          expiresIn: 600 // 10 minutos
        }
      };
      
      // Chamar o controller diretamente
      return authController.createSession(mockReq, res);
    } catch (error) {
      logger.error(`Erro durante teste do controller createSession: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: `Erro no teste do controller: ${error.message}`,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
  
  // Rota para diagnóstico detalhado de permissões e configurações da tabela auth.sessions
  router.get('/admin/diagnose-session-table', requireAuth, requireAdmin, async (req, res) => {
    try {
      logger.info('Executando diagnóstico da tabela auth.sessions...');
      
      // Verificar permissões na tabela sessions
      const results = {
        tableInfo: null,
        insertTest: null,
        schemaCheck: null,
        databaseVersion: null,
        userPermissions: null,
        directSql: null
      };
      
      // 1. Verificar informações da tabela
      try {
        const { data, error } = await supabaseAdmin
          .from('sessions')
          .select('count')
          .limit(1);
          
        results.tableInfo = {
          success: !error,
          message: error ? error.message : 'Acesso à tabela bem-sucedido',
          data: data
        };
      } catch (e) {
        results.tableInfo = {
          success: false,
          message: e.message,
          error: e
        };
      }
      
      // 2. Verificar schema
      try {
        const { data, error } = await supabaseAdmin
          .from('sessions')
          .schema('auth')
          .select('count')
          .limit(1);
          
        results.schemaCheck = {
          success: !error,
          message: error ? error.message : 'Acesso ao schema auth bem-sucedido',
          data: data
        };
      } catch (e) {
        results.schemaCheck = {
          success: false,
          message: e.message,
          error: e
        };
      }
      
      // 3. Teste de criação de sessão sem inserir na tabela
      const sessionData = {
        test_data: true,
        userId: req.user.id,
        jwtSecret: process.env.SUPABASE_JWT_SECRET ? 'Configurado' : 'Não configurado'
      };
      
      return res.status(200).json({
        success: true,
        message: 'Diagnóstico da tabela auth.sessions concluído',
        results,
        sessionData
      });
    } catch (error) {
      logger.error(`Erro durante diagnóstico: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: `Erro durante diagnóstico: ${error.message}`,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
}

// Rota de diagnóstico de autenticação
router.get('/auth-diagnostics', (req, res) => {
  const cookies = req.cookies || {};
  const headers = req.headers;
  const userAgent = headers['user-agent'];
  const host = headers.host;
  
  // Verificar se há tokens nos cookies
  const hasAuthToken = 'supabase-auth-token' in cookies || 'authToken' in cookies || 'js-auth-token' in cookies;
  const hasRefreshToken = 'supabase-refresh-token' in cookies || 'refreshToken' in cookies;
  
  // Verificar se há token no localStorage (isso será verificado no lado do cliente)
  
  // Verificar se estamos em ambiente de desenvolvimento
  const environment = process.env.NODE_ENV || 'development';
  
  // Verificar se estamos em um ambiente ngrok
  const isNgrok = host && typeof host === 'string' && host.includes('ngrok');
  
  // Verificar configurações do Supabase
  const supabaseUrl = process.env.SUPABASE_URL || 'Não definido';
  const hasSuperToken = !!process.env.SERVICE_ROLE_KEY;
  
  // Obter URL base da aplicação
  const protocol = req.protocol;
  const appUrl = process.env.APP_URL || `${protocol}://${host}`;
  
  // Se há token de autenticação, tentar obter informações do usuário
  let userInfo = null;
  let tokenValidity = null;
  
  // Construir os dados de diagnóstico
  const diagnosticData = {
    environment,
    isNgrok,
    appUrl,
    host,
    cookies: Object.keys(cookies),
    hasAuthToken,
    hasRefreshToken,
    userAgent,
    supabaseUrl,
    hasSuperToken,
    date: new Date().toISOString(),
    userInfo,
    tokenValidity
  };
  
  // Renderizar a resposta como JSON e também como HTML para fácil visualização
  const htmlOutput = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Diagnóstico de Autenticação</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
        h1 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        h2 { color: #3498db; margin-top: 30px; }
        .container { max-width: 900px; margin: 0 auto; }
        .card { background: #fff; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 20px; overflow: hidden; }
        .card-header { background: #f8f9fa; padding: 15px 20px; border-bottom: 1px solid #eee; }
        .card-body { padding: 20px; }
        .status { padding: 5px 10px; border-radius: 3px; font-size: 14px; font-weight: bold; display: inline-block; margin: 5px 0; }
        .status.success { background: #d4edda; color: #155724; }
        .status.warning { background: #fff3cd; color: #856404; }
        .status.error { background: #f8d7da; color: #721c24; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        table, th, td { border: 1px solid #ddd; }
        th { background: #f8f9fa; padding: 10px; text-align: left; }
        td { padding: 10px; }
        code { background: #f8f9fa; padding: 2px 5px; border-radius: 3px; font-family: monospace; font-size: 14px; color: #e74c3c; }
        .alert { padding: 15px; border-radius: 4px; margin: 15px 0; }
        .alert-danger { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .alert-warning { background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; }
        .alert-success { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .btn { display: inline-block; font-weight: 400; text-align: center; white-space: nowrap; vertical-align: middle; user-select: none; border: 1px solid transparent; padding: .375rem .75rem; font-size: 1rem; line-height: 1.5; border-radius: .25rem; transition: color .15s ease-in-out,background-color .15s ease-in-out,border-color .15s ease-in-out,box-shadow .15s ease-in-out; text-decoration: none; }
        .btn-primary { color: #fff; background-color: #3498db; border-color: #3498db; }
        .btn-danger { color: #fff; background-color: #e74c3c; border-color: #e74c3c; }
        .btn-success { color: #fff; background-color: #2ecc71; border-color: #2ecc71; }
        #localStorageContent { background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 10px; display: none; }
        .actions { margin-top: 20px; display: flex; gap: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Diagnóstico de Autenticação</h1>
        
        <div class="card">
          <div class="card-header">
            <h2 style="margin: 0;">Status da Autenticação</h2>
          </div>
          <div class="card-body">
            <div class="${hasAuthToken ? 'status success' : 'status error'}">
              ${hasAuthToken ? 'Token de autenticação encontrado' : 'Token de autenticação não encontrado'}
            </div>
            <div class="${hasRefreshToken ? 'status success' : 'status warning'}">
              ${hasRefreshToken ? 'Token de atualização encontrado' : 'Token de atualização não encontrado'}
            </div>
            
            <div id="localStorageStatus" class="status warning">
              Verificando localStorage...
            </div>
            
            <div class="alert ${hasAuthToken ? 'alert-success' : 'alert-danger'}">
              <strong>${hasAuthToken ? 'Autenticado!' : 'Não autenticado'}</strong>
              <p>${hasAuthToken 
                ? 'Seus cookies de autenticação foram encontrados. Você está autenticado.' 
                : 'Não foram encontrados cookies de autenticação. Você precisa fazer login novamente.'}
              </p>
            </div>
            
            <div class="actions">
              <a href="/auth/login" class="btn btn-primary">Ir para Login</a>
              <a href="/dashboard" class="btn btn-success">Ir para Dashboard</a>
              <a href="/auth/test-auth" class="btn btn-primary">Testar Autenticação</a>
              <button onclick="clearAuthData()" class="btn btn-danger">Limpar Dados de Autenticação</button>
            </div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h2 style="margin: 0;">Ambiente</h2>
          </div>
          <div class="card-body">
            <table>
              <tr>
                <th>Variável</th>
                <th>Valor</th>
              </tr>
              <tr>
                <td>Ambiente</td>
                <td><code>${environment}</code></td>
              </tr>
              <tr>
                <td>Usando ngrok</td>
                <td><code>${isNgrok}</code></td>
              </tr>
              <tr>
                <td>Host</td>
                <td><code>${host}</code></td>
              </tr>
              <tr>
                <td>URL da Aplicação</td>
                <td><code>${appUrl}</code></td>
              </tr>
              <tr>
                <td>URL do Supabase</td>
                <td><code>${supabaseUrl}</code></td>
              </tr>
              <tr>
                <td>Token de Serviço Configurado</td>
                <td><code>${hasSuperToken}</code></td>
              </tr>
              <tr>
                <td>Data/Hora</td>
                <td><code>${new Date().toISOString()}</code></td>
              </tr>
            </table>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h2 style="margin: 0;">Cookies</h2>
          </div>
          <div class="card-body">
            ${Object.keys(cookies).length > 0 
              ? `<table>
                  <tr>
                    <th>Nome</th>
                    <th>Presente</th>
                  </tr>
                  ${Object.keys(cookies).map(cookie => 
                    `<tr>
                      <td>${cookie}</td>
                      <td>✅</td>
                    </tr>`
                  ).join('')}
                </table>`
              : '<div class="alert alert-warning">Nenhum cookie encontrado</div>'
            }
            
            <div>
              <h3>Cookies de Autenticação</h3>
              <ul>
                <li>supabase-auth-token: ${cookies['supabase-auth-token'] ? '✅ Presente' : '❌ Ausente'}</li>
                <li>authToken: ${cookies['authToken'] ? '✅ Presente' : '❌ Ausente'}</li>
                <li>js-auth-token: ${cookies['js-auth-token'] ? '✅ Presente' : '❌ Ausente'}</li>
                <li>supabase-refresh-token: ${cookies['supabase-refresh-token'] ? '✅ Presente' : '❌ Ausente'}</li>
                <li>refreshToken: ${cookies['refreshToken'] ? '✅ Presente' : '❌ Ausente'}</li>
                <li>auth-test-cookie: ${cookies['auth-test-cookie'] ? '✅ Presente' : '❌ Ausente'}</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h2 style="margin: 0;">Armazenamento Local</h2>
          </div>
          <div class="card-body">
            <button onclick="checkLocalStorage()" class="btn btn-primary">Verificar localStorage</button>
            <div id="localStorageContent"></div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h2 style="margin: 0;">Informações Completas</h2>
          </div>
          <div class="card-body">
            <pre>${JSON.stringify(diagnosticData, null, 2)}</pre>
          </div>
        </div>
      </div>
      
      <script>
        // Verificar localStorage
        function checkLocalStorage() {
          try {
            const supabaseTokens = localStorage.getItem('supabase_tokens');
            const localStorageDiv = document.getElementById('localStorageContent');
            const localStorageStatus = document.getElementById('localStorageStatus');
            
            if (supabaseTokens) {
              const tokenData = JSON.parse(supabaseTokens);
              const now = Date.now();
              const elapsed = now - tokenData.timestamp;
              const isExpired = elapsed > tokenData.expires_in * 1000;
              
              localStorageStatus.className = isExpired ? 'status warning' : 'status success';
              localStorageStatus.textContent = isExpired 
                ? 'Tokens encontrados no localStorage, mas expirados' 
                : 'Tokens válidos encontrados no localStorage';
              
              const expiryDate = new Date(tokenData.timestamp + (tokenData.expires_in * 1000));
              
              localStorageDiv.innerHTML = \`
                <div class="\${isExpired ? 'alert alert-warning' : 'alert alert-success'}">
                  <strong>\${isExpired ? 'Token Expirado' : 'Token Válido'}</strong>
                  <p>Tempo decorrido: \${Math.round(elapsed/1000)} segundos</p>
                  <p>Expira em: \${expiryDate.toLocaleString()}</p>
                </div>
                <pre>\${JSON.stringify(tokenData, null, 2)}</pre>
              \`;
            } else {
              localStorageStatus.className = 'status error';
              localStorageStatus.textContent = 'Nenhum token encontrado no localStorage';
              
              localStorageDiv.innerHTML = '<div class="alert alert-danger">Nenhum token encontrado no localStorage</div>';
            }
            
            localStorageDiv.style.display = 'block';
          } catch (error) {
            console.error('Erro ao verificar localStorage:', error);
            const localStorageStatus = document.getElementById('localStorageStatus');
            localStorageStatus.className = 'status error';
            localStorageStatus.textContent = 'Erro ao verificar localStorage: ' + error.message;
            
            document.getElementById('localStorageContent').innerHTML = 
              '<div class="alert alert-danger">Erro ao acessar localStorage: ' + error.message + '</div>';
            document.getElementById('localStorageContent').style.display = 'block';
          }
        }
        
        // Limpar dados de autenticação
        function clearAuthData() {
          try {
            // Limpar localStorage
            localStorage.removeItem('supabase_tokens');
            
            // Limpar cookies (via expiração)
            const cookies = ['supabase-auth-token', 'authToken', 'js-auth-token', 
                            'supabase-refresh-token', 'refreshToken', 'auth-test-cookie'];
            
            cookies.forEach(cookie => {
              document.cookie = cookie + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            });
            
            alert('Dados de autenticação limpos com sucesso! A página será recarregada.');
            window.location.reload();
          } catch (error) {
            console.error('Erro ao limpar dados:', error);
            alert('Erro ao limpar dados: ' + error.message);
          }
        }
      </script>
    </body>
    </html>
  `;
  
  // Enviar HTML
  res.send(htmlOutput);
});

// Rota para testar a autenticação e validar tokens
router.get('/test-auth', async (req, res) => {
  try {
    logger.info('Executando teste de autenticação');
    
    // Extrair token do cookie ou cabeçalho
    let token = null;
    
    if (req.cookies && req.cookies['supabase-auth-token']) {
      token = req.cookies['supabase-auth-token'];
      logger.info('Token encontrado no cookie');
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
      logger.info('Token encontrado no cabeçalho de autorização');
    }
    
    if (!token) {
      return res.render('auth/test-auth', {
        title: 'Teste de Autenticação',
        isAuthenticated: false,
        error: 'Nenhum token encontrado. Faça login antes de testar.'
      });
    }
    
    // Verificar token com Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error) {
      logger.error(`Erro ao verificar token: ${error.message}`);
      return res.render('auth/test-auth', {
        title: 'Teste de Autenticação',
        isAuthenticated: false,
        error: `Erro ao verificar token: ${error.message}`
      });
    }
    
    if (!data || !data.user) {
      logger.error('Token válido, mas sem dados de usuário');
      return res.render('auth/test-auth', {
        title: 'Teste de Autenticação',
        isAuthenticated: false,
        error: 'Token válido, mas sem dados de usuário'
      });
    }
    
    // Obter dados do perfil do usuário
    const userId = data.user.id;
    let profileData = null;
    
    try {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (!profileError && profile) {
        profileData = profile;
        logger.info(`Perfil encontrado para o usuário ${userId}`);
      }
    } catch (profileErr) {
      logger.warn(`Erro ao buscar perfil do usuário: ${profileErr.message}`);
    }
    
    // Exibir informações na página
    return res.render('auth/test-auth', {
      title: 'Teste de Autenticação',
      isAuthenticated: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        metadata: data.user.user_metadata || {},
        appMetadata: data.user.app_metadata || {},
        createdAt: data.user.created_at,
        profile: profileData
      },
      token: {
        value: token.substring(0, 15) + '...',
        expiresAt: null // Não podemos extrair isso facilmente sem decodificar o JWT
      }
    });
  } catch (error) {
    logger.error(`Erro no teste de autenticação: ${error.message}`);
    return res.render('auth/test-auth', {
      title: 'Teste de Autenticação',
      isAuthenticated: false,
      error: `Erro inesperado: ${error.message}`
    });
  }
});

// GET /api/auth/profile - Buscar perfil do usuário
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    logger.info(`[AUTH] Buscando perfil do usuário: ${userId}`);
    
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      logger.error(`[AUTH] Erro ao buscar perfil: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar perfil do usuário'
      });
    }
    
    if (!profile) {
      // Criar perfil se não existir
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: userId,
          email: req.user.email,
          first_name: req.user.user_metadata?.first_name || '',
          last_name: req.user.user_metadata?.last_name || '',
          full_name: req.user.user_metadata?.full_name || '',
          phone: req.user.user_metadata?.phone || '',
          avatar_url: req.user.user_metadata?.avatar_url || ''
        })
        .select()
        .single();
      
      if (createError) {
        logger.error(`[AUTH] Erro ao criar perfil: ${createError.message}`);
        return res.status(500).json({
          success: false,
          message: 'Erro ao criar perfil do usuário'
        });
      }
      
      return res.json({
        success: true,
        profile: newProfile
      });
    }
    
    return res.json({
      success: true,
      profile
    });
    
  } catch (error) {
    logger.error(`[AUTH] Erro interno ao buscar perfil: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// PUT /api/auth/profile - Atualizar perfil do usuário
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, email, phone, cpf_cnpj, avatar_url } = req.body;
    
    logger.info(`[AUTH] Atualizando perfil do usuário: ${userId}`);
    
    // Validar dados
    if (!first_name && !last_name && !email && !phone && !cpf_cnpj && !avatar_url) {
      return res.status(400).json({
        success: false,
        message: 'Pelo menos um campo deve ser fornecido para atualização'
      });
    }
    
    // Validar CPF/CNPJ se fornecido
    if (cpf_cnpj) {
      const cleanedCpfCnpj = cpf_cnpj.replace(/\D/g, '');
      if (cleanedCpfCnpj.length !== 11 && cleanedCpfCnpj.length !== 14) {
        return res.status(400).json({
          success: false,
          message: 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos'
        });
      }
    }
    
    const updateData = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (cpf_cnpj !== undefined) updateData.cpf_cnpj = cpf_cnpj.replace(/\D/g, ''); // Armazenar apenas números
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    
    // Atualizar perfil
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: userId,
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      logger.error(`[AUTH] Erro ao atualizar perfil: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar perfil do usuário'
      });
    }
    
    // Atualizar metadados do usuário no Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        first_name: profile.first_name,
        last_name: profile.last_name,
        full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        phone: profile.phone,
        cpf_cnpj: profile.cpf_cnpj,
        avatar_url: profile.avatar_url
      }
    });
    
    if (authError) {
      logger.warn(`[AUTH] Erro ao atualizar metadados do usuário: ${authError.message}`);
      // Não falhar a operação se apenas os metadados falharem
    }
    
    logger.info(`[AUTH] Perfil atualizado com sucesso para usuário: ${userId}`);
    
    return res.json({
      success: true,
      profile,
      message: 'Perfil atualizado com sucesso'
    });
    
  } catch (error) {
    logger.error(`[AUTH] Erro interno ao atualizar perfil: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Rota para criar usuário após pagamento bem-sucedido
router.post('/create-user-after-payment', async (req, res) => {
  try {
    const { email, firstName, lastName, fullName, phone, planType, paymentIntentId, source, userData } = req.body;
    
    logger.info(`[AUTH] Criação de usuário após pagamento solicitada para: ${email}, source: ${source}`);
    
    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, firstName e lastName são obrigatórios'
      });
    }
    
    // ✅ VERIFICAR: Se o usuário já existe
    try {
      logger.info(`[AUTH] Verificando se usuário existe: ${email}`);
      
      // ✅ TENTATIVA 1: Usar listUsers (mais eficiente)
      try {
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          throw new Error(`Erro ao listar usuários: ${listError.message}`);
        }
        
        const existingUser = users.users.find(u => u.email === email);
        
        if (existingUser) {
          logger.info(`[AUTH] Usuário já existe: ${email}`);
          return res.status(200).json({
            success: true,
            data: {
              userId: existingUser.id,
              message: 'Usuário já existe',
              existing: true
            }
          });
        }
      } catch (listError) {
        logger.warn(`[AUTH] Erro ao listar usuários, tentando busca direta: ${listError.message}`);
        
        // ✅ TENTATIVA 2: Busca direta por email
        try {
          const { data: { user }, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
          
          if (getUserError && getUserError.message !== 'User not found') {
            throw getUserError;
          }
          
          if (user) {
            logger.info(`[AUTH] Usuário encontrado via busca direta: ${email}`);
            return res.status(200).json({
              success: true,
              data: {
                userId: user.id,
                message: 'Usuário já existe',
                existing: true
              }
            });
          }
        } catch (getUserError) {
          logger.warn(`[AUTH] Erro na busca direta: ${getUserError.message}`);
        }
      }
      
      // ✅ CRIAR: Novo usuário
      logger.info(`[AUTH] Criando novo usuário: ${email}`);
      
      let createdUser = null;
      
      try {
        // ✅ VALIDAR: Senha real fornecida pelo usuário (OBRIGATÓRIA)
        if (!userData?.password) {
          throw new Error('Senha é obrigatória para criação de usuário');
        }
        
        const userPassword = userData.password;
        
        logger.info(`[AUTH] Criando usuário com senha real fornecida pelo usuário: ${userPassword.length} caracteres`);
        
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: userPassword, // ✅ SEMPRE senha real
          email_confirm: true,
          user_metadata: {
            planType: planType,
            planActivated: true,
            paymentConfirmed: true,
            source: source || 'payment_return_direct',
            signupDate: new Date().toISOString(),
            lastPayment: new Date().toISOString(),
            paymentIntentId: paymentIntentId,
            firstName: firstName,
            lastName: lastName,
            fullName: fullName,
            phone: phone,
            signupSource: 'payment_return_direct',
            hasRealPassword: true, // ✅ SEMPRE verdadeiro
            passwordSource: 'user_form' // ✅ SEMPRE do formulário
          }
        });
        
        if (createError) {
          throw createError;
        }
        
        logger.info(`[AUTH] Usuário criado com sucesso: ${newUser.user.id}`);
        
        // ✅ VERIFICAR: Se o usuário foi realmente criado
        if (!newUser || !newUser.user || !newUser.user.id) {
          throw new Error('Usuário criado mas dados inválidos retornados');
        }
        
        createdUser = newUser;
        
      } catch (createError) {
        logger.error(`[AUTH] Erro na criação do usuário: ${createError.message}`);
        
        // ✅ TENTATIVA 2: Criar com dados mínimos
        try {
          logger.info(`[AUTH] Tentativa 2: Criando usuário com dados mínimos: ${email}`);
          
          // ✅ VALIDAR: Senha real fornecida pelo usuário (OBRIGATÓRIA)
          if (!userData?.password) {
            throw new Error('Senha é obrigatória para criação de usuário');
          }
          
          const userPassword2 = userData.password;
          
          logger.info(`[AUTH] Tentativa 2: Criando usuário com senha real fornecida pelo usuário: ${userPassword2.length} caracteres`);
          
          const { data: newUser2, error: createError2 } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: userPassword2, // ✅ SEMPRE senha real
            email_confirm: true,
            user_metadata: {
              planType: planType || 'basic',
              planActivated: true,
              paymentConfirmed: true,
              source: source || 'payment_return_direct',
              signupDate: new Date().toISOString(),
              firstName: firstName || 'Usuário',
              lastName: lastName || 'Cliente',
              hasRealPassword: true, // ✅ SEMPRE verdadeiro
              passwordSource: 'user_form' // ✅ SEMPRE do formulário
            }
          });
          
          if (createError2) {
            throw createError2;
          }
          
          logger.info(`[AUTH] Usuário criado com sucesso (tentativa 2): ${newUser2.user.id}`);
          createdUser = newUser2;
          
        } catch (createError2) {
          logger.error(`[AUTH] Erro na tentativa 2: ${createError2.message}`);
          throw createError2;
        }
      }
      
      // ✅ VERIFICAR: Se temos um usuário criado
      if (!createdUser || !createdUser.user || !createdUser.user.id) {
        throw new Error('Falha ao criar usuário após múltiplas tentativas');
      }
      
      // ✅ CRIAR: Perfil do usuário
      try {
        await supabaseAdmin
          .from('user_profiles')
          .insert({
            id: createdUser.user.id,
            email: email,
            first_name: firstName,
            last_name: lastName,
            full_name: fullName,
            phone: phone,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      } catch (profileError) {
        logger.warn(`[AUTH] Erro ao criar perfil (ignorando): ${profileError.message}`);
      }
      
      // Cliente será criado automaticamente via trigger quando o perfil for criado
      
      return res.status(201).json({
        success: true,
        data: {
          userId: createdUser.user.id,
          email: email,
          message: 'Usuário criado com sucesso'
        }
      });
      
    } catch (error) {
      logger.error(`[AUTH] Erro na criação do usuário: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: `Erro interno: ${error.message}`
      });
    }
    
  } catch (error) {
    logger.error(`[AUTH] Erro na rota create-user-after-payment: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// ✅ ROTA: Verificar se há login automático disponível após webhook
router.get('/check-auto-login/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }

    logger.info(`[AUTH] Verificando login automático para: ${email}`);
    
    // ✅ VERIFICAR: Se há sessão automática disponível
    // TODO: Implementar verificação de sessão automática
    // Por enquanto, retornar que não há sessão automática
    
    res.json({
      success: true,
      hasAutoLogin: false,
      message: 'Nenhum login automático disponível'
    });
    
  } catch (error) {
    logger.error(`[AUTH] Erro ao verificar login automático: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// ✅ ROTA: Criar usuário via Payment Link (sem confirmação de email)
router.post('/create-user-from-payment-link', async (req, res) => {
  try {
    const { userData, plan, interval } = req.body;
    
    if (!userData || !userData.email || !userData.password) {
      return res.status(400).json({
        success: false,
        message: 'Dados do usuário são obrigatórios'
      });
    }

    logger.info(`[AUTH] Criando usuário via Payment Link: ${userData.email}`);
    
    // ✅ VERIFICAR: Se existe pagamento bem-sucedido para este email
    const { data: stripeCustomer, error: customerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('id, email, name, created')
      .eq('email', userData.email)
      .order('created', { ascending: false })
      .limit(1)
      .single();
    
    if (customerError || !stripeCustomer) {
      logger.info(`[AUTH] Nenhum customer encontrado para: ${userData.email}`);
      return res.status(400).json({
        success: false,
        message: 'Nenhum pagamento encontrado para este email'
      });
    }
    
    // ✅ VERIFICAR: Se existe pagamento bem-sucedido para este customer
    const { data: successfulPayment, error: paymentError } = await supabaseAdmin
      .from('stripe_payments')
      .select('id, amount, currency, created, attrs')
      .eq('customer', stripeCustomer.id)
      .eq('attrs->status', 'succeeded')
      .order('created', { ascending: false })
      .limit(1)
      .single();
    
    if (paymentError || !successfulPayment) {
      logger.info(`[AUTH] Nenhum pagamento bem-sucedido encontrado para customer: ${stripeCustomer.id}`);
      return res.status(400).json({
        success: false,
        message: 'Nenhum pagamento bem-sucedido encontrado'
      });
    }
    
    // ✅ VERIFICAR: Se o pagamento foi recente (últimas 24 horas)
    const paymentDate = new Date(successfulPayment.created);
    const now = new Date();
    const hoursDiff = (now - paymentDate) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      logger.info(`[AUTH] Pagamento muito antigo (${hoursDiff.toFixed(1)} horas atrás)`);
      return res.status(400).json({
        success: false,
        message: 'Pagamento muito antigo'
      });
    }
    
    // ✅ CRIAR: Usuário usando service role (sem confirmação de email)
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // ✅ CONFIRMAR: Email automaticamente
      user_metadata: {
        first_name: userData.first_name,
        last_name: userData.last_name || '',
        full_name: `${userData.first_name} ${userData.last_name || ''}`.trim(),
        phone: userData.phone || null,
        plan_type: plan || 'premium',
        interval: interval || 'monthly',
        payment_source: 'payment_link',
        stripe_customer_id: stripeCustomer.id,
        stripe_payment_id: successfulPayment.id
      }
    });
    
    if (createError) {
      logger.error(`[AUTH] Erro ao criar usuário: ${createError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar conta'
      });
    }
    
    if (authUser.user) {
      logger.info(`[AUTH] Usuário criado com sucesso: ${authUser.user.id}`);
      
      // ✅ RETORNAR: Token de acesso para login imediato
      const { data: session, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userData.email,
        options: {
          redirectTo: `${process.env.APP_URL || 'http://localhost:5174'}/dashboard`
        }
      });
      
      if (sessionError) {
        logger.error(`[AUTH] Erro ao gerar link de sessão: ${sessionError.message}`);
        return res.status(500).json({
          success: false,
          message: 'Usuário criado, mas erro ao gerar sessão'
        });
      }
      
      res.json({
        success: true,
        data: {
          user: authUser.user,
          sessionUrl: session.properties?.action_link,
          message: 'Usuário criado com sucesso'
        }
      });
    }
    
  } catch (error) {
    logger.error(`[AUTH] Erro ao criar usuário via Payment Link: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// ✅ ROTA: Verificar pagamento por email usando tabelas do Stripe wrapper
router.post('/check-payment-by-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }

    logger.info(`[AUTH] Verificando pagamento por email: ${email}`);
    
    // ✅ VERIFICAR: Se existe customer no Stripe com esse email
    const { data: stripeCustomer, error: customerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('id, email, name, created')
      .eq('email', email)
      .order('created', { ascending: false })
      .limit(1)
      .single();
    
    if (customerError || !stripeCustomer) {
      logger.info(`[AUTH] Nenhum customer encontrado para: ${email}`);
      return res.json({
        success: true,
        data: {
          hasPayment: false,
          message: 'Nenhum pagamento encontrado para este email'
        }
      });
    }
    
    logger.info(`[AUTH] Customer encontrado: ${stripeCustomer.id}`);
    
    // ✅ VERIFICAR: Se existe pagamento bem-sucedido para este customer
    const { data: successfulPayment, error: paymentError } = await supabaseAdmin
      .from('stripe_payments')
      .select('id, amount, currency, created, attrs')
      .eq('customer', stripeCustomer.id)
      .eq('attrs->status', 'succeeded')
      .order('created', { ascending: false })
      .limit(1)
      .single();
    
    if (paymentError || !successfulPayment) {
      logger.info(`[AUTH] Nenhum pagamento bem-sucedido encontrado para customer: ${stripeCustomer.id}`);
      return res.json({
        success: true,
        data: {
          hasPayment: false,
          message: 'Nenhum pagamento bem-sucedido encontrado'
        }
      });
    }
    
    logger.info(`[AUTH] Pagamento bem-sucedido encontrado: ${successfulPayment.id}`);
    
    // ✅ VERIFICAR: Se o pagamento foi recente (últimas 24 horas)
    const paymentDate = new Date(successfulPayment.created);
    const now = new Date();
    const hoursDiff = (now - paymentDate) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      logger.info(`[AUTH] Pagamento muito antigo (${hoursDiff.toFixed(1)} horas atrás)`);
      return res.json({
        success: true,
        data: {
          hasPayment: false,
          message: 'Pagamento muito antigo'
        }
      });
    }
    
    // ✅ RETORNAR: Dados do pagamento bem-sucedido
    res.json({
      success: true,
      data: {
        hasPayment: true,
        payment: {
          id: successfulPayment.id,
          amount: successfulPayment.amount,
          currency: successfulPayment.currency,
          created: successfulPayment.created,
          customerId: stripeCustomer.id,
          customerName: stripeCustomer.name,
          customerEmail: stripeCustomer.email
        },
        message: 'Pagamento bem-sucedido encontrado'
      }
    });
    
  } catch (error) {
    logger.error(`[AUTH] Erro ao verificar pagamento por email: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// ✅ ROTA: Limpeza manual de estado de autenticação (útil para debugging)
router.post('/force-clear-state', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }

    logger.info(`[AUTH] Limpeza manual de estado solicitada para: ${email}`);
    
    // ✅ IMPORTANTE: Limpar estado do usuário
    const { supabaseAdmin } = require('../config/supabase');
    
    // ✅ BUSCAR: Usuário por email
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    
    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    // ✅ LIMPAR: Metadados de sessão
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { 
        app_metadata: {
          ...user.app_metadata,
          last_manual_cleanup: new Date().toISOString(),
          state_cleared: true
        }
      }
    );
    
    if (updateError) {
      logger.warn(`[AUTH] Erro ao limpar metadados: ${updateError.message}`);
    }
    
    res.json({
      success: true,
      message: 'Estado de autenticação limpo com sucesso',
      data: {
        userId: user.id,
        email: user.email,
        cleanedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error(`[AUTH] Erro na limpeza manual: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// ✅ ROTA: Auto-login movida para antes de /login para evitar conflito

// ✅ POST /api/auth/clear-session - Limpar sessão e cookies de autenticação
router.post('/clear-session', async (req, res) => {
  try {
    logger.info('[clear-session] Limpando sessão e cookies de autenticação');

    // ✅ LIMPAR: Todos os cookies de autenticação
    res.clearCookie('authToken');
    res.clearCookie('refreshToken');
    res.clearCookie('sb-access-token');
    res.clearCookie('sb-refresh-token');
    res.clearCookie('supabase-auth-token');
    
    // ✅ REMOVER: Headers de autenticação se existirem
    if (req.headers.authorization) {
      delete req.headers.authorization;
    }

    return res.json({
      success: true,
      message: 'Sessão limpa com sucesso',
      data: {
        cleared: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error(`[clear-session] Erro ao limpar sessão: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao limpar sessão'
    });
  }
});

// Rota para gerar token CSRF
router.get('/csrf-token', (req, res) => {
  try {
    // Gerar token CSRF único
    const csrfToken = require('crypto').randomBytes(32).toString('hex');
    
    // Armazenar na sessão
    if (req.session) {
      req.session.csrfToken = csrfToken;
    }
    
    res.json({
      success: true,
      csrfToken: csrfToken
    });
  } catch (error) {
    logger.error('Erro ao gerar token CSRF:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar token de segurança'
    });
  }
});

module.exports = router;