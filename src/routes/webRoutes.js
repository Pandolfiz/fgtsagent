const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const logger = require('../config/logger');
const { supabase, supabaseAdmin } = require('../config/supabase');
const config = require('../config');
const { createClient } = require('@supabase/supabase-js');
const EvolutionService = require('../services/evolutionService');
const evolutionCredentialController = require('../controllers/evolutionCredentialController');
const chatService = require('../services/chatService');
const contactService = require('../services/contactService');
const chatController = require('../controllers/chatController');
const partnerCredentialsController = require('../controllers/partnerCredentialsController');
const dashboardController = require('../controllers/dashboardController');
const agentsController = require('../controllers/agentsController');
const path = require('path');

// Inicializar res.locals em todas as requisições
router.use((req, res, next) => {
  // Garantir que res.locals existe
  if (!res.locals) res.locals = {};
  next();
});

// Middleware para preparar dados do usuário
const prepareUserData = async (req, res, next) => {
  try {
    // Verificar se res.locals.user já existe para evitar sobrescrita
    if (res.locals && res.locals.user) {
      logger.debug(`prepareUserData: res.locals.user já está definido na rota ${req.path}`);
    } else {
      // Verificar se req.user está disponível
      if (req.user) {
        // Garantir que res.locals existe
        if (!res.locals) res.locals = {};
        
        // Definir res.locals.user e displayName
        res.locals.user = req.user;
        logger.info(`prepareUserData: res.locals.user definido com sucesso na rota ${req.path}`);
      } else {
        logger.warn(`prepareUserData: req.user não está disponível na rota ${req.path}`);
      }
    }
    next();
  } catch (err) {
    logger.error(`Erro no middleware prepareUserData: ${err.message}`);
    next(err);
  }
};

// Middleware para injetar dados comuns em todas as views
const commonViewData = async (req, res, next) => {
  try {
    const path = req.path;
    
    // Verificar se o middleware já foi executado (evitar dupla execução)
    if (res.locals._commonViewDataExecuted) {
      logger.debug(`commonViewData: Middleware já executado anteriormente para ${path}`);
      return next();
    }
    
    // Marcar que o middleware foi executado
    res.locals._commonViewDataExecuted = true;
    
    // Título padrão do site
    res.locals.title = 'Sistema de Gerenciamento de Agentes IA';
    
    // Garantir que res.locals.user esteja definido
    if (!res.locals.user) {
      // Se temos req.user, usar como fonte de dados
      if (req.user) {
        logger.debug(`commonViewData: Configurando res.locals.user a partir de req.user na rota ${path}`);
        res.locals.user = req.user;
        
        // Garantir que user_metadata exista
        if (!res.locals.user.user_metadata) {
          res.locals.user.user_metadata = {};
        }
        
        // Garantir que profile exista
        if (!res.locals.user.profile) {
          res.locals.user.profile = {};
        }
        
        // Garantir que displayName esteja definido
        if (!res.locals.user.displayName) {
          const displayName = res.locals.user.user_metadata?.full_name || 
                            res.locals.user.profile?.full_name || 
                            (res.locals.user.profile?.first_name && res.locals.user.profile?.last_name ? 
                              `${res.locals.user.profile.first_name} ${res.locals.user.profile.last_name}` : null) ||
                            res.locals.user.user_metadata?.first_name || 
                            res.locals.user.email?.split('@')[0] || 
                            'Usuário';
          
          res.locals.user.displayName = displayName;
          logger.debug(`commonViewData: Configurado displayName=${displayName} para usuário na rota ${path}`);
        }
      } else {
        // Usuário não está autenticado ou não está disponível
        res.locals.user = null;
        logger.debug(`commonViewData: Usuário não autenticado na rota ${path}`);
      }
    }
    
    // Adicionar path atual
    res.locals.path = req.path;
    
    // Placeholder para scripts específicos de página
    res.locals.script = '';
    
    // Placeholder para CSS específico de página
    res.locals.styles = '';
    
    // Garantir que messages exista
    res.locals.messages = res.locals.messages || { success: '', error: '' };
    
    next();
  } catch (err) {
    logger.error(`Erro no middleware commonViewData: ${err.message}`);
    next(err);
  }
};

// Middleware de diagnóstico para verificar res.locals.user
router.use((req, res, next) => {
  // Armazenar o caminho atual para referência
  const currentPath = req.path;
  
  // Verificar o estado inicial
  const initialHasReqUser = !!req.user;
  const initialHasLocalsUser = !!res.locals.user;
  
  if (initialHasReqUser) {
    logger.debug(`[DIAGNÓSTICO] Início da rota ${currentPath}: req.user=${initialHasReqUser}, res.locals.user=${initialHasLocalsUser}`);
  }
  
  // Hook no método render para verificar o estado antes da renderização
  const originalRender = res.render;
  res.render = function(view, options, callback) {
    const hasReqUser = !!req.user;
    const hasLocalsUser = !!res.locals.user;
    
    if (!hasLocalsUser && hasReqUser) {
      logger.warn(`[DIAGNÓSTICO] res.locals.user não definido na rota ${currentPath} durante renderização, mas req.user existe`);
      
      // Corrigir automaticamente se req.user estiver disponível
      res.locals.user = res.locals.user || req.user;
      
      // Adicionar displayName se necessário
      if (res.locals.user && !res.locals.user.displayName) {
        const displayName = res.locals.user.user_metadata?.full_name || 
                           res.locals.user.profile?.full_name || 
                           (res.locals.user.profile?.first_name && res.locals.user.profile?.last_name ? 
                             `${res.locals.user.profile.first_name} ${res.locals.user.profile.last_name}` : null) ||
                           res.locals.user.user_metadata?.first_name || 
                           res.locals.user.email?.split('@')[0] || 
                           'Usuário';
        
        res.locals.user.displayName = displayName;
        logger.info(`[DIAGNÓSTICO] Adicionado displayName=${displayName} a res.locals.user na rota ${currentPath}`);
      }
    }
    
    // Chamar o método render original
    return originalRender.call(this, view, options, callback);
  };
  
  // Continuar com o processamento da requisição
  next();
});

// Página inicial - pública
router.get('/', (req, res) => {
  try {
    // Aplicar commonViewData para garantir que res.locals.user esteja disponível
    commonViewData(req, res, () => {
      res.render('home', {
        title: 'Sistema de Gerenciamento de Agentes IA - Home',
        user: res.locals.user || null
      });
    });
  } catch (err) {
    logger.error(`Erro ao renderizar página inicial: ${err.message}`);
    res.render('error', { 
      title: 'Erro', 
      message: 'Ocorreu um erro ao carregar a página inicial',
      error: {}
    });
  }
});

// Rotas de login e cadastro
router.get('/auth/login', (req, res) => {
  try {
    // Obter parâmetro de redirecionamento, se existir
    const redirectUrl = req.query.redirect || '/dashboard';
    
    // Logar o parâmetro de redirecionamento para depuração
    logger.info(`Página de login sendo renderizada com redirect=${redirectUrl}`);
    
    res.render('auth/login', {
      title: 'Login',
      redirect: redirectUrl,
      message: req.query.message || ''
    });
  } catch (err) {
    logger.error(`Erro ao renderizar página de login: ${err.message}`);
    res.render('error', { 
      title: 'Erro', 
      message: 'Ocorreu um erro ao carregar a página de login',
      error: {}
    });
  }
});

router.get('/auth/signup', (req, res) => {
  try {
    res.render('auth/signup', {
      title: 'Cadastro'
    });
  } catch (err) {
    logger.error(`Erro ao renderizar página de cadastro: ${err.message}`);
    res.render('error', { 
      title: 'Erro', 
      message: 'Ocorreu um erro ao carregar a página de cadastro',
      error: {}
    });
  }
});

// Rota de logout
router.get('/auth/logout', (req, res) => {
  try {
    logger.info(`Realizando logout para usuário: ${req.user?.id || 'desconhecido'}`);
    
    // Limpar todos os cookies relacionados à autenticação
    res.clearCookie('authToken');
    res.clearCookie('refreshToken');
    res.clearCookie('supabase-auth-token');
    
    // Limpar qualquer sessão que possa existir
    if (req.session) {
      req.session.destroy();
    }
    
    // Limpar o objeto req.user
    req.user = null;
    
    // Limpar o objeto res.locals
    if (res.locals) {
      res.locals.user = null;
      res.locals._commonViewDataExecuted = false;
    }
    
    // Redirecionar para a página inicial com mensagem de sucesso
    res.redirect('/?message=Logout realizado com sucesso&success=true');
  } catch (err) {
    logger.error(`Erro ao fazer logout: ${err.message}`);
    res.redirect('/?message=Erro ao fazer logout&error=true');
  }
});

// Rotas protegidas - Redirecionando para o React Dashboard 
router.get('/dashboard', requireAuth, (req, res) => {
  // Servir o aplicativo React
  return res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

// Manter a rota para fornecer stats em JSON para o frontend React
router.get('/dashboard/stats', requireAuth, dashboardController.getApiDashboardStats);

// Rotas de perfil de usuário
router.get('/profile', requireAuth, commonViewData, (req, res) => {
  try {
    res.render('profile/index', {
      title: 'Perfil do Usuário',
      script: '<script src="/js/profile.js"></script>'
    });
  } catch (err) {
    logger.error(`Erro ao renderizar perfil: ${err.message}`);
    res.render('error', { 
      title: 'Erro', 
      message: 'Ocorreu um erro ao carregar a página de perfil',
      error: {}
    });
  }
});

// Rota para a página de configurações (OCULTA)
/*
router.get('/profile/settings', requireAuth, commonViewData, (req, res) => {
  try {
    res.render('profile/settings', {
      title: 'Configurações',
      script: '<script src="/js/profile-settings.js"></script>'
    });
  } catch (err) {
    logger.error(`Erro ao renderizar configurações: ${err.message}`);
    res.render('error', { 
      title: 'Erro', 
      message: 'Ocorreu um erro ao carregar as configurações',
      error: {}
    });
  }
});

// Rota para processar configurações de perfil (OCULTA)
router.post('/profile/settings', requireAuth, commonViewData, async (req, res) => {
  try {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      logger.error(`Tentativa de salvar configurações sem usuário autenticado`);
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado. Por favor, faça login novamente.'
      });
    }
    
    logger.info(`Atualizando configurações para o usuário ${req.user.id}`);
    
    // Extrair as configurações do corpo da requisição
    const { theme, language, timezone, dateFormat, showWelcomeMessage, showStats, compactView } = req.body;
    
    // Atualizar os metadados do usuário via Supabase
    const { error } = await supabase.auth.updateUser({
      data: {
        theme,
        language,
        timezone,
        dateFormat,
        showWelcomeMessage,
        showStats,
        compactView
      }
    });
    
    if (error) {
      logger.error(`Erro ao atualizar configurações: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao salvar configurações'
      });
    }
    
    return res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso'
    });
  } catch (err) {
    logger.error(`Erro ao processar configurações: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar configurações'
    });
  }
});
*/

// Rota para a página de API keys
router.get('/profile/api-keys', requireAuth, commonViewData, (req, res) => {
  try {
    res.render('profile/api-keys', {
      title: 'Chaves de API',
      script: '<script src="/js/profile-api-keys.js"></script>'
    });
  } catch (err) {
    logger.error(`Erro ao renderizar página de API keys: ${err.message}`);
    res.render('error', { 
      title: 'Erro', 
      message: 'Ocorreu um erro ao carregar a página de chaves de API',
      error: {}
    });
  }
});

// Rota para a página de notificações
router.get('/profile/notifications', requireAuth, commonViewData, (req, res) => {
  try {
    res.render('profile/notifications', {
      title: 'Notificações',
      script: '<script src="/js/profile-notifications.js"></script>'
    });
  } catch (err) {
    logger.error(`Erro ao renderizar notificações: ${err.message}`);
    res.render('error', { 
      title: 'Erro', 
      message: 'Ocorreu um erro ao carregar as notificações',
      error: {}
    });
  }
});

// Rota para processamento de notificações de perfil
router.post('/profile/notifications', requireAuth, commonViewData, async (req, res) => {
  try {
    // Atualizar metadados do usuário com as configurações de notificações
    const { notifications } = req.body;
    
    // Validar os dados recebidos
    if (!notifications) {
      return res.status(400).json({
        success: false,
        message: 'Dados de notificações inválidos'
      });
    }
    
    logger.info(`Atualizando preferências de notificações para o usuário ${req.user.id}`);
    
    // Atualizar os metadados do usuário via Supabase
    const { error } = await supabase.auth.updateUser({
      data: {
        notifications: notifications
      }
    });
    
    if (error) {
      logger.error(`Erro ao atualizar preferências de notificações: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao salvar preferências de notificações'
      });
    }
    
    return res.json({
      success: true,
      message: 'Preferências de notificações atualizadas com sucesso'
    });
  } catch (err) {
    logger.error(`Erro ao processar preferências de notificações: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar preferências de notificações'
    });
  }
});

// Mapa para armazenar as últimas alterações de senha por usuário
const passwordChangeRequests = new Map();

// Rota para segurança de perfil
router.get('/profile/security', requireAuth, commonViewData, async (req, res) => {
  try {
    res.render('profile/security', {
      title: 'Segurança da Conta',
      script: '<script src="/js/profile-security.js"></script>'
    });
  } catch (err) {
    logger.error(`Erro ao renderizar página de segurança: ${err.message}`);
    res.render('error', { 
      title: 'Erro', 
      message: 'Ocorreu um erro ao carregar a página de segurança',
      error: {}
    });
  }
});

// Rota para alteração de senha
router.post('/profile/change-password', requireAuth, commonViewData, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Adicionar log para depuração - identificador único para evitar confusão
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    logger.info(`Processando alteração de senha [${requestId}] para usuário ${req.user?.id}`);
    
    // Verificar se já existe uma requisição recente do mesmo usuário (debounce)
    const userId = req.user?.id;
    if (userId) {
      const lastRequest = passwordChangeRequests.get(userId);
      const now = Date.now();
      
      if (lastRequest && (now - lastRequest.timestamp < 2000)) {
        logger.warn(`Ignorando requisição duplicada [${requestId}] - muito próxima da anterior (${now - lastRequest.timestamp}ms)`);
        return res.status(429).json({
          success: false,
          message: 'Por favor, aguarde alguns segundos antes de tentar novamente.'
        });
      }
      
      // Registrar esta requisição
      passwordChangeRequests.set(userId, {
        timestamp: now,
        requestId
      });
      
      // Limpar entradas antigas do mapa (a cada 10 requisições)
      if (passwordChangeRequests.size > 100) {
        const threshold = now - (2 * 60 * 1000); // 2 minutos
        for (const [key, value] of passwordChangeRequests.entries()) {
          if (value.timestamp < threshold) {
            passwordChangeRequests.delete(key);
          }
        }
      }
    }
    
    // Validar entradas
    if (!currentPassword || !newPassword) {
      logger.warn(`Validação falhou [${requestId}]: senha atual ou nova não fornecida`);
      return res.status(400).json({
        success: false,
        message: 'Senha atual e nova senha são obrigatórias'
      });
    }
    
    // Verificar requisitos de senha
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      logger.warn(`Validação falhou [${requestId}]: requisitos de senha não atendidos`);
      return res.status(400).json({
        success: false,
        message: 'A nova senha não atende aos requisitos de segurança'
      });
    }
    
    // Verificar se o usuário está autenticado
    if (!req.user) {
      logger.error(`Tentativa de alteração de senha [${requestId}] sem usuário autenticado`);
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado. Por favor, faça login novamente.'
      });
    }
    
    // Verificar se a nova senha é diferente da atual
    if (currentPassword === newPassword) {
      logger.warn(`Validação falhou [${requestId}]: nova senha igual à atual`);
      return res.status(400).json({
        success: false,
        message: 'A nova senha deve ser diferente da senha atual'
      });
    }
    
    logger.info(`Iniciando alteração de senha [${requestId}] para usuário ${req.user.id}`);
    
    // Obter token da sessão do cookie
    const token = req.cookies.authToken;
    
    if (!token) {
      logger.error(`Erro na alteração de senha [${requestId}]: Token não encontrado nos cookies`);
      return res.status(401).json({
        success: false,
        message: 'Sua sessão expirou. Por favor, faça logout e login novamente para continuar.'
      });
    }
    
    // Inicializar cliente Supabase com o token
    const userSupabase = createClient(
      process.env.SUPABASE_URL || require('../config').supabase.url,
      process.env.SUPABASE_ANON_KEY || require('../config').supabase.anonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
    try {
      // Primeiro verificar a senha atual fazendo uma tentativa de login
      logger.info(`Verificando senha atual [${requestId}]`);
      const { error: signInError } = await userSupabase.auth.signInWithPassword({
        email: req.user.email,
        password: currentPassword
      });
      
      if (signInError) {
        logger.error(`Senha atual incorreta [${requestId}]: ${signInError.message}`);
        return res.status(401).json({
          success: false,
          message: 'A senha atual está incorreta. Por favor, tente novamente.'
        });
      }
      
      // Agora sim, atualizar a senha
      logger.info(`Alterando senha [${requestId}]`);
      const { data: updateData, error } = await userSupabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        logger.error(`Erro na alteração de senha [${requestId}]: ${error.message}`);
        
        // Verificar se é o erro específico de senha igual à anterior
        if (error.message && error.message.includes('different from the old password')) {
          return res.status(400).json({
            success: false,
            message: 'A nova senha não pode ser igual a uma senha utilizada recentemente. Por favor, escolha outra senha.'
          });
        }
        
        // Verificar se o erro está relacionado à sessão
        if (error.message && (error.message.includes('session') || error.message.includes('auth') || error.message.includes('token'))) {
          return res.status(401).json({
            success: false,
            message: 'Sua sessão expirou. Por favor, faça logout e login novamente.'
          });
        }
        
        return res.status(400).json({
          success: false,
          message: 'Erro ao alterar senha: ' + error.message
        });
      }
      
      logger.info(`Senha alterada com sucesso [${requestId}] para usuário ${req.user.id}`);
      
      // APÓS alterar a senha com sucesso, renovar o token
      logger.info(`Obtendo nova sessão após alteração de senha [${requestId}]`);
      const { data: newSession, error: newSessionError } = await userSupabase.auth.getSession();
      
      if (!newSessionError && newSession && newSession.session) {
        // Definir o novo token no cookie
        res.cookie('authToken', newSession.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000 // 1 dia
        });
        
        logger.info(`Token de sessão renovado com sucesso [${requestId}]`);
      } else {
        logger.warn(`Não foi possível renovar o token de sessão [${requestId}]: ${newSessionError?.message || 'Erro desconhecido'}`);
        
        // Se não conseguiu obter um novo token, definir o token atual novamente para garantir que ele persista
        res.cookie('authToken', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000 // 1 dia
        });
        
        logger.info(`Token atual preservado [${requestId}]`);
      }
      
      return res.json({
        success: true,
        message: 'Senha alterada com sucesso.'
      });
    } catch (innerErr) {
      logger.error(`Erro inesperado na alteração de senha [${requestId}]: ${innerErr.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao processar alteração de senha'
      });
    }
  } catch (err) {
    logger.error(`Erro ao processar alteração de senha: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar alteração de senha'
    });
  }
});

// Rota de organizações 
router.get('/organizations', requireAuth, commonViewData, async (req, res) => {
  try {
    // Buscar organizações do usuário
    const { data: userOrgs, error } = await require('../config/supabase').supabaseAdmin
      .rpc('get_user_memberships', { user_id_param: req.user.id });
      
    if (error) {
      logger.error(`Erro ao buscar organizações do usuário: ${error.message}`);
      throw new Error('Erro ao buscar organizações');
    }
    
    // Formatar organizações para uso na view
    const organizations = userOrgs.map(org => ({
      id: org.organization_id,
      name: org.organization_name || 'Organização sem nome',
      description: org.organization_description || '',
      status: org.status || 'active',
      memberCount: 1,
      role: org.role
    }));
    
    logger.info(`Encontradas ${organizations.length} organizações para o usuário ${req.user.id}`);
    
    res.render('organizations/index', {
      title: 'Minhas Organizações',
      organizations: organizations
    });
  } catch (err) {
    logger.error(`Erro ao renderizar organizações: ${err.message}`);
    res.render('error', { 
      title: 'Erro', 
      message: 'Ocorreu um erro ao carregar a lista de organizações',
      error: {}
    });
  }
});

router.get('/organizations/new', requireAuth, commonViewData, (req, res) => {
  try {
    res.render('organizations/create', {
      title: 'Nova Organização'
    });
  } catch (err) {
    logger.error(`Erro ao renderizar criação de organização: ${err.message}`);
    res.render('error', { 
      title: 'Erro', 
      message: 'Ocorreu um erro ao carregar o formulário de nova organização',
      error: {}
    });
  }
});

// Rota para editar organização
router.get('/organizations/:id/edit', requireAuth, commonViewData, async (req, res) => {
  try {
    const organizationId = req.params.id;
    const userId = req.user.id;
    
    logger.info(`Carregando página de edição para organização ${organizationId}`);
    
    // Buscar detalhes da organização
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
      
    if (orgError || !orgData) {
      logger.error(`Organização ${organizationId} não encontrada`);
      return res.redirect('/organizations?error=Organização não encontrada');
    }
    
    // Buscar papel do usuário na organização
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();
    
    if (memberError || !memberData) {
      logger.error(`Usuário ${userId} não tem acesso à organização ${organizationId}`);
      return res.redirect('/organizations?error=Você não tem permissão para acessar esta organização');
    }
    
    // Verificar se o usuário tem permissão para editar
    if (!['owner', 'admin'].includes(memberData.role)) {
      logger.error(`Usuário ${userId} não tem permissão para editar a organização ${organizationId}`);
      return res.redirect('/organizations?error=Você não tem permissão para editar esta organização');
    }
    
    // Combinar dados da organização com o papel do usuário
    const organization = {
      ...orgData,
      role: memberData.role
    };
    
    res.render('organizations/edit', {
      title: 'Editar Organização',
      organization: organization,
      user: req.user,
      messages: {} // Garantir que não há mensagens ao carregar o formulário
    });
  } catch (error) {
    logger.error(`Erro ao carregar página de edição: ${error.message}`);
    res.redirect('/organizations?error=Erro ao carregar página de edição');
  }
});

// Rota para processar a edição da organização
router.post('/organizations/:id/edit', requireAuth, commonViewData, async (req, res) => {
  try {
    const organizationId = req.params.id;
    const userId = req.user.id;
    const { name, description, status } = req.body;

    logger.info(`Processando edição da organização ${organizationId}`);

    // Verificar permissões do usuário
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (memberError || !memberData) {
      logger.error(`Usuário ${userId} não tem acesso à organização ${organizationId}`);
      req.flash('error', 'Você não tem permissão para editar esta organização');
      return res.redirect('/organizations');
    }

    // Validar dados obrigatórios
    if (!name) {
      logger.error('Nome da organização é obrigatório');
      req.flash('error', 'Nome da organização é obrigatório');
      return res.redirect(`/organizations/${organizationId}/edit`);
    }

    // Preparar dados para atualização
    const updates = {
      name,
      description: description || null,
      updated_at: new Date().toISOString()
    };

    // Apenas owner pode alterar o status
    if (memberData.role === 'owner' && status) {
      if (!['active', 'inactive'].includes(status)) {
        logger.error(`Status inválido: ${status}`);
        req.flash('error', 'Status inválido');
        return res.redirect(`/organizations/${organizationId}/edit`);
      }
      updates.status = status;
    }

    // Atualizar a organização
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update(updates)
      .eq('id', organizationId);

    if (updateError) {
      logger.error(`Erro ao atualizar organização ${organizationId}: ${updateError.message}`);
      req.flash('error', `Erro ao atualizar organização: ${updateError.message}`);
      return res.redirect(`/organizations/${organizationId}/edit`);
    }

    logger.info(`Organização ${organizationId} atualizada com sucesso`);
    req.flash('success', 'Organização atualizada com sucesso');
    res.redirect('/organizations');
  } catch (error) {
    logger.error(`Erro ao processar edição: ${error.message}`);
    req.flash('error', 'Erro ao processar edição');
    res.redirect(`/organizations/${req.params.id}/edit`);
  }
});

// Rotas Evolution API
router.get('/whatsapp-credentials', requireAuth, commonViewData, async (req, res) => {
  try {
    // Buscar todas as credenciais do usuário
    const credentials = await EvolutionService.findAllByClientId(req.user.id);
    // Recalcular status de cada credencial antes de renderizar
    if (credentials && credentials.length) {
      await Promise.all(credentials.map(async cred => {
        try {
          const service = EvolutionService.fromCredential(cred);
          const connState = await service.fetchConnectionState();
          let statusFromApi;
          if (connState.instance && typeof connState.instance.state === 'string') {
            statusFromApi = connState.instance.state.toLowerCase();
          } else if (typeof connState.state === 'string') {
            statusFromApi = connState.state.toLowerCase();
          }
          cred.status = statusFromApi || cred.metadata?.evolution?.instance?.status;
        } catch (err) {
          logger.warn('Erro ao buscar status das instâncias:', err.message);
          cred.status = cred.metadata?.evolution?.instance?.status;
        }
      }));
    }
    // Extrair QR Code do flash, se existir
    const qrImage = req.flash('qrImage')[0] || null;
    const pairingCode = req.flash('pairingCode')[0] || null;
    res.render('whatsapp-credentials', {
      title: 'Conectar WhatsApp Business',
      credentials,
      messages: req.flash(),
      qrImage,
      pairingCode
    });
  } catch (err) {
    logger.error('Erro ao listar credenciais Evolution:', err);
    req.flash('error', 'Erro ao carregar credenciais');
    res.redirect('/dashboard');
  }
});

// Handler para criar nova credencial localmente e exibir QR Code da resposta
router.post('/whatsapp-credentials', requireAuth, commonViewData, async (req, res) => {
  try {
    const { phone, instance_name } = req.body;

    // Validar telefone
    if (!phone || !/^\d{10,}$/.test(phone.replace(/\D/g, ''))) {
      return res.render('whatsapp-credentials', {
        title: 'Conectar WhatsApp Business',
        credentials: [],
        qrImage: null,
        pairingCode: null,
        messages: { error: ['Número de telefone inválido'] }
      });
    }

    // Definir nome da instância concatenando nome do usuário
    let userName = req.user.displayName || req.user.user_metadata?.full_name || req.user.profile?.full_name || req.user.user_metadata?.first_name || req.user.email?.split('@')[0] || 'Usuario';
    const instanceName = `${userName} - ${instance_name || `inst_${phone.replace(/\D/g, '').substring(0, 8)}`}`;

    // Criar instância na Evolution API solicitando QR Code
    const service = new EvolutionService({
      baseUrl: config.evolutionApi.url,
      apiKey: config.evolutionApi.apiKey,
      instanceName
    });
    const apiRes = await service.createInstance(phone);

    // Extrair dados da API
    const instanceId = apiRes.instance.instanceId;
    const instanceNameRes = apiRes.instance.instanceName;
    const partnerSecret = apiRes.hash.apikey;
    const metadata = { evolution: apiRes };

    // Salvar credencial no banco local com id da instância
    const cred = new EvolutionService({
      id: instanceId,
      client_id: req.user.id,
      phone,
      instance_name: instanceNameRes,
      partner_secret: partnerSecret,
      metadata,
      agent_name: instance_name
    });
    await cred.save();
    // Atribuir status retornado pela API para exibição imediata
    cred.status = apiRes.instance.status;
    
    // Extrair QR Code da resposta
    const qrcodeObj = apiRes.qrcode;
    const qrImage = qrcodeObj?.base64 || null;
    const pairingCode = qrcodeObj?.pairingCode || null;
    // Salvar flash de QR Code e recarregar via GET
    req.flash('qrImage', qrImage);
    req.flash('pairingCode', pairingCode);
    req.flash('success', 'Credencial criada com sucesso');
    return res.redirect('/whatsapp-credentials');
  } catch (err) {
    logger.error('Erro ao criar credencial na UI:', err);
    req.flash('error', err.message || JSON.stringify(err));
    return res.redirect('/whatsapp-credentials');
  }
});

// Handler de conexão via formulário (setupInstance)
router.post('/whatsapp-credentials/:id/setup', requireAuth, async (req, res) => {
  try {
    const existing = await EvolutionService.findById(req.params.id);
    if (!existing || existing.client_id !== req.user.id) {
      req.flash('error', 'Credencial não encontrada');
      return res.redirect('/whatsapp-credentials');
    }
    
    // Verificar se o Nome do Agente existe ou gerar um
    if (!existing.instance_name) {
      existing.instance_name = `inst_${existing.phone.replace(/\D/g, '').substring(0, 8)}`;
      await existing.save();
    }
    
    // Concatenar nome do usuário ao nome da instância existente
    let userName = req.user.displayName || req.user.user_metadata?.full_name || req.user.profile?.full_name || req.user.user_metadata?.first_name || req.user.email?.split('@')[0] || 'Usuario';
    const instanceName = `${userName} - ${existing.agent_name || existing.instance_name}`;
    const service = new EvolutionService({
      baseUrl: config.evolutionApi.url,
      apiKey: config.evolutionApi.apiKey,
      instanceName
    });
    
    const apiRes = await service.createInstance(existing.phone);
    existing.instance_name = apiRes.instance.instanceName;
    existing.partner_secret = apiRes.hash.apikey;
    existing.metadata = { ...existing.metadata, evolution: apiRes };
    await existing.save();
    req.flash('success', 'Instância configurada com sucesso');
  } catch (err) {
    logger.error('Erro ao configurar instância na UI:', err);
    req.flash('error', err.message);
  }
  return res.redirect('/whatsapp-credentials');
});

// Rotas específicas de Evolution API (deve vir antes do catch-all)
// Buscar QR Code de uma instância (exibe JSON com base64 e code)
router.get('/whatsapp-credentials/:id/qrcode', requireAuth, commonViewData, evolutionCredentialController.fetchQrCode);
// Atualizar credencial existente (JSON API)
router.post('/whatsapp-credentials/:id/update', requireAuth, commonViewData, evolutionCredentialController.update);
// Deletar instância e credencial
router.post('/whatsapp-credentials/:id/delete', requireAuth, commonViewData, evolutionCredentialController.deleteInstance);

// Rota da interface de chat
router.get('/chat', requireAuth, prepareUserData, commonViewData, async (req, res) => {
  try {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      return res.redirect('/login?redirect=/chat');
    }

    // Carregar conversas do usuário e garantir valores únicos
    const userId = req.user.id;
    const conversationId = req.query.id || userId; // Usa ID do usuário se não especificado
    // Carregar instâncias do usuário
    const instances = await EvolutionService.findAllByClientId(userId);
    // Determinar instância selecionada (parâmetro ou primeira)
    const selectedInstanceId = req.query.instance || (instances.length > 0 ? instances[0].id : null);
    // Buscar conversas filtradas pela instância selecionada
    const rawConversations = await chatService.getConversationsForUser(userId, selectedInstanceId);
    const conversations = Array.from(new Set(rawConversations));
    const contacts = await contactService.getContacts(conversations);

    res.render('chat', {
      title: 'Chat - WhatsApp',
      conversationId,
      conversations,
      contacts,
      user: res.locals.user,
      instances,
      selectedInstanceId,
      n8nApiUrl: process.env.N8N_API_URL || (require('../config').n8n && require('../config').n8n.apiUrl) || 'http://localhost:5678'
    });
  } catch (err) {
    logger.error(`Erro ao renderizar página de chat: ${err.message}`);
    res.render('error', {
      title: 'Erro',
      message: 'Ocorreu um erro ao carregar a página de chat',
      error: {}
    });
  }
});

// Rotas de credenciais de parceiros
router.get('/partner-credentials', requireAuth, commonViewData, partnerCredentialsController.list);
router.get('/partner-credentials/new', requireAuth, commonViewData, partnerCredentialsController.newForm);
router.post('/partner-credentials', requireAuth, commonViewData, partnerCredentialsController.create);
router.get('/partner-credentials/:id', requireAuth, commonViewData, partnerCredentialsController.editForm);
router.post('/partner-credentials/:id', requireAuth, commonViewData, partnerCredentialsController.update);
router.post('/partner-credentials/:id/delete', requireAuth, commonViewData, partnerCredentialsController.delete);

// Página de configuração do agente
router.get('/agents', requireAuth, commonViewData, async (req, res) => {
  // Agentes do cliente (pode vir de banco de dados real)
  const agents = [
    { id: 1, name: 'Agente 1' },
    { id: 2, name: 'Agente 2' }
  ];
  // Determinar modo atual a partir de contacts
  const clientId = req.user.id;
  const instances = await EvolutionService.findAllByClientId(clientId);
  const instanceIds = instances.map(inst => inst.id);
  let mode = 'full';
  if (instanceIds.length) {
    const { data: rows, error } = await supabaseAdmin
      .from('contacts')
      .select('agent_status')
      .in('instance_id', instanceIds)
      .limit(1);
    if (!error && rows.length) {
      mode = rows[0].agent_status || 'full';
    }
  }
  res.render('agents/index', { agents, mode });
});

// Rota para atualizar modo do agente
router.post('/agents/mode', requireAuth, agentsController.updateMode);

// Rota para manipular erros 404
router.use((req, res) => {
  res.status(404).render('error', {
    title: 'Página não encontrada',
    message: 'A página que você está procurando não foi encontrada.',
    error: {}
  });
});

module.exports = {
  router,
  prepareUserData
};