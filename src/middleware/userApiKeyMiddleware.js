/**
 * Middleware para autenticação de usuários por API key
 */
const userCredentialsService = require('../services/userCredentialsService');
const logger = require('../utils/logger');

/**
 * Middleware para autenticação por API key de usuário
 * Procura a chave no header 'X-User-API-Key' e valida
 */
async function userApiKeyMiddleware(req, res, next) {
  try {
    // Verificar API key no cabeçalho
    const apiKey = req.headers['x-user-api-key'] || req.query.api_key;
    
    logger.info(`[userApiKeyMiddleware] Verificando API key: ${apiKey ? 'Presente' : 'Ausente'}`);
    
    if (!apiKey) {
      logger.warn('[userApiKeyMiddleware] Requisição sem API key de usuário');
      return res.status(401).json({
        success: false,
        message: 'API key não fornecida'
      });
    }
    
    // Log protegido (não exibe a chave completa)
    logger.info(`[userApiKeyMiddleware] API key para validação: ${apiKey.substring(0, 5)}...`);
    
    // Validar a chave
    const keyInfo = await userCredentialsService.validateApiKey(apiKey);
    
    if (!keyInfo) {
      logger.warn('[userApiKeyMiddleware] Tentativa de acesso com API key inválida ou expirada');
      return res.status(401).json({
        success: false,
        message: 'API key inválida, revogada ou expirada'
      });
    }
    
    logger.info(`[userApiKeyMiddleware] API key válida: ${keyInfo.keyId}, Usuário: ${keyInfo.userId}`);
    
    // Registrar uso da API key
    userCredentialsService.logApiKeyUsage(
      keyInfo.keyId,
      req.method,
      req.originalUrl,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    ).catch(err => {
      logger.error(`[userApiKeyMiddleware] Erro ao registrar uso da API key: ${err.message}`);
      // Não interrompe o fluxo se falhar
    });
    
    // Estrutura completa e consistente do objeto req.user
    // Garantindo que seja compatível com o formato criado pelo requireAuth
    req.user = {
      id: keyInfo.userId,
      email: keyInfo.userEmail,
      // Adicionar propriedades extras para compatibilidade
      user_metadata: {
        name: keyInfo.userName,
        full_name: keyInfo.userName
      },
      // Adicionar displayName para compatibilidade com código que usa essa propriedade
      displayName: keyInfo.userName || keyInfo.userEmail?.split('@')[0] || 'Usuário',
      // Informações sobre a API key usada
      apiKey: {
        id: keyInfo.keyId,
        name: keyInfo.keyName
      },
      // Indicador de que este usuário foi autenticado via API key
      auth_method: 'api_key'
    };
    
    logger.info(`[userApiKeyMiddleware] Usuário ${keyInfo.userId} autenticado com API key: ${keyInfo.keyName || keyInfo.keyId}`);
    logger.info(`[userApiKeyMiddleware] Objeto req.user configurado: ${JSON.stringify(req.user)}`);
    
    // Continuar com a requisição
    next();
  } catch (error) {
    logger.error(`[userApiKeyMiddleware] Erro no middleware de API key: ${error.message}`);
    logger.error(error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao processar autenticação'
    });
  }
}

module.exports = userApiKeyMiddleware; 