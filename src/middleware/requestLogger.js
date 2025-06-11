const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Middleware de logging avançado para requisições HTTP
 * Registra informações detalhadas sobre cada requisição de forma segura
 */

// Cache para detectar ataques de força bruta
const requestCache = new Map();
const SUSPICIOUS_THRESHOLD = 50; // requisições por minuto
const CACHE_CLEANUP_INTERVAL = 60000; // 1 minuto

// Limpeza automática do cache
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestCache.entries()) {
    if (now - data.lastSeen > CACHE_CLEANUP_INTERVAL) {
      requestCache.delete(key);
    }
  }
}, CACHE_CLEANUP_INTERVAL);

/**
 * Detecta padrões suspeitos de requisições
 */
function detectSuspiciousActivity(ip, userAgent, url) {
  const key = `${ip}:${crypto.createHash('md5').update(userAgent || '').digest('hex')}`;
  const now = Date.now();
  
  if (!requestCache.has(key)) {
    requestCache.set(key, { count: 1, firstSeen: now, lastSeen: now, urls: new Set([url]) });
    return false;
  }
  
  const data = requestCache.get(key);
  data.count++;
  data.lastSeen = now;
  data.urls.add(url);
  
  // Se muitas requisições em pouco tempo
  const timeWindow = now - data.firstSeen;
  const requestsPerMinute = (data.count / timeWindow) * 60000;
  
  if (requestsPerMinute > SUSPICIOUS_THRESHOLD) {
    logger.warn('Atividade suspeita detectada', {
      ip,
      userAgent: userAgent ? userAgent.substring(0, 100) + '...' : 'undefined',
      requestsPerMinute: Math.round(requestsPerMinute),
      urlsAccessed: data.urls.size,
      timeWindow: Math.round(timeWindow / 1000) + 's'
    });
    return true;
  }
  
  return false;
}

/**
 * Sanitiza dados sensíveis para logging
 */
function sanitizeForLogging(obj, maxDepth = 3, currentDepth = 0) {
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
    } else if (typeof value === 'string' && value.length > 1000) {
      result[key] = value.substring(0, 1000) + '... [TRUNCATED]';
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Middleware principal de logging
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();
  const requestId = crypto.randomBytes(8).toString('hex');
  
  // Anexar ID da requisição ao request
  req.requestId = requestId;
  
  // Dados básicos da requisição
  const requestData = {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    timestamp: new Date().toISOString()
  };
  
  // Log da requisição de entrada (apenas para rotas importantes)
  if (shouldLogRequest(req)) {
    logger.info('Requisição recebida', {
      ...requestData,
      query: sanitizeForLogging(req.query, 2),
      // Log do body apenas para rotas específicas e sem dados sensíveis
      ...(shouldLogBody(req) && { body: sanitizeForLogging(req.body, 2) })
    });
  }
  
  // Detectar atividade suspeita
  const isSuspicious = detectSuspiciousActivity(requestData.ip, requestData.userAgent, requestData.url);
  if (isSuspicious) {
    req.suspiciousActivity = true;
  }
  
  // Interceptar resposta
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(data) {
    logResponse(requestData, res, startTime, data);
    originalSend.call(this, data);
  };
  
  res.json = function(data) {
    logResponse(requestData, res, startTime, data);
    originalJson.call(this, data);
  };
  
  next();
}

/**
 * Determina se a requisição deve ser logada
 */
function shouldLogRequest(req) {
  const loggedPaths = [
    '/api/', '/auth/', '/admin/',
    '/login', '/register', '/signup'
  ];
  
  const ignoredPaths = [
    '/health', '/favicon.ico', '/robots.txt',
    '/assets/', '/img/', '/css/', '/js/'
  ];
  
  // Não logar recursos estáticos
  for (const path of ignoredPaths) {
    if (req.url.startsWith(path)) {
      return false;
    }
  }
  
  // Logar rotas importantes
  for (const path of loggedPaths) {
    if (req.url.startsWith(path)) {
      return true;
    }
  }
  
  // Logar erros e requisições não autorizadas
  return req.method !== 'GET';
}

/**
 * Determina se o body da requisição deve ser logado
 */
function shouldLogBody(req) {
  const bodyLoggedPaths = ['/api/auth/', '/api/chat/', '/api/webhooks/'];
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
 * Log da resposta
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
  
  // Determinar nível de log baseado no status
  if (status >= 500) {
    logger.error('Erro interno do servidor', {
      ...logData,
      response: sanitizeForLogging(responseData, 1)
    });
  } else if (status >= 400) {
    logger.warn('Erro do cliente', logData);
  } else if (duration > 5000) {
    logger.warn('Requisição lenta', logData);
  } else if (shouldLogRequest({ url: requestData.url, method: requestData.method })) {
    logger.info('Requisição concluída', logData);
  }
}

/**
 * Middleware para log de erros não capturados
 */
function errorLogger(err, req, res, next) {
  const requestData = {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
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
    query: sanitizeForLogging(req.query, 1),
    params: sanitizeForLogging(req.params, 1)
  });
  
  next(err);
}

module.exports = {
  requestLogger,
  errorLogger,
  detectSuspiciousActivity,
  sanitizeForLogging
}; 