/**
 * ==============================================
 * CONTEXT DE AUTENTICAÇÃO UNIFICADO
 * ==============================================
 * 
 * Este context centraliza toda a lógica de autenticação
 * do frontend, eliminando inconsistências e conflitos.
 * 
 * Funcionalidades:
 * - Estado centralizado de autenticação
 * - Sincronização automática com Supabase
 * - Refresh automático de tokens
 * - Logout consistente
 * - Hooks customizados para componentes
 * 
 * @author Equipe de Desenvolvimento
 * @version 1.0.0
 * @since 2024-01-XX
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../lib/supabaseClient';
import unifiedCookieManager from '../utils/unifiedCookieManager';
import unifiedLogout from '../utils/unifiedLogout';
import { logger } from '../utils/logger';

// Configurações
const CONFIG = {
  REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutos antes da expiração
  MAX_REFRESH_ATTEMPTS: 3,
  REFRESH_INTERVAL: 60 * 1000, // Verificar a cada minuto
  COOKIE_NAMES: {
    AUTH_TOKEN: 'authToken',
    REFRESH_TOKEN: 'refreshToken',
    SUPABASE_AUTH: 'supabase-auth-token'
  }
};

// Context
const AuthContext = createContext();

// Provider do Context
export const AuthProvider = ({ children }) => {
  // Estados
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [refreshAttempts, setRefreshAttempts] = useState(0);

  // Refs para controle de intervalos
  const refreshIntervalRef = useRef(null);
  const refreshAttemptsRef = useRef(0);

  /**
   * ==============================================
   * MÉTODOS DE UTILIDADE
   * ==============================================
   */

  // Obter token dos cookies (usando gerenciador unificado)
  const getTokenFromCookies = useCallback(() => {
    // Com cookies httpOnly, não é possível acessar diretamente
    // O token será obtido via requisições ao backend
    return null;
  }, []);

  // Obter refresh token dos cookies (usando gerenciador unificado)
  const getRefreshTokenFromCookies = useCallback(() => {
    // Com cookies httpOnly, não é possível acessar diretamente
    // O refresh token será obtido via requisições ao backend
    return null;
  }, []);

  // Verificar se token está próximo do vencimento
  const isTokenNearExpiry = useCallback((token) => {
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      const expiry = payload.exp;
      const timeUntilExpiry = (expiry - now) * 1000;
      
      return timeUntilExpiry < CONFIG.REFRESH_THRESHOLD;
    } catch (error) {
      logger.error('Erro ao verificar expiração do token:', error);
      return true; // Se não conseguir verificar, considerar como expirado
    }
  }, []);

  // Limpar estado de autenticação
  const clearAuthState = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
    setRefreshAttempts(0);
    refreshAttemptsRef.current = 0;
    
    // Limpar intervalos
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  /**
   * ==============================================
   * MÉTODOS DE AUTENTICAÇÃO
   * ==============================================
   */

  // Login
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      logger.info('Iniciando processo de login:', { email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        logger.error('Erro no login:', error);
        setError(error.message);
        return { success: false, error: error.message };
      }

      if (!data.user || !data.session) {
        setError('Dados de autenticação inválidos');
        return { success: false, error: 'Dados de autenticação inválidos' };
      }

      // Atualizar estado
      setUser(data.user);
      setIsAuthenticated(true);
      setRefreshAttempts(0);
      refreshAttemptsRef.current = 0;

      // Iniciar monitoramento de refresh
      startTokenRefreshMonitoring();

      logger.info('Login realizado com sucesso:', { userId: data.user.id });

      return { success: true, user: data.user };

    } catch (error) {
      logger.error('Erro inesperado no login:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      logger.info('Iniciando processo de logout');

      // Usar utilitário de logout unificado
      const result = await unifiedLogout.logout();

      if (result.success) {
        // Limpar estado local
        clearAuthState();
        logger.info('Logout realizado com sucesso');
      } else {
        logger.warn('Logout com avisos:', result.message);
        // Mesmo com avisos, limpar estado local
        clearAuthState();
      }

      return result;

    } catch (error) {
      logger.error('Erro inesperado no logout:', error);
      setError(error.message);
      
      // Em caso de erro, forçar limpeza
      clearAuthState();
      unifiedLogout.forceCleanup();
      
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [clearAuthState]);

  // Refresh automático de token
  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = getRefreshTokenFromCookies();
      if (!refreshToken) {
        logger.warn('Refresh token não encontrado');
        return { success: false, error: 'Refresh token não encontrado' };
      }

      // Verificar tentativas de refresh
      if (refreshAttemptsRef.current >= CONFIG.MAX_REFRESH_ATTEMPTS) {
        logger.warn('Máximo de tentativas de refresh atingido');
        await logout();
        return { success: false, error: 'Máximo de tentativas de refresh atingido' };
      }

      refreshAttemptsRef.current += 1;
      setRefreshAttempts(refreshAttemptsRef.current);

      logger.info('Tentando refresh do token:', { attempt: refreshAttemptsRef.current });

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error) {
        logger.error('Erro ao renovar token:', error);
        return { success: false, error: error.message };
      }

      if (!data.session) {
        logger.warn('Sessão não encontrada após refresh');
        return { success: false, error: 'Sessão não encontrada' };
      }

      // Atualizar estado
      setUser(data.user);
      setIsAuthenticated(true);
      setRefreshAttempts(0);
      refreshAttemptsRef.current = 0;

      logger.info('Token renovado com sucesso');

      return { success: true, user: data.user };

    } catch (error) {
      logger.error('Erro inesperado no refresh:', error);
      return { success: false, error: error.message };
    }
  }, [getRefreshTokenFromCookies, logout]);

  // Iniciar monitoramento de refresh de token
  const startTokenRefreshMonitoring = useCallback(() => {
    // Limpar intervalo anterior se existir
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Verificar a cada minuto usando Supabase
    refreshIntervalRef.current = setInterval(async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error || !data.session) {
          logger.warn('Sessão não encontrada durante monitoramento');
          await logout();
          return;
        }

        // Verificar se token está próximo do vencimento
        const token = data.session.access_token;
        if (isTokenNearExpiry(token)) {
          logger.info('Token próximo do vencimento, renovando automaticamente');
          const result = await refreshToken();
          if (!result.success) {
            logger.error('Falha no refresh automático:', result.error);
            await logout();
          }
        }
      } catch (error) {
        logger.error('Erro no monitoramento de token:', error);
        await logout();
      }
    }, CONFIG.REFRESH_INTERVAL);

    logger.info('Monitoramento de token iniciado');
  }, [isTokenNearExpiry, refreshToken, logout]);

  // Verificar sessão atual
  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        logger.error('Erro ao verificar sessão:', error);
        setError(error.message);
        return { success: false, error: error.message };
      }

      if (!data.session || !data.user) {
        logger.info('Nenhuma sessão ativa encontrada');
        clearAuthState();
        return { success: false, error: 'Nenhuma sessão ativa' };
      }

      // Atualizar estado
      setUser(data.user);
      setIsAuthenticated(true);
      setRefreshAttempts(0);
      refreshAttemptsRef.current = 0;

      // Iniciar monitoramento de refresh
      startTokenRefreshMonitoring();

      logger.info('Sessão verificada com sucesso:', { userId: data.user.id });

      return { success: true, user: data.user };

    } catch (error) {
      logger.error('Erro inesperado na verificação de sessão:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [clearAuthState, startTokenRefreshMonitoring]);

  /**
   * ==============================================
   * MÉTODOS DE MONITORAMENTO
   * ==============================================
   */

  // Parar monitoramento de refresh
  const stopTokenRefreshMonitoring = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
      logger.info('Monitoramento de token parado');
    }
  }, []);

  /**
   * ==============================================
   * EFEITOS
   * ==============================================
   */

  // Verificar sessão na inicialização
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Limpar intervalos na desmontagem
  useEffect(() => {
    return () => {
      stopTokenRefreshMonitoring();
    };
  }, [stopTokenRefreshMonitoring]);

  // Escutar mudanças de autenticação do Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.info('Mudança de estado de autenticação:', { event, hasSession: !!session });

        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              setUser(session.user);
              setIsAuthenticated(true);
              setRefreshAttempts(0);
              refreshAttemptsRef.current = 0;
              startTokenRefreshMonitoring();
            }
            break;

          case 'SIGNED_OUT':
            clearAuthState();
            stopTokenRefreshMonitoring();
            break;

          case 'TOKEN_REFRESHED':
            if (session?.user) {
              setUser(session.user);
              setRefreshAttempts(0);
              refreshAttemptsRef.current = 0;
            }
            break;

          case 'INITIAL_SESSION':
            // Evento inicial do Supabase - verificar se há sessão ativa
            if (session?.user) {
              logger.info('Sessão inicial encontrada:', { userId: session.user.id });
              setUser(session.user);
              setIsAuthenticated(true);
              setRefreshAttempts(0);
              refreshAttemptsRef.current = 0;
              startTokenRefreshMonitoring();
            } else {
              logger.info('Nenhuma sessão inicial encontrada');
              clearAuthState();
            }
            break;

          default:
            logger.warn('Evento de autenticação não tratado:', event);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [clearAuthState, startTokenRefreshMonitoring, stopTokenRefreshMonitoring]);

  /**
   * ==============================================
   * VALOR DO CONTEXT
   * ==============================================
   */

  const value = {
    // Estados
    user,
    loading,
    error,
    isAuthenticated,
    refreshAttempts,

    // Métodos
    login,
    logout,
    refreshToken,
    checkSession,

    // Utilitários
    clearError: () => setError(null),
    getToken: getTokenFromCookies,
    getRefreshToken: getRefreshTokenFromCookies
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar o context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
};

// Hook para verificar se usuário está autenticado
export const useRequireAuth = () => {
  const { isAuthenticated, loading } = useAuth();
  
  return { isAuthenticated, loading };
};

// Hook para obter dados do usuário
export const useUser = () => {
  const { user, loading } = useAuth();
  
  return { user, loading };
};

export default AuthContext;
