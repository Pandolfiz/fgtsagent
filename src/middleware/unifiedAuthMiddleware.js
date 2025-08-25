/**
 * Middleware unificado de autenticação
 * Resolve conflitos entre múltiplos middlewares e padroniza autenticação
 */
const { supabase, supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Extrai token de autenticação de múltiplas fontes
 */
const extractToken = (req) => {
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
  
  return null;
};

/**
 * Middleware principal de autenticação (OTIMIZADO)
 */
const requireAuth = async (req, res, next) => {
  try {
    // Limpar dados de usuário anteriores
    req.user = null;
    
    // Extrair token
    const token = extractToken(req);
    
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
    
    // ✅ OTIMIZADO: Verificar token com Supabase (sem consultas adicionais)
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
    // Verificar se o usuário está autenticado
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
 * Middleware para verificar se o usuário tem uma API key válida
 */
const requireApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-user-api-key'] || req.query.api_key;
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key necessária'
      });
    }
    
    // TODO: Implementar validação de API key
    // Por enquanto, aceitar qualquer API key para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      req.apiKey = apiKey;
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

module.exports = {
  requireAuth,
  requireAdmin,
  requireOrganization,
  requireApiKey,
  extractToken
};
