/**
 * ==============================================
 * UTILITÁRIO DE LOGOUT UNIFICADO
 * ==============================================
 * 
 * Este utilitário centraliza toda a lógica de logout,
 * garantindo consistência em todo o sistema.
 * 
 * Funcionalidades:
 * - Logout via Supabase
 * - Limpeza de localStorage/sessionStorage
 * - Logout via API do backend
 * - Limpeza de cookies (via backend)
 * - Redirecionamento consistente
 * - Tratamento de erros unificado
 * 
 * @author Equipe de Desenvolvimento
 * @version 1.0.0
 * @since 2024-01-XX
 */

import supabase from '../lib/supabaseClient';
import unifiedCookieManager from './unifiedCookieManager';

class UnifiedLogout {
  constructor() {
    this.isLoggingOut = false;
  }

  /**
   * Executa logout completo e consistente
   */
  async logout(options = {}) {
    // Evitar múltiplas execuções simultâneas
    if (this.isLoggingOut) {
      console.log('⚠️ UnifiedLogout: Logout já em andamento, ignorando...');
      return { success: false, error: 'Logout já em andamento' };
    }

    this.isLoggingOut = true;

    try {
      console.log('🔄 UnifiedLogout: Iniciando logout completo...');

      const results = {
        supabase: false,
        backend: false,
        localCleanup: false,
        cookieCleanup: false
      };

      // 1. Logout via Supabase
      try {
        console.log('🔄 UnifiedLogout: Fazendo logout via Supabase...');
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.warn('⚠️ UnifiedLogout: Erro no logout do Supabase:', error);
        } else {
          results.supabase = true;
          console.log('✅ UnifiedLogout: Logout do Supabase realizado');
        }
      } catch (error) {
        console.warn('⚠️ UnifiedLogout: Erro inesperado no logout do Supabase:', error);
      }

      // 2. Logout via API do backend
      try {
        console.log('🔄 UnifiedLogout: Fazendo logout via API do backend...');
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          results.backend = true;
          console.log('✅ UnifiedLogout: Logout via API realizado');
        } else {
          console.warn('⚠️ UnifiedLogout: Erro na API de logout:', response.status);
        }
      } catch (error) {
        console.warn('⚠️ UnifiedLogout: Erro na requisição de logout:', error);
      }

      // 3. Limpeza local
      try {
        console.log('🔄 UnifiedLogout: Limpando dados locais...');
        
        // Limpar localStorage
        localStorage.clear();
        
        // Limpar sessionStorage
        sessionStorage.clear();
        
        // Limpar cookies via gerenciador unificado
        unifiedCookieManager.clearAllTokens();
        
        results.localCleanup = true;
        console.log('✅ UnifiedLogout: Limpeza local realizada');
      } catch (error) {
        console.warn('⚠️ UnifiedLogout: Erro na limpeza local:', error);
      }

      // 4. Verificar se pelo menos uma operação foi bem-sucedida
      const hasSuccess = Object.values(results).some(result => result === true);
      
      if (!hasSuccess) {
        throw new Error('Nenhuma operação de logout foi bem-sucedida');
      }

      console.log('✅ UnifiedLogout: Logout completo realizado com sucesso');
      
      return {
        success: true,
        results,
        message: 'Logout realizado com sucesso'
      };

    } catch (error) {
      console.error('❌ UnifiedLogout: Erro durante logout:', error);
      
      // Mesmo com erro, tentar limpeza de emergência
      try {
        localStorage.clear();
        sessionStorage.clear();
        unifiedCookieManager.clearAllTokens();
        console.log('🔄 UnifiedLogout: Limpeza de emergência realizada');
      } catch (cleanupError) {
        console.error('❌ UnifiedLogout: Erro na limpeza de emergência:', cleanupError);
      }

      return {
        success: false,
        error: error.message,
        message: 'Erro no logout, mas dados foram limpos'
      };
    } finally {
      this.isLoggingOut = false;
    }
  }

  /**
   * Executa logout com redirecionamento
   */
  async logoutAndRedirect(redirectUrl = '/login', options = {}) {
    try {
      const result = await this.logout(options);
      
      // Aguardar um momento para garantir que tudo foi processado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Redirecionar
      if (options.forceReload !== false) {
        // Forçar reload completo da página
        window.location.href = redirectUrl;
      } else {
        // Usar navegação do React Router se disponível
        if (options.navigate) {
          options.navigate(redirectUrl);
        } else {
          window.location.href = redirectUrl;
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ UnifiedLogout: Erro no logout com redirecionamento:', error);
      
      // Forçar redirecionamento mesmo com erro
      window.location.href = redirectUrl;
      
      return {
        success: false,
        error: error.message,
        message: 'Erro no logout, mas redirecionamento foi realizado'
      };
    }
  }

  /**
   * Verifica se está em processo de logout
   */
  isLoggingOutProcess() {
    return this.isLoggingOut;
  }

  /**
   * Força limpeza de emergência (último recurso)
   */
  forceCleanup() {
    try {
      console.log('🔄 UnifiedLogout: Executando limpeza forçada...');
      
      // Limpar tudo
      localStorage.clear();
      sessionStorage.clear();
      unifiedCookieManager.clearAllTokens();
      
      // Limpar cookies manualmente (último recurso)
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      console.log('✅ UnifiedLogout: Limpeza forçada concluída');
      return true;
    } catch (error) {
      console.error('❌ UnifiedLogout: Erro na limpeza forçada:', error);
      return false;
    }
  }
}

// Instância singleton
const unifiedLogout = new UnifiedLogout();

// Disponibilizar globalmente para debug
if (typeof window !== 'undefined') {
  window.unifiedLogout = unifiedLogout;
  window.forceLogout = () => unifiedLogout.logoutAndRedirect('/login');
  window.forceCleanup = () => unifiedLogout.forceCleanup();
}

export default unifiedLogout;





