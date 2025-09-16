/**
 * Middleware para verificação de permissões de administrador
 */
const logger = require('../utils/logger');

/**
 * Middleware que verifica se o usuário é administrador
 */
const requireAdmin = (req, res, next) => {
  try {
    // Verificar se existe usuário autenticado
    if (!req.user || !req.user.id) {
      logger.warn('Tentativa de acesso administrativo sem autenticação');
      return res.status(401).json({
        success: false,
        message: 'Autenticação necessária para acessar este recurso'
      });
    }
    
    // Verificar se o usuário tem papel de admin
    // Por enquanto, vamos considerar que qualquer usuário autenticado pode ser admin
    // Em um sistema mais robusto, você verificaria o campo 'role' na tabela user_profiles
    if (!req.user.role || !['admin', 'owner'].includes(req.user.role)) {
      logger.warn(`Usuário ${req.user.id} tentou acessar recurso administrativo sem permissão`);
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para acessar este recurso administrativo'
      });
    }
    
    // Usuário tem permissão de admin, continuar
    logger.info(`Acesso administrativo autorizado para usuário ${req.user.id}`);
    next();
    
  } catch (error) {
    logger.error('Erro no middleware de admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  requireAdmin
};
