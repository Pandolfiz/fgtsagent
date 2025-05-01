/**
 * Middleware para sanitização de dados de entrada
 */
const xss = require('xss');
const logger = require('../utils/logger');

/**
 * Sanitiza um único valor
 * @param {*} value - Valor a ser sanitizado
 * @returns {*} - Valor sanitizado
 */
function sanitizeValue(value) {
  // Se for string, aplicar XSS
  if (typeof value === 'string') {
    return xss(value);
  }
  // Se for objeto (não nulo e não array), sanitizar recursivamente
  else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return sanitizeObject(value);
  }
  // Se for array, sanitizar cada elemento
  else if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }
  // Outros tipos são retornados sem alteração
  return value;
}

/**
 * Sanitiza recursivamente um objeto
 * @param {Object} obj - Objeto a ser sanitizado
 * @returns {Object} - Objeto sanitizado
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      sanitized[key] = sanitizeValue(obj[key]);
    }
  }
  return sanitized;
}

/**
 * Middleware para sanitizar dados de requisição
 * @param {String[]} sources - Fontes de dados a sanitizar (body, query, params)
 * @returns {Function} - Middleware Express
 */
function sanitizeRequest(sources = ['body']) {
  return (req, res, next) => {
    try {
      // Sanitizar cada fonte de dados especificada
      sources.forEach(source => {
        if (req[source]) {
          req[source] = sanitizeObject(req[source]);
        }
      });
      
      next();
    } catch (error) {
      logger.error(`Erro ao sanitizar requisição: ${error.message}`);
      next(); // Continuar mesmo em caso de erro para não interromper o fluxo
    }
  };
}

module.exports = {
  sanitizeRequest,
  sanitizeValue,
  sanitizeObject
}; 