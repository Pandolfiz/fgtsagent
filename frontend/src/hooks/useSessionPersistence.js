import { useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabaseClient';

/**
 * Hook simplificado para gerenciar persistência de sessão
 * Foca apenas na funcionalidade essencial
 */
export const useSessionPersistence = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ FUNÇÃO: Obter token atual (memoizada)
  const getToken = useCallback(() => {
    return session?.access_token || localStorage.getItem('authToken');
  }, [session]);

  // ✅ FUNÇÃO: Verificar se está autenticado (memoizada)
  const isAuthenticated = useCallback(() => {
    return !!session && !!getToken();
  }, [session, getToken]);

  useEffect(() => {
    let mounted = true;
    let timeoutId = null;

    const initializeSession = async () => {
      try {
        if (!mounted) return;
        
        setLoading(true);
        setError(null);

        // ✅ PASSO 1: Verificar se já existe uma sessão ativa no Supabase
        console.log('🔄 Hook: Verificando sessão ativa no Supabase...');
        const { data: activeSession, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('⚠️ Hook: Erro ao obter sessão ativa:', sessionError.message);
          if (mounted) setError(sessionError.message);
          return;
        }

        if (activeSession?.session) {
          console.log('✅ Hook: Sessão ativa encontrada no Supabase');
          if (mounted) {
            // ✅ EVITAR: Atualizações desnecessárias se a sessão é a mesma
            setSession(prevSession => {
              if (prevSession?.access_token === activeSession.session.access_token) {
                // Removido log excessivo
                return prevSession; // Não atualizar se é o mesmo token
              }
              // Removido log excessivo
              return activeSession.session;
            });
          }
          
          // ✅ SINCRONIZAR: Token com localStorage
          const token = activeSession.session.access_token;
          localStorage.setItem('authToken', token);
          
          if (mounted) setLoading(false);
          return;
        }

        // ✅ PASSO 2: Se não há sessão ativa, verificar localStorage
        console.log('🔄 Hook: Verificando localStorage para tokens salvos...');
        const storedAuthToken = localStorage.getItem('authToken');
        
        if (storedAuthToken) {
          console.log('✅ Hook: Token encontrado no localStorage, validando...');
          
          // ✅ VALIDAR: Token com Supabase
          const { data: validationData, error: validationError } = await supabase.auth.getUser(storedAuthToken);
          
          if (validationError) {
            console.warn('⚠️ Hook: Token inválido, removendo...');
            localStorage.removeItem('authToken');
            if (mounted) setSession(null);
          } else if (validationData?.user) {
            console.log('✅ Hook: Token válido, recuperando sessão...');
            
            // ✅ RECUPERAR: Sessão completa
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            
            if (!sessionError && sessionData?.session) {
              if (mounted) setSession(sessionData.session);
            }
          }
        }

        if (mounted) setLoading(false);
        
      } catch (err) {
        console.error('❌ Hook: Erro na inicialização da sessão:', err);
        if (mounted) setError(err.message);
        if (mounted) setLoading(false);
      }
    };

    // ✅ PASSO 3: Configurar listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log(`🔄 Hook: Evento de autenticação: ${event}`, session ? 'com sessão' : 'sem sessão');
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // ✅ EVITAR: Atualizações desnecessárias se a sessão é a mesma
          setSession(prevSession => {
            if (prevSession?.access_token === session?.access_token) {
              console.log('🔄 Hook: Evento de autenticação - mesmo token, evitando atualização');
              return prevSession; // Não atualizar se é o mesmo token
            }
            console.log('🔄 Hook: Evento de autenticação - token diferente, atualizando sessão');
            return session;
          });
          setError(null);
          
          if (session?.access_token) {
            // ✅ SINCRONIZAR: Token com localStorage
            localStorage.setItem('authToken', session.access_token);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('🔄 Hook: Usuário fez logout, limpando sessão...');
          setSession(null);
          setError(null);
          
          // ✅ LIMPEZA COMPLETA: Quando explicitamente solicitado
          localStorage.removeItem('authToken');
          localStorage.removeItem('supabase.auth.token');
          
          // ✅ FORÇAR: Limpeza de todos os dados relacionados
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('auth') || key.includes('supabase') || key.includes('user'))) {
              keysToRemove.push(key);
            }
          }
          
          keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`🗑️ Hook: Removido ${key} do localStorage`);
          });
          
          console.log('✅ Hook: Sessão completamente limpa');
        }
      }
    );

    // ✅ TIMEOUT DE SEGURANÇA: Aumentado para evitar limpeza prematura
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ Hook: Timeout de segurança - forçando finalização');
        setLoading(false);
      }
    }, 30000); // 30 segundos

    initializeSession();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []);

  // ✅ FUNÇÃO: Forçar refresh da sessão
  const refreshSession = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        setError(error.message);
        return false;
      }
      
      if (data?.session) {
        setSession(data.session);
        setError(null);
        return true;
      }
      
      return false;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNÇÃO: Forçar limpeza completa da sessão
  const forceClearSession = useCallback(() => {
    console.log('🔄 Hook: Forçando limpeza completa da sessão...');
    
    // Limpar estado local
    setSession(null);
    setError(null);
    
    // Limpar localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('supabase.auth.token');
    
    // Limpar todos os dados relacionados
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('auth') || key.includes('supabase') || key.includes('user'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Hook: Removido ${key} do localStorage`);
    });
    
    console.log('✅ Hook: Sessão forçadamente limpa');
  }, []);

  return {
    session,
    loading,
    error,
    refreshSession,
    getToken,
    isAuthenticated,
    forceClearSession, // ✅ NOVA FUNÇÃO
  };
};
