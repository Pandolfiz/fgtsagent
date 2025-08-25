/**
 * Middleware de proteção contra limpeza automática de tokens
 * Previne que tokens válidos sejam limpos desnecessariamente
 */
const logger = require('../utils/logger');

class TokenProtectionMiddleware {
  constructor() {
    this.protectedTokens = new Set();
    this.recentLogins = new Map(); // userId -> timestamp
  }

  /**
   * Middleware principal
   */
  middleware() {
    return (req, res, next) => {
      try {
        // Interceptar operações de limpeza de cookies
        const originalClearCookie = res.clearCookie;
        
        res.clearCookie = (name, options) => {
          // Verificar se é um cookie de autenticação
          if (this.isAuthCookie(name)) {
            const token = this.extractTokenFromRequest(req);
            
            if (token && this.isTokenValid(token)) {
              logger.warn(`[TOKEN PROTECTION] Tentativa de limpar cookie de token válido: ${name}`);
              
              // Verificar se é um login recente (últimos 30 segundos)
              const userId = this.getUserIdFromToken(token);
              if (userId && this.isRecentLogin(userId)) {
                logger.warn(`[TOKEN PROTECTION] BLOQUEADO: Tentativa de limpar token de login recente para usuário ${userId}`);
                return; // Bloquear a limpeza
              }
              
              // Se não for login recente, permitir mas logar
              logger.info(`[TOKEN PROTECTION] Permitindo limpeza de token: ${name} (não é login recente)`);
            }
          }
          
          // Chamar método original
          return originalClearCookie.call(res, name, options);
        };

        // Interceptar operações de logout
        const originalJson = res.json;
        res.json = function(data) {
          // Verificar se é uma resposta de logout
          if (data && data.success && data.message && typeof data.message === 'string' && data.message.includes('logout')) {
            logger.info('[TOKEN PROTECTION] Logout detectado, permitindo limpeza de tokens');
          }
          
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        logger.error(`[TOKEN PROTECTION] Erro no middleware: ${error.message}`);
        next();
      }
    };
  }

  /**
   * Verifica se é um cookie de autenticação
   */
  isAuthCookie(name) {
    const authCookieNames = [
      'authToken',
      'refreshToken', 
      'supabase-auth-token',
      'js-auth-token',
      'sb-access-token',
      'sb-refresh-token'
    ];
    
    return authCookieNames.some(authName => name.includes(authName));
  }

  /**
   * Extrai token da requisição
   */
  extractTokenFromRequest(req) {
    // Header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      return req.headers.authorization.substring(7);
    }
    
    // Cookies
    if (req.cookies) {
      for (const [name, value] of Object.entries(req.cookies)) {
        if (this.isAuthCookie(name)) {
          return value;
        }
      }
    }
    
    return null;
  }

  /**
   * Verifica se o token é válido (estrutura básica)
   */
  isTokenValid(token) {
    if (!token || typeof token !== 'string') return false;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Verificar se não está expirado
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return false; // Token expirado
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extrai ID do usuário do token
   */
  getUserIdFromToken(token) {
    try {
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.sub || payload.user_id;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verifica se é um login recente
   */
  isRecentLogin(userId) {
    if (!userId) return false;
    
    const loginTime = this.recentLogins.get(userId);
    if (!loginTime) return false;
    
    const elapsed = Date.now() - loginTime;
    return elapsed < 30000; // 30 segundos
  }

  /**
   * Marca um login recente
   */
  markRecentLogin(userId) {
    this.recentLogins.set(userId, Date.now());
    
    // Limpar logins antigos (mais de 5 minutos)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    for (const [id, timestamp] of this.recentLogins.entries()) {
      if (timestamp < fiveMinutesAgo) {
        this.recentLogins.delete(id);
      }
    }
  }

  /**
   * Limpa proteção para um usuário específico
   */
  clearProtection(userId) {
    this.recentLogins.delete(userId);
    logger.info(`[TOKEN PROTECTION] Proteção removida para usuário ${userId}`);
  }
}

// Instância singleton
const tokenProtectionMiddleware = new TokenProtectionMiddleware();

module.exports = {
  middleware: () => tokenProtectionMiddleware.middleware(),
  markRecentLogin: (userId) => tokenProtectionMiddleware.markRecentLogin(userId),
  clearProtection: (userId) => tokenProtectionMiddleware.clearProtection(userId)
};

