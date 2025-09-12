/**
 * ==============================================
 * UTILITÁRIO DE LOGGING PARA FRONTEND
 * ==============================================
 * 
 * Este utilitário fornece logging consistente
 * para o frontend, com diferentes níveis e
 * formatação adequada.
 * 
 * @author Equipe de Desenvolvimento
 * @version 1.0.0
 * @since 2024-01-XX
 */

// Configurações
const CONFIG = {
  LOG_LEVEL: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  ENABLE_CONSOLE: true,
  ENABLE_REMOTE: process.env.NODE_ENV === 'production',
  REMOTE_ENDPOINT: '/api/logs',
  MAX_MESSAGE_LENGTH: 1000
};

// Níveis de log
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Cores para console
const COLORS = {
  error: '\x1b[31m', // Vermelho
  warn: '\x1b[33m',  // Amarelo
  info: '\x1b[36m',  // Ciano
  debug: '\x1b[37m', // Branco
  reset: '\x1b[0m'
};

/**
 * Classe principal do logger
 */
class Logger {
  constructor() {
    this.logLevel = LOG_LEVELS[CONFIG.LOG_LEVEL] || LOG_LEVELS.debug;
    this.logQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Verificar se deve logar baseado no nível
   */
  shouldLog(level) {
    return LOG_LEVELS[level] <= this.logLevel;
  }

  /**
   * Formatar mensagem de log
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase();
    
    return {
      timestamp,
      level: levelUpper,
      message,
      meta: this.sanitizeMeta(meta),
      url: window.location?.href,
      userAgent: navigator.userAgent,
      userId: this.getCurrentUserId()
    };
  }

  /**
   * Sanitizar metadados para evitar vazamento de informações sensíveis
   */
  sanitizeMeta(meta) {
    if (!meta || typeof meta !== 'object') {
      return meta;
    }

    const sanitized = { ...meta };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];

    // Remover chaves sensíveis
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => 
        key.toLowerCase().includes(sensitive.toLowerCase())
      )) {
        sanitized[key] = '[REDACTED]';
      }
    });

    // Limitar tamanho
    const jsonString = JSON.stringify(sanitized);
    if (jsonString.length > CONFIG.MAX_MESSAGE_LENGTH) {
      return { 
        ...sanitized, 
        _truncated: true,
        _originalSize: jsonString.length
      };
    }

    return sanitized;
  }

  /**
   * Obter ID do usuário atual (se disponível)
   */
  getCurrentUserId() {
    try {
      // Tentar obter do localStorage ou sessionStorage
      const authData = localStorage.getItem('supabase.auth.token') || 
                      sessionStorage.getItem('supabase.auth.token');
      
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed?.currentUser?.id || null;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Log para console
   */
  logToConsole(level, message, meta) {
    if (!CONFIG.ENABLE_CONSOLE) return;

    const color = COLORS[level] || COLORS.debug;
    const reset = COLORS.reset;
    
    const formattedMessage = `${color}[${level.toUpperCase()}]${reset} ${message}`;
    
    if (meta && Object.keys(meta).length > 0) {
      console[level](formattedMessage, meta);
    } else {
      console[level](formattedMessage);
    }
  }

  /**
   * Enviar log para servidor remoto
   */
  async logToRemote(level, message, meta) {
    if (!CONFIG.ENABLE_REMOTE) return;

    try {
      const logData = this.formatMessage(level, message, meta);
      
      await fetch(CONFIG.REMOTE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logData)
      });
    } catch (error) {
      // Falha silenciosa para não quebrar a aplicação
      console.warn('Falha ao enviar log para servidor:', error);
    }
  }

  /**
   * Processar fila de logs
   */
  async processLogQueue() {
    if (this.isProcessingQueue || this.logQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.logQueue.length > 0) {
      const { level, message, meta } = this.logQueue.shift();
      
      try {
        await this.logToRemote(level, message, meta);
      } catch (error) {
        console.warn('Erro ao processar log da fila:', error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Adicionar log à fila
   */
  addToQueue(level, message, meta) {
    this.logQueue.push({ level, message, meta });
    
    // Processar fila de forma assíncrona
    setTimeout(() => this.processLogQueue(), 100);
  }

  /**
   * Método principal de log
   */
  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    // Log para console
    this.logToConsole(level, message, meta);

    // Adicionar à fila para envio remoto
    this.addToQueue(level, message, meta);
  }

  /**
   * Métodos específicos por nível
   */
  error(message, meta) {
    this.log('error', message, meta);
  }

  warn(message, meta) {
    this.log('warn', message, meta);
  }

  info(message, meta) {
    this.log('info', message, meta);
  }

  debug(message, meta) {
    this.log('debug', message, meta);
  }

  /**
   * Log de performance
   */
  performance(name, startTime, endTime, meta = {}) {
    const duration = endTime - startTime;
    this.info(`Performance: ${name}`, {
      ...meta,
      duration: `${duration}ms`,
      startTime,
      endTime
    });
  }

  /**
   * Log de erro com stack trace
   */
  errorWithStack(message, error, meta = {}) {
    this.error(message, {
      ...meta,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    });
  }

  /**
   * Log de requisição HTTP
   */
  httpRequest(method, url, status, duration, meta = {}) {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    
    this.log(level, `HTTP ${method} ${url}`, {
      ...meta,
      method,
      url,
      status,
      duration: `${duration}ms`
    });
  }

  /**
   * Log de autenticação
   */
  auth(action, success, meta = {}) {
    const level = success ? 'info' : 'warn';
    
    this.log(level, `Auth ${action}`, {
      ...meta,
      action,
      success
    });
  }
}

// Instância singleton
const logger = new Logger();

// Exportar instância e classe
export { logger, Logger };
export default logger;
