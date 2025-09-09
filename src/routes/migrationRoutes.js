/**
 * 🚀 Rotas de Monitoramento de Migração
 * 
 * Endpoints para monitorar o status da migração de autenticação
 * e obter estatísticas do sistema híbrido.
 * 
 * @author Equipe de Desenvolvimento
 * @version 1.0.0
 * @since 2024-01-XX
 */

const express = require('express');
const router = express.Router();
const { migrationHelper } = require('../middleware/migrationHelper');
const logger = require('../config/logger');

/**
 * @route GET /api/migration/status
 * @desc Obter status atual da migração
 * @access Public (para monitoramento)
 */
router.get('/status', (req, res) => {
  try {
    const stats = migrationHelper.getStats();
    const config = {
      USE_UNIFIED_AUTH: process.env.USE_UNIFIED_AUTH === 'true',
      USE_LEGACY_AUTH: process.env.USE_LEGACY_AUTH !== 'false',
      NODE_ENV: process.env.NODE_ENV
    };

    const status = {
      migration: {
        phase: determineMigrationPhase(config),
        config,
        stats
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Erro ao obter status da migração:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao obter status da migração',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/migration/routes
 * @desc Listar rotas e seus middlewares
 * @access Public (para monitoramento)
 */
router.get('/routes', (req, res) => {
  try {
    const unifiedRoutes = [
      '/api/auth',
      '/api/dashboard', 
      '/api/proposals',
      '/api/leads',
      '/api/contacts',
      '/api/messages',
      '/api/settings',
      '/api/credentials',
      '/api/chat',
      '/api/consent',
      '/api/whatsapp-templates',
      '/api/ads',
      '/api/organization'
    ];

    const legacyRoutes = [
      '/admin',
      '/webhook',
      '/health'
    ];

    res.json({
      success: true,
      data: {
        unified: unifiedRoutes.map(route => ({
          route,
          middleware: 'unified',
          description: 'Usa middleware unificado de autenticação'
        })),
        legacy: legacyRoutes.map(route => ({
          route,
          middleware: 'legacy',
          description: 'Usa middleware legado de autenticação'
        }))
      }
    });

  } catch (error) {
    logger.error('Erro ao listar rotas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao listar rotas'
    });
  }
});

/**
 * @route POST /api/migration/reset-stats
 * @desc Resetar estatísticas de migração
 * @access Public (para monitoramento)
 */
router.post('/reset-stats', (req, res) => {
  try {
    migrationHelper.resetStats();
    
    logger.info('Estatísticas de migração resetadas');
    
    res.json({
      success: true,
      message: 'Estatísticas resetadas com sucesso',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erro ao resetar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao resetar estatísticas'
    });
  }
});

/**
 * @route GET /api/migration/health
 * @desc Health check específico da migração
 * @access Public
 */
router.get('/health', (req, res) => {
  try {
    const stats = migrationHelper.getStats();
    const isHealthy = stats.errors === 0;
    
    const health = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      migration: {
        unifiedRequests: stats.unifiedRequests,
        legacyRequests: stats.legacyRequests,
        fallbackRequests: stats.fallbackRequests,
        errors: stats.errors,
        unifiedPercentage: stats.unifiedPercentage
      }
    };

    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Erro no health check da migração:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Migration health check failed'
    });
  }
});

/**
 * Determina a fase atual da migração
 */
function determineMigrationPhase(config) {
  if (config.USE_UNIFIED_AUTH && !config.USE_LEGACY_AUTH) {
    return 'unified-only';
  } else if (config.USE_UNIFIED_AUTH && config.USE_LEGACY_AUTH) {
    return 'hybrid';
  } else if (!config.USE_UNIFIED_AUTH && config.USE_LEGACY_AUTH) {
    return 'legacy-only';
  } else {
    return 'undefined';
  }
}

module.exports = router;
