/**
 * Middleware combinado para autenticação de usuários
 * Tenta autenticar usando token JWT e, caso falhe, tenta usar API key
 */
const { requireAuth } = require('./authMiddleware');
const userApiKeyMiddleware = require('./userApiKeyMiddleware');
const logger = require('../utils/logger');

/**
 * Middleware que tenta autenticar o usuário usando token JWT e,
 * se falhar, tenta usar a API key como alternativa
 */
const combinedAuth = async (req, res, next) => {
  try {
    // Adicionar logs para diagnóstico
    logger.info(`[combinedAuth] Requisição para ${req.method} ${req.originalUrl}`);
    logger.info(`[combinedAuth] Headers: ${JSON.stringify(req.headers)}`);
    logger.info(`[combinedAuth] API Key presente: ${req.headers['x-user-api-key'] ? 'Sim' : 'Não'}`);
    
    // Verificar se a requisição tem o header de API key
    const hasApiKey = req.headers['x-user-api-key'] || req.query.api_key;
    
    if (hasApiKey) {
      // Se temos uma API key, usar o middleware de API key diretamente
      logger.info('[combinedAuth] Detectada API key na requisição, usando autenticação por API key');
      return userApiKeyMiddleware(req, res, next);
    }
    
    // Se não tem API key, tentar autenticação normal por JWT
    logger.info('[combinedAuth] Tentando autenticação por JWT');
    
    // Verificar diretamente se há Token nos cookies ou Headers
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.authToken;
    
    logger.info(`[combinedAuth] Token no cookie: ${cookieToken ? 'Presente' : 'Ausente'}`);
    logger.info(`[combinedAuth] Token no header: ${authHeader ? 'Presente' : 'Ausente'}`);
    
    if (!authHeader && !cookieToken && !req.query.token) {
      logger.warn('[combinedAuth] Nenhum método de autenticação detectado');
      return res.status(401).json({
        success: false,
        message: 'Autenticação necessária: forneça um token JWT ou uma API key'
      });
    }
    
    // Chamar diretamente o middleware de autenticação JWT
    requireAuth(req, res, (err) => {
      if (err) {
        logger.warn(`[combinedAuth] Falha na autenticação JWT: ${err.message}`);
        
        // Verificar se existe uma API key como fallback na query
        if (req.query.fallback_api_key) {
          // Simular o header com a API key fallback
          logger.info('[combinedAuth] Tentando API key fallback da query');
          req.headers['x-user-api-key'] = req.query.fallback_api_key;
          return userApiKeyMiddleware(req, res, next);
        }
        
        // Sem fallback, retornar erro
        return res.status(401).json({
          success: false,
          message: 'Autenticação falhou. Forneça um token JWT válido ou uma API key.'
        });
      }
      
      // Se chegou aqui, a autenticação JWT foi bem-sucedida
      logger.info('[combinedAuth] Autenticação JWT bem-sucedida');
      next();
    });
  } catch (error) {
    logger.error(`[combinedAuth] Erro no middleware combinado: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao processar autenticação'
    });
  }
};

module.exports = {
  combinedAuth
}; 