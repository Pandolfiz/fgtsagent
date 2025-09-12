/**
 * ==============================================
 * HOOK CUSTOMIZADO DE AUTENTICAÇÃO
 * ==============================================
 * 
 * Este hook fornece uma interface simplificada para
 * componentes que precisam de funcionalidades de autenticação.
 * 
 * Funcionalidades:
 * - Login/logout simplificado
 * - Verificação de autenticação
 * - Dados do usuário
 * - Estados de loading e erro
 * 
 * @author Equipe de Desenvolvimento
 * @version 1.0.0
 * @since 2024-01-XX
 */

import { useAuth as useAuthContext } from '../contexts/AuthContext';
import { useCallback } from 'react';
import { logger } from '../utils/logger';

/**
 * Hook principal de autenticação
 */
export const useAuth = () => {
  const authContext = useAuthContext();

  // Wrapper para login com logging
  const login = useCallback(async (email, password) => {
    logger.info('Hook useAuth: Iniciando login', { email });
    const result = await authContext.login(email, password);
    
    if (result.success) {
      logger.info('Hook useAuth: Login bem-sucedido', { userId: result.user?.id });
    } else {
      logger.error('Hook useAuth: Falha no login', { error: result.error });
    }
    
    return result;
  }, [authContext]);

  // Wrapper para logout com logging
  const logout = useCallback(async () => {
    logger.info('Hook useAuth: Iniciando logout');
    const result = await authContext.logout();
    
    if (result.success) {
      logger.info('Hook useAuth: Logout bem-sucedido');
    } else {
      logger.error('Hook useAuth: Falha no logout', { error: result.error });
    }
    
    return result;
  }, [authContext]);

  return {
    ...authContext,
    login,
    logout
  };
};

/**
 * Hook para verificar se usuário está autenticado
 */
export const useRequireAuth = () => {
  const { isAuthenticated, loading, user } = useAuthContext();
  
  return {
    isAuthenticated,
    loading,
    user,
    isLoggedIn: isAuthenticated && !!user
  };
};

/**
 * Hook para obter dados do usuário
 */
export const useUser = () => {
  const { user, loading, error } = useAuthContext();
  
  return {
    user,
    loading,
    error,
    isLoggedIn: !!user,
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário',
    userFirstName: user?.user_metadata?.first_name || '',
    userLastName: user?.user_metadata?.last_name || '',
    userPhone: user?.user_metadata?.phone || ''
  };
};

/**
 * Hook para verificar permissões de admin
 */
export const useAdmin = () => {
  const { user, loading } = useAuthContext();
  
  const isAdmin = user?.app_metadata?.roles?.includes('admin') || 
                  user?.app_metadata?.isAdmin === true ||
                  user?.user_metadata?.role === 'admin';
  
  return {
    isAdmin,
    loading,
    user
  };
};

/**
 * Hook para gerenciar estado de loading
 */
export const useAuthLoading = () => {
  const { loading, error } = useAuthContext();
  
  return {
    loading,
    error,
    hasError: !!error
  };
};

/**
 * Hook para refresh de token
 */
export const useTokenRefresh = () => {
  const { refreshToken, refreshAttempts, loading } = useAuthContext();
  
  const refresh = useCallback(async () => {
    logger.info('Hook useTokenRefresh: Iniciando refresh manual');
    const result = await refreshToken();
    
    if (result.success) {
      logger.info('Hook useTokenRefresh: Refresh bem-sucedido');
    } else {
      logger.error('Hook useTokenRefresh: Falha no refresh', { error: result.error });
    }
    
    return result;
  }, [refreshToken]);
  
  return {
    refresh,
    refreshAttempts,
    loading
  };
};

export default useAuth;
