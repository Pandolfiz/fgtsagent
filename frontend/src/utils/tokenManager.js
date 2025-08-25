/**
 * Gerenciador simplificado de tokens de autenticação
 * Foca apenas na sincronização essencial com Supabase
 */
class TokenManager {
  constructor() {
    this.STORAGE_KEYS = {
      PRIMARY: 'authToken',
      SUPABASE: 'supabase.auth.token'
    };
  }

  /**
   * Armazena token de forma consistente
   */
  setToken(token, options = {}) {
    try {
      // ✅ VALIDAR: Token antes de armazenar
      if (!token || typeof token !== 'string' || token.length < 10) {
        console.error('❌ TokenManager: Token inválido fornecido');
        return false;
      }

      console.log('🔄 TokenManager: Armazenando token...');

      // 1. localStorage principal
      localStorage.setItem(this.STORAGE_KEYS.PRIMARY, token);
      
      // 2. Marcar timestamp de login recente
      localStorage.setItem('recent_login_timestamp', Date.now().toString());
      
      // 3. Sincronizar com Supabase storage se disponível
      try {
        const supabaseStorage = localStorage.getItem(this.STORAGE_KEYS.SUPABASE);
        if (supabaseStorage) {
          const parsed = JSON.parse(supabaseStorage);
          if (parsed?.currentSession) {
            parsed.currentSession.access_token = token;
            localStorage.setItem(this.STORAGE_KEYS.SUPABASE, JSON.stringify(parsed));
          }
        }
      } catch (syncError) {
        console.warn('⚠️ TokenManager: Erro ao sincronizar com Supabase storage:', syncError);
      }
      
      console.log('✅ TokenManager: Token armazenado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ TokenManager: Erro ao armazenar token:', error);
      return false;
    }
  }

  /**
   * Obtém token da fonte mais confiável
   */
  getToken() {
    try {
      // 1. Tentar localStorage primeiro
      let token = localStorage.getItem(this.STORAGE_KEYS.PRIMARY);
      
      if (token && token.length >= 10) {
        return token;
      }

      // 2. Tentar Supabase storage
      const supabaseTokens = localStorage.getItem(this.STORAGE_KEYS.SUPABASE);
      if (supabaseTokens) {
        try {
          const parsed = JSON.parse(supabaseTokens);
          if (parsed?.currentSession?.access_token && parsed.currentSession.access_token.length >= 10) {
            // ✅ SINCRONIZAR: Com storage principal
            this.setToken(parsed.currentSession.access_token);
            return parsed.currentSession.access_token;
          }
        } catch (e) {
          console.warn('⚠️ TokenManager: Erro ao parsear Supabase storage:', e);
        }
      }

      return null;
    } catch (error) {
      console.error('❌ TokenManager: Erro ao obter token:', error);
      return null;
    }
  }

  /**
   * Remove token de todos os storages
   */
  clearToken() {
    try {
      // 1. Limpar localStorage
      localStorage.removeItem(this.STORAGE_KEYS.PRIMARY);
      localStorage.removeItem(this.STORAGE_KEYS.SUPABASE);
      localStorage.removeItem('recent_login_timestamp');
      
      // 2. Limpar sessionStorage
      sessionStorage.removeItem(this.STORAGE_KEYS.PRIMARY);
      sessionStorage.removeItem(this.STORAGE_KEYS.SUPABASE);
      
      console.log('✅ TokenManager: Token removido com sucesso');
      return true;
    } catch (error) {
      console.error('❌ TokenManager: Erro ao remover token:', error);
      return false;
    }
  }

  /**
   * Verifica se o token está presente e válido
   */
  hasValidToken() {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      // Verificar se é um JWT válido (estrutura básica)
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Verificar expiração se possível
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp < Date.now() / 1000) {
        console.log('⚠️ TokenManager: Token expirado, removendo...');
        this.clearToken();
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('⚠️ TokenManager: Token malformado:', error);
      return false;
    }
  }

  /**
   * Sincroniza token entre diferentes storages
   */
  syncToken() {
    const token = this.getToken();
    if (token) {
      this.setToken(token);
    }
  }

  /**
   * Verifica se o login foi recente (últimos 60 segundos)
   */
  isRecentLogin() {
    const timestamp = localStorage.getItem('recent_login_timestamp');
    if (!timestamp) return false;
    
    const elapsed = Date.now() - parseInt(timestamp);
    return elapsed < 60000; // 60 segundos (aumentado)
  }
}

// Instância singleton
const tokenManager = new TokenManager();

export default tokenManager;
