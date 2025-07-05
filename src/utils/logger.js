/**
 * Utilitário de logger seguro para a aplicação
 * Previne vazamento de informações sensíveis em logs
 */
const { sanitizeData } = require('./logSanitizer');

// Lista de campos sensíveis que devem ser mascarados
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /auth/i,
  /credential/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /bearer/i,
  /cookie/i,
  /session/i
];

/**
 * Sanitiza mensagens de log para prevenir vazamento de dados sensíveis
 * @param {string} message - Mensagem a ser sanitizada
 * @returns {string} - Mensagem sanitizada
 */
function sanitizeMessage(message) {
  if (typeof message !== 'string') return message;
  
  // Mascarar possíveis tokens JWT
  message = message.replace(/eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, '[JWT_TOKEN_MASKED]');
  
  // Mascarar possíveis chaves de API
  message = message.replace(/[a-f0-9]{32,}/gi, '[API_KEY_MASKED]');
  
  // Mascarar números que podem ser cartões ou documentos
  message = message.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD_NUMBER_MASKED]');
  message = message.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF_MASKED]');
  
  return message;
}

/**
 * Verifica se os metadados contêm informações sensíveis
 * @param {any} meta - Metadados a serem verificados
 * @returns {any} - Metadados sanitizados
 */
function sanitizeMetadata(meta) {
  if (!meta || typeof meta !== 'object') return meta;
  
  // Usar o sanitizer existente
  return sanitizeData(meta, 2);
}

/**
 * Logger seguro que previne vazamento de dados sensíveis
 */
const logger = {
  info: (message, meta = {}) => {
    const safeMessage = sanitizeMessage(String(message));
    const safeMeta = sanitizeMetadata(meta);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[INFO] ${new Date().toISOString()} - ${safeMessage}`, safeMeta);
    }
  },
  
  error: (message, error = {}) => {
    const safeMessage = sanitizeMessage(String(message));
    const safeError = sanitizeMetadata(error);
    
    // Logs de erro são sempre importantes, mesmo em produção
    console.error(`[ERROR] ${new Date().toISOString()} - ${safeMessage}`, safeError);
  },
  
  warn: (message, meta = {}) => {
    const safeMessage = sanitizeMessage(String(message));
    const safeMeta = sanitizeMetadata(meta);
    
    console.warn(`[WARN] ${new Date().toISOString()} - ${safeMessage}`, safeMeta);
  },
  
  debug: (message, meta = {}) => {
    // Debug logs apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      const safeMessage = sanitizeMessage(String(message));
      const safeMeta = sanitizeMetadata(meta);
      
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${safeMessage}`, safeMeta);
    }
  },
  
  /**
   * Log seguro para desenvolvimento apenas
   * Usado para substituir console.log diretos
   */
  devLog: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const safeMessage = sanitizeMessage(String(message));
      const safeMeta = sanitizeMetadata(meta);
      
      console.log(`[DEV] ${new Date().toISOString()} - ${safeMessage}`, safeMeta);
    }
  },
  
  /**
   * Log específico para scripts/migrações
   * Permite mais verbosidade mas ainda sanitiza
   */
  scriptLog: (message, meta = {}) => {
    const safeMessage = sanitizeMessage(String(message));
    const safeMeta = sanitizeMetadata(meta);
    
    console.log(`[SCRIPT] ${new Date().toISOString()} - ${safeMessage}`, safeMeta);
  }
};

module.exports = logger; 