const winston = require('winston');
const path = require('path');

// Definir níveis de log customizados
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Definir cores para os níveis de log
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Adicionar cores ao winston
winston.addColors(colors);

// Definir formato para logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Definir formato para console (mais limpo)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(
    (info) => {
      // Simplificar logs de requisição para console
      if (info.message === 'Requisição recebida' || info.message === 'Requisição concluída') {
        return `[${info.timestamp}] ${info.level}: ${info.method} ${info.url} - ${info.status || ''}`;
      }
      return `[${info.timestamp}] ${info.level}: ${info.message}`;
    }
  )
);

// Definir transportes (onde os logs serão salvos/exibidos)
const transports = [
  // Arquivo de logs para erros
  new winston.transports.File({
    filename: path.join('logs', 'error.log'),
    level: 'error',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
  }),
  
  // Arquivo para todos os logs (apenas em produção)
  ...(process.env.NODE_ENV === 'production' ? [
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  ] : []),
  
  // Console para desenvolvimento (mais limpo)
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || 'info',
  }),
];

// Criar instância do logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : (process.env.LOG_LEVEL || 'info'),
  levels,
  format,
  transports,
  // Silenciar logs de dependências em desenvolvimento
  silent: process.env.NODE_ENV === 'test',
});

// Criar pasta de logs se não existir
const fs = require('fs');
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Exportar logger
module.exports = logger; 