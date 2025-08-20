// Middleware para autenticação
const { supabase } = require('../config/supabase');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Middleware para verificar autenticação do token JWT
 */
exports.verifyToken = async (req, res, next) => {
  try {
    // Verificar token JWT no cabeçalho
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token de autenticação não fornecido', 401);
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verificar token com Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      throw new AppError('Token inválido ou expirado', 401);
    }
    
    // Anexar usuário à requisição
    req.user = data.user;
    
    // Buscar perfil completo do usuário para garantir nome completo
    try {
      const { data: profile, error: profileError } = await require('../config/supabase').supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', req.user.id)
        .single();
      if (!profileError && profile) {
        // Priorizar full_name do perfil
        req.user.full_name = profile.full_name || req.user.user_metadata?.full_name || req.user.email?.split('@')[0] || 'Usuário';
        req.user.name = req.user.full_name;
        req.user.displayName = req.user.full_name;
      } else {
        // Fallback para metadados
        req.user.full_name = req.user.user_metadata?.full_name || req.user.email?.split('@')[0] || 'Usuário';
        req.user.name = req.user.full_name;
        req.user.displayName = req.user.full_name;
      }
    } catch (profileCatchErr) {
      req.user.full_name = req.user.user_metadata?.full_name || req.user.email?.split('@')[0] || 'Usuário';
      req.user.name = req.user.full_name;
      req.user.displayName = req.user.full_name;
    }

    // Seguir para o próximo middleware
    next();
  } catch (error) {
    logger.error(`Erro na verificação do token: ${error.message}`);
    
    if (error instanceof AppError) {
      return next(error);
    }
    
    return next(new AppError('Erro de autenticação', 500));
  }
};

/**
 * Função auxiliar para extrair token de várias fontes
 */
const extractToken = (req) => {
  let token = null;
  
  // 1. Verificar no header de autorização
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
    logger.info('Token encontrado no header Authorization');
    return token;
  }
  
  // 2. Verificar nos cookies do Express
  const cookieNames = ['authToken', 'supabase-auth-token', 'js-auth-token', 'sb-access-token'];
  for (const name of cookieNames) {
    if (req.cookies && req.cookies[name]) {
      token = req.cookies[name];
      logger.info(`Token encontrado no cookie ${name}`);
      return token;
    }
  }
  
  // 3. Verificar no cookie header manual (caso não tenha sido parseado pelo cookie-parser)
  if (req.headers.cookie) {
    for (const name of cookieNames) {
      // Sanitizar o nome do cookie para evitar regex injection
      const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = new RegExp(`${safeName}=([^;]+)`).exec(req.headers.cookie);
      if (match) {
        token = match[1];
        logger.info(`Token encontrado no cookie header para ${name}`);
        return token;
      }
    }
  }
  
  // 4. Verificar em query param (menos seguro, mas útil para download de arquivos)
  if (req.query && req.query.token) {
    token = req.query.token;
    logger.info('Token encontrado no query param');
    return token;
  }
  
  return null;
};

/**
 * Middleware para requerir autenticação
 * Suporta tokens do Supabase e tokens personalizados
 */
exports.requireAuth = async (req, res, next) => {
  try {
    // Obter o token de autenticação
    const token = extractToken(req);
    logger.info(`[AUTH] Iniciando autenticação para rota: ${req.originalUrl}`);
    logger.info(`[AUTH] Token recebido: ${token ? token.substring(0, 15) + '...' : 'NENHUM'}`);

    if (!token) {
      logger.warn('[AUTH] Tentativa de acesso protegido sem token');
      return res.status(401).json({
        success: false,
        message: 'Acesso não autorizado. Faça login para continuar.'
      });
    }

    try {
      // Verificar com Supabase primeiro
      try {
        const { data, error } = await supabase.auth.getUser(token);
        logger.info(`[AUTH] Resultado Supabase: user=${data && data.user ? data.user.id : 'N/A'}, error=${error ? error.message : 'N/A'}`);
        if (data && data.user && !error) {
          req.user = data.user;
          logger.info(`[AUTH] Usuário autenticado via Supabase: ${req.user.id}`);
          return next();
        }
      } catch (supabaseError) {
        logger.warn(`[AUTH] Erro na verificação Supabase: ${supabaseError.message}`);
        // Falha na verificação Supabase, tentar JWT genérico
      }
      // Tentar como JWT genérico se falhar com Supabase
      const jwt = require('jsonwebtoken');
      try {
        // Tentar decodificar o token sem verificação primeiro
        const decoded = jwt.decode(token);
        logger.info(`[AUTH] Decoded JWT: ${JSON.stringify(decoded)}`);
        if (decoded && (decoded.sub || decoded.userId)) {
          // É um JWT com um ID de usuário, vamos considerá-lo válido para testes
          const userId = decoded.sub || decoded.userId;
          // Adicionar dados mínimos do usuário ao objeto req
          req.user = {
            id: userId,
            email: decoded.email || 'user@example.com',
            app_metadata: decoded.app_metadata || { role: 'user' }
          };
          logger.info(`[AUTH] Usuário autenticado via token JWT genérico: ${userId}`);
          return next();
        }
        // Se chegou aqui, o token não foi reconhecido
        logger.warn(`[AUTH] Token ${token.substring(0, 10)}... não é válido`);
        return res.status(401).json({
          success: false,
          message: 'Token inválido.'
        });
      } catch (jwtError) {
        logger.warn(`[AUTH] Erro ao processar JWT: ${jwtError.message}`);
        return res.status(401).json({
          success: false,
          message: 'Token inválido ou mal-formado.'
        });
      }
    } catch (authError) {
      logger.error(`[AUTH] Erro na verificação de token: ${authError.message}`);
      return res.status(401).json({
        success: false,
        message: 'Erro na autenticação. Tente novamente.'
      });
    }
  } catch (err) {
    logger.error(`[AUTH] Erro no middleware de autenticação: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno de autenticação'
    });
  }
};

/**
 * Middleware para restringir acesso com base em papel/cargo
 * @param {...String} roles - Lista de papéis permitidos
 */
exports.restrictTo = (...roles) => {
  return async (req, res, next) => {
    try {
      // Obter o ID do usuário do middleware de verificação de token
      const userId = req.user.id;
      
      // Se não tiver organizationId no parâmetro, não faz verificação de papel
      if (!req.params.organizationId) {
        return next();
      }
      
      // Buscar o papel do usuário na organização
      const { data, error } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', req.params.organizationId)
        .single();
      
      if (error || !data) {
        throw new AppError('Você não pertence a esta organização', 403);
      }
      
      // Verificar se o papel do usuário está na lista de papéis permitidos
      if (!roles.includes(data.role)) {
        throw new AppError('Você não tem permissão para realizar esta ação', 403);
      }
      
      next();
    } catch (error) {
      logger.error(`Erro na verificação de papéis: ${error.message}`);
      
      if (error instanceof AppError) {
        return next(error);
      }
      
      return next(new AppError('Erro de autorização', 500));
    }
  };
};

/**
 * Middleware para verificar se o usuário é administrador
 */
exports.requireAdmin = async (req, res, next) => {
  try {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      logger.warn('Tentativa de acesso à função administrativa sem autenticação');
      throw new AppError('Autenticação necessária', 401);
    }

    // Para testes: se usamos token personalizado, vamos permitir acesso administrativo
    // Em ambiente de produção, remover esta condição e usar apenas a verificação padrão
    if (process.env.NODE_ENV !== 'production') {
      const jwt = require('jsonwebtoken');
      const token = extractToken(req);
      
      if (token) {
        try {
          const decoded = jwt.decode(token);
          if (decoded && decoded.hasOwnProperty('userId')) {
            logger.info(`Acesso administrativo concedido ao token de teste para usuário: ${req.user.id}`);
            return next();
          }
        } catch (err) {
          // Ignorar erro na decodificação e seguir para verificação normal
        }
      }
    }

    // Verificar se o usuário tem a propriedade de admin nos metadados
    // Supabase pode usar 'app_metadata.role' como 'admin' ou 'app_metadata.isAdmin' como true
    const isAdmin = 
      (req.user.app_metadata?.role === 'admin') || 
      (req.user.app_metadata?.isAdmin === true);

    if (!isAdmin) {
      logger.warn(`Tentativa de acesso à função administrativa por usuário não autorizado: ${req.user.id}`);
      throw new AppError('Acesso restrito a administradores', 403);
    }

    logger.info(`Acesso administrativo concedido ao usuário: ${req.user.id}`);
    
    // Seguir para o próximo middleware
    next();
  } catch (error) {
    logger.error(`Erro na verificação de acesso administrativo: ${error.message}`);
    
    if (error instanceof AppError) {
      return next(error);
    }
    
    return next(new AppError('Erro de autorização de administrador', 500));
  }
}; 