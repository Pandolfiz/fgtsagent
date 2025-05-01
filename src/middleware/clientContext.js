const logger = require('../utils/logger');

/**
 * Middleware para extrair client_id do token JWT e anexar em req.clientId
 */
module.exports = (req, res, next) => {
  try {
    // req.user deve ter sido definido pelo requireAuth
    const appMeta = req.user?.app_metadata;
    const clientId = appMeta?.client_id || req.user?.id;
    if (!clientId) {
      logger.warn('clientContext: client_id ausente e fallback falhou');
    }
    req.clientId = clientId;
    next();
  } catch (err) {
    logger.error('Erro em clientContext:', err.message || err);
    return res.status(500).json({ success: false, message: 'Erro ao extrair client_id' });
  }
}; 