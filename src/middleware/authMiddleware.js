/**
 * Middleware unificado de autenticação
 * Suporta JWT tokens, API keys e múltiplas fontes de token
 */
const { supabase, supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Extrai token de autenticação de múltiplas fontes
 */
const extractTokenFromRequest = (req) => {
  // 1. Header Authorization (prioridade máxima)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  
  // 2. Cookies (prioridade média)
  const cookieNames = ['authToken', 'supabase-auth-token', 'js-auth-token'];
  for (const name of cookieNames) {
    if (req.cookies && req.cookies[name]) {
      return req.cookies[name];
    }
  }
  
  // 3. Query parameter (para casos especiais)
  if (req.query.token) {
    return req.query.token;
  }
  
  // 4. Body parameter (para APIs)
  if (req.body && req.body.token) {
    return req.body.token;
  }
  
  return null;
};

/**
 * Extrai refresh token de múltiplas fontes
 */
const extractRefreshToken = (req) => {
  // 1. Cookies específicos para refresh token
  const refreshCookieNames = ['refreshToken', 'supabase-refresh-token', 'sb-refresh-token'];
  for (const name of refreshCookieNames) {
    if (req.cookies && req.cookies[name]) {
      return req.cookies[name];
    }
  }
  
  // 2. Cookie header manual para refresh token
  if (req.headers.cookie) {
    for (const name of refreshCookieNames) {
      const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = new RegExp(`${safeName}=([^;]+)`).exec(req.headers.cookie);
      if (match) {
        return match[1];
      }
    }
  }
  
  return null;
};

/**
 * Autentica usuário usando API key
 */
const authenticateWithApiKey = async (req, res, next, apiKey) => {
  try {
    // TODO: Implementar validação real de API key
    // Por enquanto, aceitar qualquer API key para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      req.apiKey = apiKey;
      req.user = { id: 'api-user', email: 'api@example.com', full_name: 'API User' };
      logger.info('[AUTH] Autenticação por API key bem-sucedida (desenvolvimento)');
      return next();
    }
    
    // Em produção, validar a API key
    // const { data: keyData, error } = await supabase
    //   .from('user_api_keys')
    //   .select('*')
    //   .eq('key', apiKey)
    //   .eq('active', true)
    //   .single();
    
    return res.status(401).json({
      success: false,
      message: 'API key inválida'
    });
    
  } catch (error) {
    logger.error(`[AUTH] Erro na verificação de API key: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno de autenticação'
    });
  }
};

/**
 * Middleware unificado para verificar se o usuário está autenticado
 * Suporta JWT tokens, API keys e múltiplas fontes de token
 */
const requireAuth = async (req, res, next) => {
  try {
    // Inicializar/Limpar dados de usuário para evitar contaminação entre requisições
    req.user = null;
    
    // Verificar e criar tabela de perfis se necessário
    await checkAndCreateTables();
    
    // ✅ OTIMIZADO: Extrair token de múltiplas fontes
    let token = extractTokenFromRequest(req);
    
    // ✅ NOVO: Verificar API key como alternativa
    const apiKey = req.headers['x-user-api-key'] || req.query.api_key;
    
    if (apiKey && !token) {
      logger.info('[AUTH] Tentando autenticação por API key');
      return await authenticateWithApiKey(req, res, next, apiKey);
    }
    
    if (!token) {
      logger.warn(`[AUTH] Tentativa de acesso sem token: ${req.originalUrl}`);
      
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({
          success: false,
          message: 'Token de autenticação necessário'
        });
      }
      
      // Para rotas web, redirecionar para login
      return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
    }
    
    // ✅ CORRIGIDO: Verificar se o token está expirado ANTES de chamar Supabase
    const isTokenExpired = (token) => {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) {
          logger.warn('[AUTH] Token malformado - sem campo exp');
          return true; // Considerar expirado se não tem campo exp
        }
        const now = Math.floor(Date.now() / 1000);
        const isExpired = decoded.exp < now;
        if (isExpired) {
          logger.info(`[AUTH] Token expirado - exp: ${decoded.exp}, now: ${now}`);
        }
        return isExpired;
      } catch (error) {
        logger.warn(`[AUTH] Erro ao decodificar token: ${error.message}`);
        return true; // Considerar expirado se não consegue decodificar
      }
    };

    // Se token está expirado, tentar refresh IMEDIATAMENTE
    if (isTokenExpired(token)) {
      logger.info('[AUTH] Token expirado detectado, tentando refresh...');
      const refreshToken = extractRefreshToken(req);
      
      if (refreshToken) {
        logger.info('[AUTH] Refresh token encontrado, tentando renovar...');
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: refreshToken
          });
          
          if (!refreshError && refreshData.session) {
            logger.info('[AUTH] Token renovado com sucesso');
            
            // Atualizar cookies com novos tokens
            res.cookie('authToken', refreshData.session.access_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              maxAge: 24 * 60 * 60 * 1000, // 1 dia
              sameSite: 'lax'
            });
            
            res.cookie('refreshToken', refreshData.session.refresh_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
              sameSite: 'lax'
            });
            
            // Usar o novo token para autenticação
            req.user = refreshData.user;
            req.user.full_name = req.user.user_metadata?.full_name || req.user.email?.split('@')[0] || 'Usuário';
            req.user.first_name = req.user.user_metadata?.first_name || '';
            req.user.last_name = req.user.user_metadata?.last_name || '';
            req.user.phone = req.user.user_metadata?.phone || '';
            
            logger.info(`[AUTH] Usuário autenticado com token renovado: ${req.user.email} (${req.user.id})`);
            return next();
          } else {
            logger.warn(`[AUTH] Erro ao renovar token: ${refreshError?.message || 'Sessão não encontrada'}`);
          }
        } catch (refreshErr) {
          logger.warn(`[AUTH] Erro ao renovar token: ${refreshErr.message}`);
        }
      } else {
        logger.warn('[AUTH] Token expirado mas refresh token não encontrado');
      }
    }

    // ✅ OTIMIZADO: Verificar token com Supabase (apenas se não foi renovado)
    try {
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error || !data.user) {
        
        logger.warn(`[AUTH] Token inválido: ${error?.message || 'Usuário não encontrado'}`);
        
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(401).json({
            success: false,
            message: 'Token inválido ou expirado'
          });
        }
        
        return res.redirect('/login?error=invalid_token');
      }
      
      // ✅ OTIMIZADO: Token válido - anexar usuário à requisição
      req.user = data.user;
      
      // ✅ OTIMIZADO: Usar apenas metadados para evitar consultas ao banco
      req.user.full_name = req.user.user_metadata?.full_name || req.user.email?.split('@')[0] || 'Usuário';
      req.user.first_name = req.user.user_metadata?.first_name || '';
      req.user.last_name = req.user.user_metadata?.last_name || '';
      req.user.phone = req.user.user_metadata?.phone || '';
      
      // ✅ OTIMIZADO: Garantir que o token esteja nos cookies para futuras requisições
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 1 dia
        sameSite: 'lax'
      });
      
      logger.info(`[AUTH] Usuário autenticado: ${req.user.email} (${req.user.id})`);
      next();
      
    } catch (supabaseError) {
      logger.error(`[AUTH] Erro na verificação Supabase: ${supabaseError.message}`);
      
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({
          success: false,
          message: 'Erro interno de autenticação'
        });
      }
      
      return res.redirect('/login?error=auth_error');
    }
    
  } catch (err) {
    logger.error(`[AUTH] Erro no middleware: ${err.message}`);
    
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(500).json({
        success: false,
        message: 'Erro interno de autenticação'
      });
    }
    
    return res.redirect('/login?error=internal_error');
  }
};

/**
 * Middleware para verificar se o usuário é administrador
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticação necessária'
      });
    }
    
    // Verificar se é admin
    const isAdmin = req.user.app_metadata?.role === 'admin' || 
                   req.user.app_metadata?.isAdmin === true ||
                   req.user.user_metadata?.role === 'admin';
    
    if (!isAdmin) {
      logger.warn(`[AUTH] Tentativa de acesso administrativo por usuário não autorizado: ${req.user.id}`);
      
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({
          success: false,
          message: 'Acesso restrito a administradores'
        });
      }
      
      return res.redirect('/dashboard?error=admin_required');
    }
    
    logger.info(`[AUTH] Acesso administrativo concedido: ${req.user.email}`);
    next();
    
  } catch (error) {
    logger.error(`[AUTH] Erro na verificação de admin: ${error.message}`);
    
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(500).json({
        success: false,
        message: 'Erro interno de autorização'
      });
    }
    
    return res.redirect('/dashboard?error=auth_error');
  }
};

/**
 * Middleware para verificar se o usuário pertence a uma organização
 */
const requireOrganization = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticação necessária'
      });
    }
    
    // Buscar organizações do usuário
    const { data: organizations, error } = await supabase
      .from('organization_members')
      .select('organization_id, organizations(id, name, slug)')
      .eq('user_id', req.user.id);
    
    if (error) {
      logger.error(`[AUTH] Erro ao buscar organizações: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar organização'
      });
    }
    
    if (!organizations || organizations.length === 0) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({
          success: false,
          message: 'Usuário não pertence a nenhuma organização'
        });
      }
      
      return res.redirect('/dashboard?error=no_organization');
    }
    
    // Anexar organização à requisição
    req.organization = organizations[0].organizations;
    next();
    
  } catch (error) {
    logger.error(`[AUTH] Erro na verificação de organização: ${error.message}`);
    
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(500).json({
        success: false,
        message: 'Erro interno de autorização'
      });
    }
    
    return res.redirect('/dashboard?error=auth_error');
  }
};

/**
 * Função para verificar e criar tabelas necessárias
 */
const checkAndCreateTables = async () => {
  try {
    // Verificar se a tabela user_profiles existe usando uma consulta simples
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    // Se não há erro, a tabela existe
    if (!error) {
      return;
    }
    
    // Se o erro é que a tabela não existe, apenas logar
    if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
      logger.warn('Tabela user_profiles não encontrada. Execute a migração manualmente se necessário.');
      // Não tentar criar automaticamente para evitar erros
      return;
    }
    
    // Outros erros
    logger.error('Erro ao verificar tabela user_profiles:', error);
  } catch (err) {
    logger.error('Erro ao verificar tabelas:', err);
  }
};

/**
 * Middleware para verificar autenticação em APIs
 */
const isAuthenticatedApi = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticação necessário'
      });
    }
    next();
  } catch (error) {
    logger.error(`[AUTH] Erro no middleware de API: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno de autenticação'
    });
  }
};

/**
 * Middleware para preparar dados do usuário
 */
const prepareUserData = async (req, res, next) => {
  try {
    if (req.user) {
      // Buscar perfil completo do usuário
      const { data: profile, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', req.user.id)
        .single();
      
      if (!error && profile) {
        req.userProfile = profile;
        res.locals.userProfile = profile;
      }
      
      // Adicionar dados do usuário às variáveis locais
      res.locals.user = req.user;
      res.locals.isAuthenticated = true;
    } else {
      res.locals.isAuthenticated = false;
    }
    
    next();
  } catch (error) {
    logger.error('Erro ao preparar dados do usuário:', error);
    next();
  }
};

/**
 * Middleware para garantir que o usuário tenha um perfil
 */
const ensureUserProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }
    
    // Verificar se o usuário tem um perfil
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // Perfil não existe, criar um
      const { error: createError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: req.user.id,
          email: req.user.email,
          full_name: req.user.user_metadata?.full_name || req.user.email?.split('@')[0] || 'Usuário',
          first_name: req.user.user_metadata?.first_name || '',
          last_name: req.user.user_metadata?.last_name || '',
          phone: req.user.user_metadata?.phone || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (createError) {
        logger.error('Erro ao criar perfil do usuário:', createError);
      } else {
        logger.info(`Perfil criado para usuário: ${req.user.id}`);
      }
    }
    
    next();
  } catch (error) {
    logger.error('Erro ao verificar/criar perfil do usuário:', error);
    next();
  }
};

/**
 * Middleware para preparar dados comuns para todas as views
 */
const commonViewData = (req, res, next) => {
  try {
    // Definir variáveis globais para todas as views
    res.locals.appName = process.env.APP_NAME || 'Meu App';
    res.locals.appVersion = process.env.APP_VERSION || '1.0.0';
    res.locals.appEnv = process.env.NODE_ENV || 'development';
    res.locals.currentYear = new Date().getFullYear();
    
    // Adicionar informações sobre a requisição atual
    res.locals.currentPath = req.path;
    res.locals.currentUrl = req.originalUrl;
    res.locals.isAuthenticated = req.isAuthenticated || false;
    
  } catch (err) {
    logger.error('Erro ao preparar dados comuns para a view:', err);
    // Continuar mesmo com erro
  }
  
  next();
};

// Exportações do módulo
module.exports = {
  requireAuth,
  requireOrganization,
  requireAdmin,
  checkAndCreateTables,
  isAuthenticatedApi,
  prepareUserData,
  commonViewData,
  ensureUserProfile
};