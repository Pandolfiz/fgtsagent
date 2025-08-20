const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Middleware de logging otimizado para requisições HTTP
 * Registra apenas informações essenciais de forma eficiente
 */

// Cache para detectar ataques de força bruta com controle de memória
const requestCache = new Map();
const SUSPICIOUS_THRESHOLD = 10000; // requisições por minuto
const CACHE_CLEANUP_INTERVAL = 60000; // 1 minuto (reduzido de 30s)
const MAX_CACHE_SIZE = 5000; // Reduzido de 10k para 5k
const CACHE_ENTRY_TTL = 300000; // 5 minutos TTL por entrada

// Limpeza automática do cache com controle de memória
let cleanupInterval;
const startCacheCleanup = () => {
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const entriesToDelete = [];
    
    // Identificar entradas para remoção
    for (const [key, data] of requestCache.entries()) {
      if (now - data.lastSeen > CACHE_ENTRY_TTL) {
        entriesToDelete.push(key);
      }
    }
    
    // Remover entradas expiradas
    for (const key of entriesToDelete) {
      requestCache.delete(key);
    }
    
    // Se ainda há muitas entradas, remover as mais antigas
    if (requestCache.size > MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(requestCache.entries())
        .sort((a, b) => a[1].lastSeen - b[1].lastSeen);
      
      const toRemove = sortedEntries.slice(0, requestCache.size - MAX_CACHE_SIZE);
      for (const [key] of toRemove) {
        requestCache.delete(key);
      }
      
      // Log apenas quando necessário
      if (process.env.LOG_LEVEL === 'debug') {
        logger.debug('Cache de requisições limpo', {
          maxSize: MAX_CACHE_SIZE,
          currentSize: requestCache.size,
          removedEntries: toRemove.length
        });
      }
    }
  }, CACHE_CLEANUP_INTERVAL);
};

const stopCacheCleanup = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
};

// Limpeza completa do cache
const clearCache = () => {
  requestCache.clear();
  logger.info('Cache de requisições limpo completamente');
};

// Iniciar limpeza automática
startCacheCleanup();

// Limpeza no shutdown da aplicação
process.on('SIGINT', () => {
  stopCacheCleanup();
  clearCache();
});

process.on('SIGTERM', () => {
  stopCacheCleanup();
  clearCache();
});

/**
 * Detecta padrões suspeitos de requisições com controle de memória
 */
function detectSuspiciousActivity(ip, userAgent, url) {
  // Prevenir crescimento descontrolado do cache
  if (requestCache.size >= MAX_CACHE_SIZE) {
    return false;
  }

  const key = `${ip}:${userAgent}`;
  const now = Date.now();
  const data = requestCache.get(key) || { count: 0, firstSeen: now, lastSeen: now };
  
  data.count++;
  data.lastSeen = now;
  requestCache.set(key, data);
  
  // Log apenas se for realmente suspeito
  if (data.count > SUSPICIOUS_THRESHOLD) {
    logger.warn('Atividade suspeita detectada', {
      ip,
      userAgent: userAgent?.substring(0, 100),
      requestCount: data.count,
      timeWindow: `${Math.round((now - data.firstSeen) / 1000)}s`
    });
    return true;
  }
  
  return false;
}

/**
 * Sanitiza dados sensíveis para logging (versão otimizada)
 */
function sanitizeForLogging(obj, maxDepth = 2, currentDepth = 0) {
  if (currentDepth >= maxDepth || obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  const sensitiveKeys = [
    'password', 'senha', 'token', 'secret', 'key', 'auth', 'authorization',
    'cookie', 'session', 'csrf', 'api_key', 'access_token', 'refresh_token',
    'private_key', 'client_secret', 'jwt'
  ];
  
  const result = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
    
    if (isSensitive) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeForLogging(value, maxDepth, currentDepth + 1);
    } else if (typeof value === 'string' && value.length > 500) { // Reduzido de 1000 para 500
      result[key] = value.substring(0, 500) + '... [TRUNCATED]';
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Middleware principal de logging (otimizado)
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();
  const requestId = crypto.randomBytes(8).toString('hex');
  
  // Anexar ID da requisição ao request
  req.requestId = requestId;
  
  // Dados básicos da requisição (reduzidos)
  const requestData = {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')?.substring(0, 100), // Limitar tamanho
    timestamp: new Date().toISOString()
  };
  
  // Log da requisição de entrada (apenas para rotas importantes e com menos detalhes)
  if (shouldLogRequest(req)) {
    logger.info('Requisição recebida', {
      ...requestData,
      // Reduzir profundidade de sanitização
      query: Object.keys(req.query).length > 0 ? sanitizeForLogging(req.query, 1) : undefined,
      // Log do body apenas para rotas específicas e com menos detalhes
      ...(shouldLogBody(req) && { body: sanitizeForLogging(req.body, 1) })
    });
  }
  
  // Detectar atividade suspeita (silenciosamente)
  detectSuspiciousActivity(requestData.ip, requestData.userAgent, requestData.url);
  
  // Interceptar resposta (apenas uma vez)
  const originalSend = res.send;
  let responseLogged = false;
  
  res.send = function(data) {
    if (!responseLogged) {
      logResponse(requestData, res, startTime, data);
      responseLogged = true;
    }
    originalSend.call(this, data);
  };
  
  // Interceptar JSON (mas não logar se já foi logado via send)
  const originalJson = res.json;
  res.json = function(data) {
    if (!responseLogged) {
      logResponse(requestData, res, startTime, data);
      responseLogged = true;
    }
    originalJson.call(this, data);
  };
  
  next();
}

/**
 * Determina se a requisição deve ser logada (mais restritivo)
 */
function shouldLogRequest(req) {
  const loggedPaths = [
    '/api/auth/', '/api/admin/', '/api/webhooks/',
    '/login', '/register', '/signup'
  ];
  
  const ignoredPaths = [
    '/health', '/favicon.ico', '/robots.txt',
    '/assets/', '/img/', '/css/', '/js/',
    '/api/health', '/api/metrics' // Não logar health checks
  ];
  
  // Não logar recursos estáticos
  for (const path of ignoredPaths) {
    if (req.url.startsWith(path)) {
      return false;
    }
  }
  
  // Logar apenas rotas realmente importantes
  for (const path of loggedPaths) {
    if (req.url.startsWith(path)) {
      return true;
    }
  }
  
  // Logar apenas erros e requisições não autorizadas (não GETs simples)
  return req.method !== 'GET' || req.url.includes('error');
}

/**
 * Determina se o body da requisição deve ser logado (mais restritivo)
 */
function shouldLogBody(req) {
  const bodyLoggedPaths = ['/api/webhooks/', '/api/chat/'];
  const sensitiveOperations = ['login', 'register', 'reset', 'password'];
  
  // Não logar operações sensíveis
  for (const op of sensitiveOperations) {
    if (req.url.toLowerCase().includes(op)) {
      return false;
    }
  }
  
  // Logar body apenas para rotas específicas
  return bodyLoggedPaths.some(path => req.url.startsWith(path));
}

/**
 * Log da resposta (otimizado)
 */
function logResponse(requestData, res, startTime, responseData) {
  const duration = Date.now() - startTime;
  const status = res.statusCode;
  
  const logData = {
    ...requestData,
    status,
    duration: `${duration}ms`,
    responseSize: responseData ? Buffer.byteLength(JSON.stringify(responseData)) : 0
  };
  
  // Determinar nível de log baseado no status (mais seletivo)
  if (status >= 500) {
    logger.error('Erro interno do servidor', {
      ...logData,
      response: sanitizeForLogging(responseData, 1)
    });
  } else if (status >= 400 && status !== 404) { // Não logar 404s
    logger.warn('Erro do cliente', logData);
  } else if (duration > 10000) { // Aumentado de 5000 para 10000ms
    logger.warn('Requisição lenta', logData);
  } else if (shouldLogRequest({ url: requestData.url, method: requestData.method })) {
    // Log mais limpo para requisições bem-sucedidas
    logger.info('Requisição concluída', {
      method: logData.method,
      url: logData.url,
      status: logData.status,
      duration: logData.duration
    });
  }
}

/**
 * Middleware para log de erros não capturados (otimizado)
 */
function errorLogger(err, req, res, next) {
  const requestData = {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    timestamp: new Date().toISOString()
  };
  
  logger.error('Erro não tratado na requisição', {
    ...requestData,
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      code: err.code,
      status: err.status || err.statusCode
    },
    // Reduzir detalhes de query/params
    query: Object.keys(req.query).length > 0 ? Object.keys(req.query) : undefined,
    params: Object.keys(req.params).length > 0 ? Object.keys(req.params) : undefined
  });
  
  next(err);
}

module.exports = {
  requestLogger,
  errorLogger,
  detectSuspiciousActivity,
  sanitizeForLogging,
  stopCacheCleanup
}; 