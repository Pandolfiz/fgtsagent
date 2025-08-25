/**
 * Utilitários simplificados para autenticação e gerenciamento de sessão
 */

/**
 * Limpa dados de autenticação do localStorage e sessionStorage
 */
export const clearLocalAuthData = () => {
  try {
    // ✅ LIMPAR: localStorage
    localStorage.removeItem('backend_session');
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('sb-access-token');
    localStorage.removeItem('sb-refresh-token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user_data');
    localStorage.removeItem('signup_user_data');
    
    // ✅ LIMPAR: sessionStorage
    sessionStorage.removeItem('backend_session');
    sessionStorage.removeItem('supabase.auth.token');
    sessionStorage.removeItem('sb-access-token');
    sessionStorage.removeItem('sb-refresh-token');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user_data');
    
    console.log('✅ AuthUtils: Dados locais de autenticação limpos');
  } catch (error) {
    console.error('❌ AuthUtils: Erro ao limpar dados locais:', error);
  }
};

/**
 * Limpa a sessão no backend através da API
 */
export const clearBackendSession = async () => {
  try {
    const response = await fetch('/api/auth/clear-session', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      console.log('✅ AuthUtils: Sessão do backend limpa');
      return true;
    } else {
      console.warn('⚠️ AuthUtils: Falha ao limpar sessão do backend');
      return false;
    }
  } catch (error) {
    console.error('❌ AuthUtils: Erro ao limpar sessão do backend:', error);
    return false;
  }
};

/**
 * Limpa completamente a autenticação (local + backend)
 */
export const clearCompleteAuth = async () => {
  try {
    console.log('🔄 AuthUtils: Iniciando limpeza completa de autenticação...');
    
    // ✅ STEP 1: Limpar dados locais
    clearLocalAuthData();
    
    // ✅ STEP 2: Limpar sessão do backend
    await clearBackendSession();
    
    console.log('✅ AuthUtils: Limpeza completa de autenticação concluída');
    return true;
  } catch (error) {
    console.error('❌ AuthUtils: Erro na limpeza completa:', error);
    return false;
  }
};

/**
 * Verifica se há problemas de autenticação e limpa se necessário
 * ✅ MELHORADO: Evita limpeza prematura
 */
export const handleAuthErrors = async (error) => {
  try {
    // ✅ VERIFICAR: Se é erro de autenticação REAL
    if (error) {
      const errorMessage = error.message || error.toString();
      const isAuthError = 
        errorMessage.includes('401') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('Unauthorized') ||
        errorMessage.includes('SESSION_INVALID') ||
        errorMessage.includes('Token');
      
      if (isAuthError) {
        // ✅ VERIFICAR: Se é login recente antes de limpar
        const recentLoginTime = localStorage.getItem('recent_login_timestamp');
        if (recentLoginTime) {
          const elapsed = Date.now() - parseInt(recentLoginTime);
          if (elapsed < 60000) { // 60 segundos
            console.log('🔄 AuthUtils: Login recente detectado, não limpando sessão...');
            return false;
          }
        }
        
        console.warn('⚠️ AuthUtils: Erro de autenticação detectado, limpando sessão...');
        await clearCompleteAuth();
        
        // ✅ REDIRECIONAR: Para login apenas se não estiver em loop
        if (window.location.pathname !== '/login' && 
            window.location.pathname !== '/signup' && 
            window.location.pathname !== '/auth/recovery') {
          
          window.location.href = '/login?message=Sua sessão expirou. Faça login novamente.';
        }
        
        return true;
      }
    }
    
    return false;
  } catch (handleError) {
    console.error('❌ AuthUtils: Erro ao lidar com erro de autenticação:', handleError);
    return false;
  }
};

/**
 * Interceptor simplificado para axios
 * ✅ MELHORADO: Evita limpeza automática prematura
 */
export const setupAxiosAuthInterceptor = (axiosInstance) => {
  if (!axiosInstance) {
    console.error('❌ AuthUtils: Instância do axios não fornecida');
    return;
  }

  // ✅ INTERCEPTOR: Request - Adicionar header de login recente
  axiosInstance.interceptors.request.use(
    (config) => {
      // ✅ VERIFICAR: Se há login recente
      const recentLoginTime = localStorage.getItem('recent_login_timestamp');
      if (recentLoginTime) {
        const elapsed = Date.now() - parseInt(recentLoginTime);
        if (elapsed < 60000) { // 60 segundos
          config.headers['X-Recent-Login'] = 'true';
          console.log('🔄 AuthUtils: Adicionando header X-Recent-Login');
        } else {
          // ✅ LIMPAR: Timestamp expirado
          localStorage.removeItem('recent_login_timestamp');
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // ✅ INTERCEPTOR: Response - Melhorar lógica de detecção de erros
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      console.log('🔍 AuthUtils: Interceptando erro de resposta:', error);
      
      // ✅ VERIFICAR: Se é erro de autenticação REAL (não falso positivo)
      const isAuthError = error.response?.status === 401 && 
                         !error.config?.headers?.['X-Recent-Login'] && // Não limpar se login recente
                         !error.config?.url?.includes('/auth/me'); // Não limpar se for verificação de sessão
      
      // ✅ VERIFICAR: Se é erro específico de sessão inválida
      const isSessionInvalid = error.response?.data?.code === 'SESSION_INVALID' ||
                              error.response?.data?.message?.includes('sessão') ||
                              error.response?.data?.message?.includes('token');
      
      if (isAuthError || isSessionInvalid) {
        console.warn('⚠️ AuthUtils: Erro de autenticação detectado, verificando antes de limpar...');
        
        // ✅ VERIFICAR: Se há tokens válidos antes de limpar
        const hasValidToken = localStorage.getItem('authToken') || 
                             localStorage.getItem('supabase.auth.token');
        
        if (hasValidToken) {
          console.log('🔄 AuthUtils: Tokens encontrados, verificando validade antes de limpar...');
          
          // ✅ AGUARDAR: Um pouco antes de verificar (evitar limpeza prematura)
          setTimeout(async () => {
            try {
              // ✅ VERIFICAR: Se o token ainda é válido
              const supabase = window.supabase;
              if (supabase) {
                const { data, error: tokenError } = await supabase.auth.getUser();
                if (tokenError && tokenError.message.includes('JWT')) {
                  console.log('✅ AuthUtils: Token realmente inválido, limpando...');
                  await handleAuthErrors(error);
                } else {
                  console.log('🔄 AuthUtils: Token ainda válido, não limpando...');
                }
              }
            } catch (verifyError) {
              console.log('🔄 AuthUtils: Erro ao verificar token, não limpando...');
            }
          }, 3000); // Aguardar 3 segundos antes de verificar
        } else {
          console.log('🔄 AuthUtils: Nenhum token encontrado, limpando autenticação...');
          await handleAuthErrors(error);
        }
      }
      
      return Promise.reject(error);
    }
  );

  console.log('✅ AuthUtils: Interceptor de autenticação configurado');
};

export default {
  clearLocalAuthData,
  clearBackendSession,
  clearCompleteAuth,
  handleAuthErrors,
  setupAxiosAuthInterceptor
};
