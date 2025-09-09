/**
 * ==============================================
 * GERENCIADOR UNIFICADO DE COOKIES
 * ==============================================
 * 
 * Centraliza toda a gestão de cookies de autenticação,
 * padronizando nomes e comportamentos em todo o sistema.
 * 
 * Funcionalidades:
 * - Cookies httpOnly para segurança máxima
 * - Nomes padronizados (authToken, refreshToken)
 * - Limpeza de cookies antigos
 * - Validação de configurações
 * 
 * @author Equipe de Desenvolvimento
 * @version 1.0.0
 * @since 2024-01-XX
 */

/**
 * ==============================================
 * CONFIGURAÇÕES E CONSTANTES
 * ==============================================
 */
const CONFIG = {
  // Nomes padronizados de cookies
  COOKIE_NAMES: {
    AUTH_TOKEN: 'authToken',
    REFRESH_TOKEN: 'refreshToken',
    SUPABASE_AUTH: 'supabase-auth-token',
    LEGACY_AUTH: 'js-auth-token'
  },
  
  // Configurações de cookies
  COOKIE_CONFIG: {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: process.env.NODE_ENV === 'production' ? '.fgtsagent.com.br' : 'localhost'
  },
  
  // Configurações específicas por tipo de token
  AUTH_TOKEN_CONFIG: {
    maxAge: 60 * 60 * 24, // 24 horas
    httpOnly: true // Segurança: não acessível via JavaScript
  },
  
  REFRESH_TOKEN_CONFIG: {
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    httpOnly: true // Segurança: não acessível via JavaScript
  }
};

/**
 * ==============================================
 * CLASSE PRINCIPAL DO GERENCIADOR
 * ==============================================
 */
class UnifiedCookieManager {
  constructor() {
    this.initialized = false;
    this.init();
  }

  /**
   * ==============================================
   * INICIALIZAÇÃO
   * ==============================================
   */
  init() {
    try {
      console.log('🚀 UnifiedCookieManager: Inicializando...');
      
      // Limpar cookies antigos na inicialização
      this.clearLegacyCookies();
      
      this.initialized = true;
      console.log('✅ UnifiedCookieManager: Inicializado com sucesso');
    } catch (error) {
      console.error('❌ UnifiedCookieManager: Erro na inicialização:', error);
      this.initialized = false;
    }
  }

  /**
   * ==============================================
   * MÉTODOS DE CONFIGURAÇÃO DE COOKIES
   * ==============================================
   */
  setAuthToken(token) {
    if (!this.initialized) {
      console.warn('⚠️ UnifiedCookieManager: Não inicializado');
      return false;
    }

    try {
      const config = {
        ...CONFIG.COOKIE_CONFIG,
        ...CONFIG.AUTH_TOKEN_CONFIG
      };

      // Como httpOnly é true, não podemos definir via JavaScript
      // Este método é mantido para compatibilidade, mas não funciona
      console.warn('⚠️ UnifiedCookieManager: setAuthToken não funciona com httpOnly cookies');
      return false;
    } catch (error) {
      console.error('❌ UnifiedCookieManager: Erro ao definir authToken:', error);
      return false;
    }
  }

  setRefreshToken(token) {
    if (!this.initialized) {
      console.warn('⚠️ UnifiedCookieManager: Não inicializado');
      return false;
    }

    try {
      const config = {
        ...CONFIG.COOKIE_CONFIG,
        ...CONFIG.REFRESH_TOKEN_CONFIG
      };

      // Como httpOnly é true, não podemos definir via JavaScript
      // Este método é mantido para compatibilidade, mas não funciona
      console.warn('⚠️ UnifiedCookieManager: setRefreshToken não funciona com httpOnly cookies');
      return false;
    } catch (error) {
      console.error('❌ UnifiedCookieManager: Erro ao definir refreshToken:', error);
      return false;
    }
  }

  /**
   * ==============================================
   * MÉTODOS DE LEITURA DE COOKIES
   * ==============================================
   */
  getAuthToken() {
    // httpOnly cookies não são acessíveis via JavaScript
    console.warn('⚠️ UnifiedCookieManager: getAuthToken retorna null (httpOnly)');
    return null;
  }

  getRefreshToken() {
    // httpOnly cookies não são acessíveis via JavaScript
    console.warn('⚠️ UnifiedCookieManager: getRefreshToken retorna null (httpOnly)');
    return null;
  }

  hasValidTokens() {
    // httpOnly cookies não são acessíveis via JavaScript
    console.warn('⚠️ UnifiedCookieManager: hasValidTokens retorna false (httpOnly)');
    return false;
  }

  /**
   * ==============================================
   * MÉTODOS DE LIMPEZA
   * ==============================================
   */
  clearAllTokens() {
    if (!this.initialized) {
      console.warn('⚠️ UnifiedCookieManager: Não inicializado');
      return false;
    }

    try {
      console.log('🧹 UnifiedCookieManager: Limpando todos os tokens...');
      
      // Limpar cookies legados
      this.clearLegacyCookies();
      
      // Limpar cookies atuais (mesmo que httpOnly)
      const cookiesToClear = [
        CONFIG.COOKIE_NAMES.AUTH_TOKEN,
        CONFIG.COOKIE_NAMES.REFRESH_TOKEN,
        CONFIG.COOKIE_NAMES.SUPABASE_AUTH
      ];

      cookiesToClear.forEach(cookieName => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${CONFIG.COOKIE_CONFIG.domain}`;
      });

      console.log('✅ UnifiedCookieManager: Tokens limpos');
      return true;
    } catch (error) {
      console.error('❌ UnifiedCookieManager: Erro ao limpar tokens:', error);
      return false;
    }
  }

  clearLegacyCookies() {
    try {
      console.log('🧹 UnifiedCookieManager: Limpando cookies antigos...');
      
      const legacyCookies = [
        CONFIG.COOKIE_NAMES.LEGACY_AUTH,
        'authToken_old',
        'refreshToken_old',
        'supabase-auth-token_old'
      ];

      legacyCookies.forEach(cookieName => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${CONFIG.COOKIE_CONFIG.domain}`;
      });

      console.log('✅ UnifiedCookieManager: Cookies antigos limpos');
    } catch (error) {
      console.error('❌ UnifiedCookieManager: Erro ao limpar cookies antigos:', error);
    }
  }

  /**
   * ==============================================
   * MÉTODOS DE VALIDAÇÃO E DEBUG
   * ==============================================
   */
  validateTokens() {
    // httpOnly cookies não são acessíveis via JavaScript
    console.warn('⚠️ UnifiedCookieManager: validateTokens não funciona com httpOnly cookies');
    return {
      valid: false,
      reason: 'httpOnly cookies não acessíveis via JavaScript'
    };
  }

  getDebugInfo() {
    return {
      initialized: this.initialized,
      config: CONFIG,
      note: 'httpOnly cookies não são acessíveis via JavaScript'
    };
  }

  /**
   * ==============================================
   * MÉTODOS DE COMPATIBILIDADE
   * ==============================================
   */
  // Métodos para compatibilidade com código existente
  setItem(key, value) {
    if (key === 'authToken') return this.setAuthToken(value);
    if (key === 'refreshToken') return this.setRefreshToken(value);
    return false;
  }

  getItem(key) {
    if (key === 'authToken') return this.getAuthToken();
    if (key === 'refreshToken') return this.getRefreshToken();
    return null;
  }

  removeItem(key) {
    if (key === 'authToken' || key === 'refreshToken') {
      return this.clearAllTokens();
    }
    return false;
  }
}

/**
 * ==============================================
 * INSTÂNCIA SINGLETON E EXPORTS
 * ==============================================
 */
const unifiedCookieManager = new UnifiedCookieManager();

// Export default para compatibilidade com import default
export default unifiedCookieManager;

// Export nomeado para compatibilidade com import nomeado
export { unifiedCookieManager, CONFIG };

// Export da classe para casos especiais
export { UnifiedCookieManager };