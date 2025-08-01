const securityMonitoringService = require('../services/securityMonitoringService');
const logger = require('../utils/logger');

/**
 * Middleware para monitorar tentativas de login
 */
const monitorLoginAttempts = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const success = res.statusCode === 200;

    // Monitorar tentativa de login apenas se o serviço estiver disponível
    if (req.path.includes('/auth') && (req.method === 'POST' || req.method === 'GET')) {
      try {
        await securityMonitoringService.monitorLoginAttempts(
          userId,
          ipAddress,
          userAgent,
          success,
          {
            path: req.path,
            method: req.method,
            statusCode: res.statusCode
          }
        );
      } catch (monitoringError) {
        // Log do erro mas não quebrar a aplicação
        logger.warn('Erro no monitoramento de login (não crítico):', monitoringError.message);
      }
    }

    next();
  } catch (error) {
    logger.error('Erro no middleware de monitoramento de login:', error);
    next();
  }
};

/**
 * Middleware para monitorar acesso a dados sensíveis
 */
const monitorDataAccess = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return next();
    }

    // Identificar tipos de dados acessados
    const dataTypes = {
      '/api/leads': 'leads_data',
      '/api/proposals': 'proposals_data',
      '/api/auth/profile': 'user_profile',
      '/api/consent': 'consent_data',
      '/api/chat': 'chat_data'
    };

    const dataType = dataTypes[req.path];
    
    if (dataType) {
      try {
        await securityMonitoringService.monitorDataAccess(
          userId,
          dataType,
          req.method.toLowerCase(),
          {
            path: req.path,
            method: req.method,
            statusCode: res.statusCode,
            timestamp: new Date().toISOString()
          }
        );
      } catch (monitoringError) {
        // Log do erro mas não quebrar a aplicação
        logger.warn('Erro no monitoramento de dados (não crítico):', monitoringError.message);
      }
    }

    next();
  } catch (error) {
    logger.error('Erro no middleware de monitoramento de dados:', error);
    next();
  }
};

/**
 * Middleware para monitorar transações financeiras
 */
const monitorFinancialTransactions = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return next();
    }

    // Identificar transações financeiras
    const isFinancialTransaction = req.path.includes('/stripe') || 
                                  req.path.includes('/proposals') ||
                                  req.body?.amount ||
                                  req.body?.transaction_type;

    if (isFinancialTransaction) {
      const amount = req.body?.amount || 0;
      const transactionType = req.body?.transaction_type || 'unknown';

      try {
        await securityMonitoringService.monitorFinancialTransactions(
          userId,
          transactionType,
          amount,
          {
            path: req.path,
            method: req.method,
            statusCode: res.statusCode,
            timestamp: new Date().toISOString()
          }
        );
      } catch (monitoringError) {
        // Log do erro mas não quebrar a aplicação
        logger.warn('Erro no monitoramento de transações (não crítico):', monitoringError.message);
      }
    }

    next();
  } catch (error) {
    logger.error('Erro no middleware de monitoramento de transações:', error);
    next();
  }
};

/**
 * Middleware para detectar atividades suspeitas
 */
const detectSuspiciousActivity = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // Verificar padrões suspeitos
    const suspiciousPatterns = {
      rapidRequests: await checkRapidRequests(userId, ipAddress),
      unusualUserAgent: checkUnusualUserAgent(req.get('User-Agent')),
      suspiciousPath: checkSuspiciousPath(req.path),
      largePayload: checkLargePayload(req.body)
    };

    const hasSuspiciousActivity = Object.values(suspiciousPatterns).some(pattern => pattern);

    if (hasSuspiciousActivity) {
      logger.warn('Atividade suspeita detectada:', {
        userId,
        ipAddress,
        path: req.path,
        patterns: suspiciousPatterns
      });

      // Criar alerta de segurança
      await securityMonitoringService.createSecurityAlert('suspicious_activity', {
        userId,
        ipAddress,
        path: req.path,
        method: req.method,
        patterns: suspiciousPatterns,
        userAgent: req.get('User-Agent')
      });
    }

    next();
  } catch (error) {
    logger.error('Erro no middleware de detecção de atividades suspeitas:', error);
    next();
  }
};

/**
 * Middleware para rate limiting
 */
const rateLimiter = (maxRequests = 1000, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Limpar requisições antigas
    if (requests.has(key)) {
      requests.set(key, requests.get(key).filter(timestamp => timestamp > windowStart));
    } else {
      requests.set(key, []);
    }

    const userRequests = requests.get(key);

    if (userRequests.length >= maxRequests) {
      logger.warn(`Rate limit excedido para ${key}`);
      return res.status(429).json({
        success: false,
        message: 'Muitas requisições. Tente novamente em alguns minutos.'
      });
    }

    userRequests.push(now);
    next();
  };
};

/**
 * Middleware para headers de segurança
 */
const securityHeaders = (req, res, next) => {
  // Headers de segurança
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

/**
 * Middleware para sanitização de entrada
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitizar body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitizar query params
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitizar params
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error('Erro na sanitização de entrada:', error);
    next();
  }
};

/**
 * Funções auxiliares
 */

// Verificar requisições rápidas
async function checkRapidRequests(userId, ipAddress) {
  // Implementar verificação de requisições rápidas
  // Por enquanto, retorna false
  return false;
}

// Verificar User-Agent suspeito
function checkUnusualUserAgent(userAgent) {
  if (!userAgent) return true;
  
  const suspiciousPatterns = [
    'bot', 'crawler', 'spider', 'scraper',
    'curl', 'wget', 'python', 'java'
  ];
  
  return suspiciousPatterns.some(pattern => 
    userAgent.toLowerCase().includes(pattern)
  );
}

// Verificar path suspeito
function checkSuspiciousPath(path) {
  const suspiciousPatterns = [
    'admin', 'config', 'system', 'backup',
    'php', 'asp', 'jsp', '.env', 'wp-'
  ];
  
  return suspiciousPatterns.some(pattern => 
    path.toLowerCase().includes(pattern)
  );
}

// Verificar payload grande
function checkLargePayload(body) {
  if (!body) return false;
  
  const payloadSize = JSON.stringify(body).length;
  return payloadSize > 1000000; // 1MB
}

// Sanitizar objeto
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Remover caracteres perigosos
      sanitized[key] = value
        .replace(/[<>]/g, '') // Remover < e >
        .replace(/javascript:/gi, '') // Remover javascript:
        .replace(/on\w+=/gi, '') // Remover event handlers
        .trim();
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

module.exports = {
  monitorLoginAttempts,
  monitorDataAccess,
  monitorFinancialTransactions,
  detectSuspiciousActivity,
  rateLimiter,
  securityHeaders,
  sanitizeInput
}; 