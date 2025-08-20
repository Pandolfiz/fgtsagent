const logger = require('../config/logger');
const config = require('../config');

/**
 * Middleware para autenticação de webhooks da Evolution API
 */
exports.webhookAuth = async (req, res, next) => {
  try {
    // Verificar API key no header
    const apiKey = req.headers['x-api-key'] || req.headers['apikey'];
    
    if (!apiKey) {
      logger.warn('Tentativa de acesso ao webhook sem API key');
      return res.status(401).json({
        success: false,
        message: 'API key não fornecida'
      });
    }

    // Verificar se a API key corresponde à configurada
    if (apiKey !== config.evolutionApi.apiKey) {
      logger.warn('Tentativa de acesso ao webhook com API key inválida');
      return res.status(401).json({
        success: false,
        message: 'API key inválida'
      });
    }

    // API key válida, continuar
    logger.info('Webhook autenticado com sucesso via API key');
    next();
  } catch (error) {
    logger.error(`Erro na autenticação do webhook: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar autenticação do webhook'
    });
  }
}; 