/**
 * Middleware para verificação de papéis de usuários
 * Permite controlar acesso a rotas com base nos papéis do usuário
 */
const logger = require('../utils/logger');

/**
 * Middleware que verifica se o usuário possui um dos papéis requeridos
 * 
 * @param {Array} roles - Array de strings com os papéis permitidos
 * @returns {Function} Middleware que verifica se o usuário possui um dos papéis
 */
const requireRole = (roles) => {
  // Converter string única para array
  if (typeof roles === 'string') {
    roles = [roles];
  }
  
  return async (req, res, next) => {
    try {
      // Verificar se existe usuário autenticado
      if (!req.user || !req.user.id) {
        logger.warn('Tentativa de acesso com restrição de papel sem autenticação');
        return res.status(401).json({
          success: false,
          message: 'Autenticação necessária para acessar este recurso'
        });
      }
      
      // Verificar se o usuário tem um papel definido
      if (!req.user.role) {
        logger.warn(`Usuário ${req.user.id} não possui papel definido`);
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para acessar este recurso'
        });
      }
      
      // Verificar se o papel do usuário está na lista de papéis permitidos
      if (!roles.includes(req.user.role)) {
        logger.warn(`Usuário ${req.user.id} com papel ${req.user.role} tentou acessar recurso restrito a: ${roles.join(', ')}`);
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para acessar este recurso'
        });
      }
      
      // Usuário tem permissão, continuar
      logger.info(`Acesso autorizado para usuário ${req.user.id} com papel ${req.user.role}`);
      next();
    } catch (error) {
      logger.error(`Erro na verificação de papéis: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar permissões'
      });
    }
  };
};

/**
 * Middleware que verifica se o usuário é um administrador
 */
const requireAdmin = async (req, res, next) => {
  return requireRole(['admin', 'superadmin'])(req, res, next);
};

/**
 * Middleware que verifica se o usuário é um superadministrador
 */
const requireSuperAdmin = async (req, res, next) => {
  return requireRole('superadmin')(req, res, next);
};

module.exports = {
  requireRole,
  requireAdmin,
  requireSuperAdmin
}; 