const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const { withTimeout } = require('../utils/supabaseTimeout');
const { getCacheStats, clearCache } = require('../utils/supabaseOptimized');

// Cache dos últimos status de health check
let lastHealthCheck = {
  timestamp: new Date(),
  status: 'unknown',
  details: null
};

/**
 * Verifica saúde do Supabase com timeout
 */
async function checkSupabaseHealth() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || config.supabase.url,
      process.env.SUPABASE_SERVICE_KEY || config.supabase.serviceKey
    );
    
    const startTime = Date.now();
    
    // Usar withTimeout para garantir que a operação não fique pendente indefinidamente
    const result = await withTimeout(
      supabase
        .from('user_profiles')
        .select('count')
        .limit(1),
      10000, // 10 segundos timeout para health check
      'Health check Supabase'
    );
    
    const responseTime = Date.now() - startTime;
    
    if (result.error) {
      return {
        status: 'unhealthy',
        responseTime,
        error: result.error.message
      };
    }
    
    return {
      status: 'healthy',
      responseTime,
      connection: 'active'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

/**
 * Verifica serviços externos
 */
async function checkExternalServices() {
  const services = {};
  
  // Verificar Evolution API (se configurado)
  if (process.env.EVOLUTION_API_URL) {
    try {
      // Criar AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${process.env.EVOLUTION_API_URL}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      services.evolutionApi = {
        status: response.ok ? 'healthy' : 'unhealthy',
        url: process.env.EVOLUTION_API_URL
      };
    } catch (error) {
      services.evolutionApi = {
        status: 'unhealthy',
        error: error.name === 'AbortError' ? 'Timeout' : error.message
      };
    }
  }
  
  // Verificar N8N (se configurado)
  if (process.env.N8N_API_URL) {
    try {
      // Criar AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${process.env.N8N_API_URL}/healthz`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      services.n8n = {
        status: response.ok ? 'healthy' : 'unhealthy',
        url: process.env.N8N_API_URL
      };
    } catch (error) {
      services.n8n = {
        status: 'unhealthy',
        error: error.name === 'AbortError' ? 'Timeout' : error.message
      };
    }
  }
  
  return services;
}

/**
 * Verifica métricas do sistema
 */
function getSystemMetrics() {
  const used = process.memoryUsage();
  const uptime = process.uptime();
  
  return {
    memory: {
      used: Math.round(used.heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(used.heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(used.external / 1024 / 1024) + ' MB',
      rss: Math.round(used.rss / 1024 / 1024) + ' MB'
    },
    uptime: {
      seconds: Math.floor(uptime),
      formatted: formatUptime(uptime)
    },
    cpu: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    },
    environment: process.env.NODE_ENV || 'development'
  };
}

/**
 * Formata tempo de uptime
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

/**
 * Health check básico (rápido)
 */
router.get('/health', (req, res) => {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'FgtsAgent API',
    version: process.env.npm_package_version || '1.0.0'
  };
  
  res.status(200).json(status);
});

/**
 * Health check simples com informações básicas
 */
router.get('/health/basic', (req, res) => {
  const metrics = getSystemMetrics();
  
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'FgtsAgent API',
    version: process.env.npm_package_version || '1.0.0',
    uptime: metrics.uptime.formatted,
    memory: `${metrics.memory.used} / ${metrics.memory.total}`,
    environment: metrics.environment
  };
  
  res.status(200).json(status);
});

/**
 * Health check completo (pode ser lento)
 */
router.get('/health/detailed', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Executar verificações em paralelo
    const [supabaseHealth, externalServices] = await Promise.all([
      checkSupabaseHealth(),
      checkExternalServices()
    ]);
    
    const systemMetrics = getSystemMetrics();
    const totalTime = Date.now() - startTime;
    
    // Determinar status geral
    const overallStatus = supabaseHealth.status === 'healthy' ? 'healthy' : 'degraded';
    
    const healthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${totalTime}ms`,
      service: 'FgtsAgent API',
      version: process.env.npm_package_version || '1.0.0',
      system: systemMetrics,
      database: {
        supabase: supabaseHealth
      },
      externalServices,
      configuration: {
        nodeEnv: process.env.NODE_ENV || 'development',
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKeys: !!(process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_KEY),
        hasJwtSecret: !!process.env.SUPABASE_JWT_SECRET,
        hasSessionSecret: !!process.env.SESSION_SECRET,
        evolutionApiConfigured: !!process.env.EVOLUTION_API_URL,
        n8nConfigured: !!process.env.N8N_API_URL
      }
    };
    
    // Cache do último health check
    lastHealthCheck = {
      timestamp: new Date(),
      status: overallStatus,
      details: healthStatus
    };
    
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
    
    // Log se houver problemas
    if (overallStatus !== 'healthy') {
      logger.warn('Health check detectou problemas', {
        status: overallStatus,
        supabase: supabaseHealth.status,
        externalServices: Object.keys(externalServices).length
      });
    }
    
  } catch (error) {
    // Bug 47: Não expor stack traces em produção
    const isProduction = process.env.NODE_ENV === 'production';
    
    logger.error('Erro no health check detalhado', {
      error: error.message,
      // Só incluir stack trace em desenvolvimento
      ...(isProduction ? {} : { stack: error.stack })
    });
    
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      // Só incluir detalhes do erro em desenvolvimento
      ...(isProduction ? {} : { message: error.message })
    });
  }
});

/**
 * Readiness probe - verificar se a aplicação está pronta para receber tráfego
 */
router.get('/health/ready', async (req, res) => {
  try {
    // Verificações essenciais para readiness
    const supabaseHealth = await checkSupabaseHealth();
    
    const isReady = supabaseHealth.status === 'healthy';
    
    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'healthy'
        }
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: supabaseHealth.status
        }
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Liveness probe - verificar se a aplicação está viva
 */
router.get('/health/live', (req, res) => {
  // Verificação simples se o processo está rodando
  const isAlive = process.uptime() > 0;
  
  if (isAlive) {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } else {
    res.status(503).json({
      status: 'dead',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Metrics endpoint para Prometheus ou similar
 */
router.get('/health/metrics', (req, res) => {
  const metrics = getSystemMetrics();
  
  // Formato simples de métricas (pode ser expandido para Prometheus format)
  const prometheusMetrics = `
# HELP nodejs_memory_heap_used_bytes Process heap memory used
# TYPE nodejs_memory_heap_used_bytes gauge
nodejs_memory_heap_used_bytes ${process.memoryUsage().heapUsed}

# HELP nodejs_memory_heap_total_bytes Process heap memory total
# TYPE nodejs_memory_heap_total_bytes gauge
nodejs_memory_heap_total_bytes ${process.memoryUsage().heapTotal}

# HELP nodejs_process_uptime_seconds Process uptime in seconds
# TYPE nodejs_process_uptime_seconds counter
nodejs_process_uptime_seconds ${process.uptime()}

# HELP fgtsagent_health_status Application health status (1=healthy, 0=unhealthy)
# TYPE fgtsagent_health_status gauge
fgtsagent_health_status ${lastHealthCheck.status === 'healthy' ? 1 : 0}
  `.trim();
  
  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics);
});

/**
 * @route GET /api/health/cache
 * @desc Obter estatísticas do cache (PÚBLICO para testes)
 * @access Public
 */
router.get('/cache', async (req, res) => {
  try {
    const stats = getCacheStats();
    return res.json({
      success: true,
      cache: {
        size: stats.size,
        keys: stats.keys.slice(0, 10), // Mostrar apenas 10 primeiras chaves
        totalKeys: stats.keys.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erro ao obter estatísticas do cache:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas do cache'
    });
  }
});

/**
 * @route POST /api/health/cache/clear
 * @desc Limpar cache (PÚBLICO para testes)
 * @access Public
 */
router.post('/cache/clear', async (req, res) => {
  try {
    const { pattern } = req.body;
    clearCache(pattern);
    return res.json({
      success: true,
      message: pattern ? `Cache limpo para padrão: ${pattern}` : 'Cache limpo completamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erro ao limpar cache:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao limpar cache'
    });
  }
});

module.exports = router; 