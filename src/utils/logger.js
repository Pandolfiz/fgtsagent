/**
 * Configuração do logger utilizando Winston
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Criar pasta de logs se não existir
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Formato personalizado para os logs
const logFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  let metaStr = '';
  if (Object.keys(meta).length > 0) {
    metaStr = JSON.stringify(meta);
  }
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

// Configuração do logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'info',
    })
  ]
});

// Adicionar console no ambiente de desenvolvimento
if (process.env.NODE_ENV !== 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    level: 'debug'
  }));
}

// Método especial para registrar logs de OAuth2
logger.oauth2 = function(message, meta = {}) {
  this.log({
    level: 'info',
    message: `[OAuth2] ${message}`,
    ...meta
  });
};

module.exports = logger;