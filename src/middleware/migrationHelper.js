/**
 * 🚀 Helper para Migração Gradual de Autenticação
 * 
 * Este arquivo facilita a migração gradual do sistema de autenticação,
 * permitindo alternar entre middlewares antigos e novos sem quebrar o sistema.
 * 
 * @author Equipe de Desenvolvimento
 * @version 1.0.0
 * @since 2024-01-XX
 */

const logger = require('../utils/logger');

/**
 * Configuração de migração - SIMPLIFICADA
 * Agora usa apenas o middleware unificado
 */
const MIGRATION_CONFIG = {
  // Usar apenas middleware unificado
  USE_UNIFIED_AUTH: true,
  USE_LEGACY_AUTH: false,
  
  // Configuração de fallback desabilitada
  FALLBACK_TO_LEGACY: false
};

/**
 * Helper simplificado - usa apenas middleware unificado
 */
class MigrationHelper {
  constructor() {
    this.unifiedAuth = null;
    this.migrationStats = {
      unifiedRequests: 0,
      errors: 0
    };
  }

  /**
   * Inicializa apenas o middleware unificado
   */
  initialize() {
    try {
      // Carrega apenas middleware unificado
      const { requireAuth: unifiedRequireAuth, requireAdmin: unifiedRequireAdmin } = 
        require('./unifiedAuthMiddleware');
      this.unifiedAuth = { requireAuth: unifiedRequireAuth, requireAdmin: unifiedRequireAdmin };
      logger.info('✅ Middleware unificado carregado');
      logger.info('🚀 MigrationHelper inicializado com sucesso');
    } catch (error) {
      logger.error('❌ Erro ao inicializar MigrationHelper:', error);
      throw error;
    }
  }

  /**
   * Retorna sempre o middleware unificado
   */
  getMiddlewareForRoute(req) {
    const path = req.path;
    logger.debug(`[MIGRATION] Usando middleware unificado para: ${path}`);
    
    if (!this.unifiedAuth) {
      logger.error(`[MIGRATION] Middleware unificado não inicializado para: ${path}`);
      throw new Error('Middleware unificado não inicializado');
    }
    
    this.migrationStats.unifiedRequests++;
    return this.unifiedAuth;
  }

  /**
   * Middleware requireAuth simplificado
   */
  requireAuth() {
    return async (req, res, next) => {
      try {
        logger.debug(`[MIGRATION] Processando requisição: ${req.method} ${req.path}`);
        
        const middleware = this.getMiddlewareForRoute(req);
        const requireAuth = middleware.requireAuth;
        
        // Adiciona header para debug
        res.set('X-Auth-Middleware', 'unified');
        
        return requireAuth(req, res, next);
      } catch (error) {
        this.migrationStats.errors++;
        logger.error('❌ Erro no middleware de migração:', error);
        return res.status(500).json({
          success: false,
          message: 'Erro interno de autenticação',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    };
  }

  /**
   * Middleware requireAdmin simplificado
   */
  requireAdmin() {
    return async (req, res, next) => {
      try {
        const middleware = this.getMiddlewareForRoute(req);
        const requireAdmin = middleware.requireAdmin;
        
        // Adiciona header para debug
        res.set('X-Auth-Middleware', 'unified');
        
        return requireAdmin(req, res, next);
      } catch (error) {
        this.migrationStats.errors++;
        logger.error('❌ Erro no middleware de migração (admin):', error);
        return res.status(500).json({
          success: false,
          message: 'Erro interno de autenticação',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    };
  }

  /**
   * Obtém estatísticas de migração
   */
  getStats() {
    return {
      ...this.migrationStats,
      totalRequests: this.migrationStats.unifiedRequests,
      unifiedPercentage: 100,
      unifiedEnabled: true,
      legacyEnabled: false,
      fallbackEnabled: false
    };
  }

  /**
   * Reseta estatísticas
   */
  resetStats() {
    this.migrationStats = {
      unifiedRequests: 0,
      errors: 0
    };
  }

  /**
   * Atualiza configuração de migração (desabilitado - usa apenas unificado)
   */
  updateConfig(newConfig) {
    logger.warn('updateConfig desabilitado - usando apenas middleware unificado');
  }
}

// Instância singleton
const migrationHelper = new MigrationHelper();

// Inicializa automaticamente
try {
  migrationHelper.initialize();
} catch (error) {
  logger.error('❌ Falha na inicialização do MigrationHelper:', error);
}

module.exports = {
  migrationHelper,
  requireAuth: () => migrationHelper.requireAuth(),
  requireAdmin: () => migrationHelper.requireAdmin(),
  getStats: () => migrationHelper.getStats(),
  resetStats: () => migrationHelper.resetStats(),
  updateConfig: (config) => migrationHelper.updateConfig(config)
};
