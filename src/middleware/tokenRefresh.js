const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

/**
 * Middleware para renovação automática de tokens JWT
 */
class TokenRefreshMiddleware {
  constructor() {
    this.refreshThreshold = 300; // 5 minutos antes da expiração
    this.cache = new Map(); // Cache simples para evitar múltiplas renovações
  }

  /**
   * Verifica se um token precisa ser renovado
   */
  isTokenExpiringSoon(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return false;
      }

      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - now;
      
      return timeUntilExpiry < this.refreshThreshold;
    } catch (error) {
      logger.error('Erro ao decodificar token:', error.message);
      return false;
    }
  }

  /**
   * Renova um token usando o refresh token
   */
  async refreshToken(refreshToken) {
    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error) {
        logger.error('Erro ao renovar token:', error.message);
        return null;
      }

      if (data.session) {
        logger.info('Token renovado com sucesso');
        return data.session;
      }

      return null;
    } catch (error) {
      logger.error('Erro ao renovar token:', error.message);
      return null;
    }
  }

  /**
   * Middleware principal para renovação automática
   */
  middleware() {
    return async (req, res, next) => {
      try {
        // Extrair token do header ou cookie
        const token = this.extractToken(req);
        
        if (!token) {
          return next();
        }

        // Verificar se o token está expirando em breve
        if (this.isTokenExpiringSoon(token)) {
          logger.info('Token expirando em breve, tentando renovar...');
          
          // Verificar cache para evitar múltiplas renovações
          const cacheKey = `refresh_${token.substring(0, 20)}`;
          if (this.cache.has(cacheKey)) {
            const cachedSession = this.cache.get(cacheKey);
            if (Date.now() - cachedSession.timestamp < 60000) { // 1 minuto de cache
              logger.info('Usando token renovado do cache');
              req.refreshedSession = cachedSession.session;
              return next();
            }
          }

          // Tentar renovar o token
          const refreshToken = this.extractRefreshToken(req);
          if (refreshToken) {
            const newSession = await this.refreshToken(refreshToken);
            
            if (newSession) {
              // Armazenar no cache
              this.cache.set(cacheKey, {
                session: newSession,
                timestamp: Date.now()
              });

              // Limpar cache antigo (manter apenas últimos 100 itens)
              if (this.cache.size > 100) {
                const entries = Array.from(this.cache.entries());
                const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
                const toRemove = sortedEntries.slice(0, this.cache.size - 100);
                toRemove.forEach(([key]) => this.cache.delete(key));
              }

              req.refreshedSession = newSession;
              logger.info('Token renovado e armazenado no cache');
            }
          }
        }

        next();
      } catch (error) {
        logger.error('Erro no middleware de renovação de token:', error.message);
        next();
      }
    };
  }

  /**
   * Extrai o token de autenticação da requisição
   */
  extractToken(req) {
    // 1. Authorization header
    if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
      return authHeader;
    }

    // 2. Cookies específicos para token
    const tokenCookieNames = ['supabase-auth-token', 'authToken', 'token'];
    for (const name of tokenCookieNames) {
      if (req.cookies && req.cookies[name]) {
        return req.cookies[name];
      }
    }

    // 3. Cookie header manual para token
    if (req.headers.cookie) {
      for (const name of tokenCookieNames) {
        const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = new RegExp(`${safeName}=([^;]+)`).exec(req.headers.cookie);
        if (match) {
          return match[1];
        }
      }
    }

    return null;
  }

  /**
   * Extrai o refresh token da requisição
   */
  extractRefreshToken(req) {
    // 1. Cookies específicos para refresh token
    const refreshCookieNames = ['refreshToken', 'supabase-refresh-token', 'sb-refresh-token'];
    for (const name of refreshCookieNames) {
      if (req.cookies && req.cookies[name]) {
        return req.cookies[name];
      }
    }

    // 2. Cookie header manual para refresh token
    if (req.headers.cookie) {
      for (const name of refreshCookieNames) {
        const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = new RegExp(`${safeName}=([^;]+)`).exec(req.headers.cookie);
        if (match) {
          return match[1];
        }
      }
    }

    // 3. Tentar extrair do token atual (se for um token composto)
    const token = this.extractToken(req);
    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.refresh_token) {
          return decoded.refresh_token;
        }
      } catch (error) {
        // Ignorar erro de decodificação
      }
    }

    return null;
  }

  /**
   * Middleware para aplicar tokens renovados na resposta
   */
  applyRefreshedTokens() {
    return (req, res, next) => {
      if (req.refreshedSession) {
        // Definir novos cookies com tokens renovados
        res.cookie('supabase-auth-token', req.refreshedSession.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: req.refreshedSession.expires_in * 1000,
          sameSite: 'strict'
        });

        res.cookie('supabase-refresh-token', req.refreshedSession.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
          sameSite: 'strict'
        });

        // Adicionar header para o frontend saber que o token foi renovado
        res.set('X-Token-Refreshed', 'true');
        
        logger.info('Tokens renovados aplicados na resposta');
      }

      next();
    };
  }

  /**
   * Limpa o cache de tokens
   */
  clearCache() {
    this.cache.clear();
    logger.info('Cache de tokens limpo');
  }

  /**
   * Obtém estatísticas do cache
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key: key.substring(0, 20) + '...',
        age: Date.now() - value.timestamp
      }))
    };
  }
}

// Criar instância singleton
const tokenRefreshMiddleware = new TokenRefreshMiddleware();

// Exportar middleware e instância
module.exports = {
  tokenRefreshMiddleware,
  refreshTokens: tokenRefreshMiddleware.middleware(),
  applyRefreshedTokens: tokenRefreshMiddleware.applyRefreshedTokens(),
  clearTokenCache: () => tokenRefreshMiddleware.clearCache(),
  getTokenCacheStats: () => tokenRefreshMiddleware.getCacheStats()
}; 