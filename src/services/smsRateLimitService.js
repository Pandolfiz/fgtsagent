const logger = require('../config/logger');

/**
 * Serviço para controle de rate limiting de SMS
 * Previne múltiplas requisições simultâneas para o mesmo número
 */
class SmsRateLimitService {
  constructor() {
    // Cache em memória para tracking de requisições
    this.requestCache = new Map();
    
    // Configurações de rate limiting
    this.config = {
      // Tempo mínimo entre requisições para o mesmo número (5 minutos)
      minIntervalMs: 5 * 60 * 1000,
      
      // Máximo de tentativas por número por hora
      maxAttemptsPerHour: 3,
      
      // Janela de tempo para contagem de tentativas (1 hora)
      windowMs: 60 * 60 * 1000,
      
      // Tempo de bloqueio após muitas tentativas (30 minutos)
      blockDurationMs: 30 * 60 * 1000
    };
  }

  /**
   * Verifica se uma requisição de SMS pode ser feita
   * @param {string} phoneNumberId - ID do número de telefone
   * @param {string} clientId - ID do cliente
   * @returns {Object} - Resultado da verificação
   */
  canRequestSms(phoneNumberId, clientId) {
    const key = `${clientId}:${phoneNumberId}`;
    const now = Date.now();
    
    // Buscar dados do cache
    const requestData = this.requestCache.get(key) || {
      lastRequest: 0,
      attempts: [],
      blockedUntil: 0
    };

    // Verificar se está bloqueado
    if (requestData.blockedUntil > now) {
      const remainingBlockTime = Math.ceil((requestData.blockedUntil - now) / 1000 / 60);
      return {
        allowed: false,
        reason: 'BLOCKED',
        message: `Número bloqueado por muitas tentativas. Tente novamente em ${remainingBlockTime} minutos.`,
        retryAfter: requestData.blockedUntil
      };
    }

    // Verificar intervalo mínimo entre requisições
    const timeSinceLastRequest = now - requestData.lastRequest;
    if (timeSinceLastRequest < this.config.minIntervalMs) {
      const remainingTime = Math.ceil((this.config.minIntervalMs - timeSinceLastRequest) / 1000 / 60);
      return {
        allowed: false,
        reason: 'TOO_SOON',
        message: `Aguarde ${remainingTime} minutos antes de solicitar um novo SMS.`,
        retryAfter: requestData.lastRequest + this.config.minIntervalMs
      };
    }

    // Verificar limite de tentativas por hora
    const recentAttempts = requestData.attempts.filter(
      attempt => attempt > now - this.config.windowMs
    );

    if (recentAttempts.length >= this.config.maxAttemptsPerHour) {
      // Bloquear por 30 minutos
      requestData.blockedUntil = now + this.config.blockDurationMs;
      this.requestCache.set(key, requestData);
      
      return {
        allowed: false,
        reason: 'RATE_LIMIT_EXCEEDED',
        message: 'Limite de tentativas excedido. Número bloqueado por 30 minutos.',
        retryAfter: requestData.blockedUntil
      };
    }

    return {
      allowed: true,
      reason: 'OK',
      message: 'Requisição permitida'
    };
  }

  /**
   * Registra uma tentativa de requisição de SMS
   * @param {string} phoneNumberId - ID do número de telefone
   * @param {string} clientId - ID do cliente
   * @param {boolean} success - Se a requisição foi bem-sucedida
   */
  recordSmsRequest(phoneNumberId, clientId, success = true) {
    const key = `${clientId}:${phoneNumberId}`;
    const now = Date.now();
    
    // Buscar ou criar dados do cache
    const requestData = this.requestCache.get(key) || {
      lastRequest: 0,
      attempts: [],
      blockedUntil: 0
    };

    // Atualizar dados
    requestData.lastRequest = now;
    requestData.attempts.push(now);
    
    // Limpar tentativas antigas (mais de 1 hora)
    requestData.attempts = requestData.attempts.filter(
      attempt => attempt > now - this.config.windowMs
    );

    // Se foi bem-sucedida, remover bloqueio se existir
    if (success) {
      requestData.blockedUntil = 0;
    }

    // Salvar no cache
    this.requestCache.set(key, requestData);

    logger.info(`[SMS_RATE_LIMIT] Registrada tentativa de SMS`, {
      phoneNumberId,
      clientId,
      success,
      attemptsCount: requestData.attempts.length,
      lastRequest: new Date(requestData.lastRequest).toISOString()
    });
  }

  /**
   * Obtém estatísticas de rate limiting para um número
   * @param {string} phoneNumberId - ID do número de telefone
   * @param {string} clientId - ID do cliente
   * @returns {Object} - Estatísticas
   */
  getSmsStats(phoneNumberId, clientId) {
    const key = `${clientId}:${phoneNumberId}`;
    const requestData = this.requestCache.get(key);
    
    if (!requestData) {
      return {
        attempts: 0,
        lastRequest: null,
        isBlocked: false,
        blockedUntil: null
      };
    }

    const now = Date.now();
    const recentAttempts = requestData.attempts.filter(
      attempt => attempt > now - this.config.windowMs
    );

    return {
      attempts: recentAttempts.length,
      lastRequest: requestData.lastRequest ? new Date(requestData.lastRequest).toISOString() : null,
      isBlocked: requestData.blockedUntil > now,
      blockedUntil: requestData.blockedUntil ? new Date(requestData.blockedUntil).toISOString() : null,
      maxAttempts: this.config.maxAttemptsPerHour,
      windowMinutes: Math.ceil(this.config.windowMs / 1000 / 60)
    };
  }

  /**
   * Limpa dados antigos do cache (chamado periodicamente)
   */
  cleanup() {
    const now = Date.now();
    const cutoffTime = now - this.config.windowMs;

    for (const [key, requestData] of this.requestCache.entries()) {
      // Remover tentativas antigas
      requestData.attempts = requestData.attempts.filter(attempt => attempt > cutoffTime);
      
      // Se não há mais tentativas e não está bloqueado, remover entrada
      if (requestData.attempts.length === 0 && requestData.blockedUntil <= now) {
        this.requestCache.delete(key);
      }
    }

    logger.debug(`[SMS_RATE_LIMIT] Cleanup realizado. Cache size: ${this.requestCache.size}`);
  }

  /**
   * Reseta rate limiting para um número específico (para casos especiais)
   * @param {string} phoneNumberId - ID do número de telefone
   * @param {string} clientId - ID do cliente
   */
  resetForNumber(phoneNumberId, clientId) {
    const key = `${clientId}:${phoneNumberId}`;
    this.requestCache.delete(key);
    
    logger.info(`[SMS_RATE_LIMIT] Rate limiting resetado para ${phoneNumberId}`, {
      phoneNumberId,
      clientId
    });
  }
}

// Instância singleton
const smsRateLimitService = new SmsRateLimitService();

// Cleanup automático a cada 10 minutos
setInterval(() => {
  smsRateLimitService.cleanup();
}, 10 * 60 * 1000);

module.exports = smsRateLimitService; 