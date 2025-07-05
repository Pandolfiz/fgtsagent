/**
 * Utilitário para sanitizar logs de dados sensíveis
 * Evita vazamento de informações críticas em logs de produção
 */

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'secret',
  'key',
  'apikey',
  'api_key',
  'private_key',
  'client_secret',
  'webhook_secret',
  'bearer',
  'auth',
  'credential',
  'credentials'
];

/**
 * Sanitiza um objeto removendo campos sensíveis
 * @param {any} data - Dados a serem sanitizados
 * @param {number} maxDepth - Profundidade máxima para evitar loops infinitos
 * @returns {any} - Dados sanitizados
 */
function sanitizeData(data, maxDepth = 3) {
  if (maxDepth <= 0) return '[Max depth reached]';
  
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    // Se é um token JWT, apenas mostrar os primeiros caracteres
    if (data.length > 50 && (data.includes('.') || data.startsWith('eyJ'))) {
      return `${data.substring(0, 10)}...[TOKEN_HIDDEN]`;
    }
    return data;
  }
  
  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, maxDepth - 1));
  }
  
  if (typeof data === 'object') {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Verificar se é um campo sensível
      const isSensitive = SENSITIVE_FIELDS.some(field => 
        lowerKey.includes(field) || 
        lowerKey.endsWith('_' + field) ||
        lowerKey.startsWith(field + '_')
      );
      
      if (isSensitive) {
        sanitized[key] = '[SENSITIVE_DATA_HIDDEN]';
      } else {
        sanitized[key] = sanitizeData(value, maxDepth - 1);
      }
    }
    
    return sanitized;
  }
  
  return data;
}

/**
 * Sanitiza headers HTTP removendo dados sensíveis
 * @param {object} headers - Headers a serem sanitizados
 * @returns {object} - Headers sanitizados
 */
function sanitizeHeaders(headers) {
  if (!headers || typeof headers !== 'object') return headers;
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    
    if (lowerKey.includes('authorization') || 
        lowerKey.includes('token') || 
        lowerKey.includes('key') || 
        lowerKey.includes('secret') ||
        lowerKey.includes('bearer')) {
      sanitized[key] = '[SENSITIVE_HEADER_HIDDEN]';
    } else if (lowerKey === 'cookie') {
      sanitized[key] = '[COOKIE_HIDDEN]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Cria um logger sanitizado que remove dados sensíveis automaticamente
 * @param {object} logger - Logger original
 * @returns {object} - Logger sanitizado
 */
function createSanitizedLogger(logger) {
  return {
    info: (message, data) => {
      if (data) {
        logger.info(message, sanitizeData(data));
      } else {
        logger.info(message);
      }
    },
    warn: (message, data) => {
      if (data) {
        logger.warn(message, sanitizeData(data));
      } else {
        logger.warn(message);
      }
    },
    error: (message, data) => {
      if (data) {
        logger.error(message, sanitizeData(data));
      } else {
        logger.error(message);
      }
    },
    debug: (message, data) => {
      if (data) {
        logger.debug(message, sanitizeData(data));
      } else {
        logger.debug(message);
      }
    }
  };
}

module.exports = {
  sanitizeData,
  sanitizeHeaders,
  createSanitizedLogger,
  SENSITIVE_FIELDS
}; 