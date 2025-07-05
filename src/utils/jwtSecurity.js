/**
 * Utilitário para gerenciar JWT_SECRET de forma segura
 */
const crypto = require('crypto');
const logger = require('./logger');

/**
 * Gera uma chave JWT segura
 * @returns {string} Chave JWT gerada aleatoriamente
 */
function generateSecureJwtSecret() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Valida se a JWT_SECRET é segura
 * @param {string} secret - A chave a ser validada
 * @returns {boolean} True se a chave é segura
 */
function isSecureJwtSecret(secret) {
  // Verificar se existe
  if (!secret || typeof secret !== 'string') {
    return false;
  }
  
  // Verificar se não é um valor padrão/inseguro
  const insecureDefaults = [
    'your-secret-key',
    'secret',
    'jwt-secret',
    'default-secret',
    'test-secret',
    'changeme',
    'password',
    '123456'
  ];
  
  if (insecureDefaults.includes(secret.toLowerCase())) {
    return false;
  }
  
  // Verificar comprimento mínimo (pelo menos 32 caracteres)
  if (secret.length < 32) {
    return false;
  }
  
  return true;
}

/**
 * Obtém uma JWT_SECRET segura, gerando uma nova se necessário
 * @returns {string} JWT_SECRET segura
 */
function getSecureJwtSecret() {
  const envSecret = process.env.JWT_SECRET;
  
  // Se existe uma chave no ambiente e ela é segura, usar ela
  if (isSecureJwtSecret(envSecret)) {
    return envSecret;
  }
  
  // Se a chave do ambiente não é segura, logar aviso
  if (envSecret) {
    logger.warn('JWT_SECRET definida mas é insegura. Usando chave gerada temporariamente.');
    logger.warn('IMPORTANTE: Defina uma JWT_SECRET segura com pelo menos 32 caracteres na variável de ambiente.');
  } else {
    logger.warn('JWT_SECRET não definida. Usando chave gerada temporariamente.');
    logger.warn('IMPORTANTE: Defina JWT_SECRET na variável de ambiente para produção.');
  }
  
  // Gerar uma chave temporária para desenvolvimento
  const tempSecret = generateSecureJwtSecret();
  logger.info('Chave JWT temporária gerada para esta sessão.');
  
  return tempSecret;
}

/**
 * Valida o ambiente JWT na inicialização da aplicação
 */
function validateJwtEnvironment() {
  const envSecret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && !isSecureJwtSecret(envSecret)) {
    const error = new Error(
      'JWT_SECRET insegura ou ausente em ambiente de produção. ' +
      'Configure uma chave segura com pelo menos 32 caracteres.'
    );
    logger.error('ERRO CRÍTICO DE SEGURANÇA: ' + error.message);
    throw error;
  }
  
  if (!isProduction && !isSecureJwtSecret(envSecret)) {
    logger.warn('AVISO DE SEGURANÇA: JWT_SECRET não é segura. Isso é aceitável apenas em desenvolvimento.');
  }
  
  return true;
}

module.exports = {
  generateSecureJwtSecret,
  isSecureJwtSecret,
  getSecureJwtSecret,
  validateJwtEnvironment
}; 