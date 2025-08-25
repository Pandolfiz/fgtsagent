import React, { useMemo } from 'react';
import { useSessionPersistence } from '../hooks/useSessionPersistence';

/**
 * Componente de debug para verificar o estado da sessão
 * Útil para identificar problemas de autenticação
 */
export const SessionDebugPanel = () => {
  const { session, loading, error, getToken, isAuthenticated } = useSessionPersistence();

  // ✅ MEMOIZAR: Informações do localStorage para evitar recálculos
  const localStorageInfo = useMemo(() => {
    const supabaseToken = localStorage.getItem('supabase.auth.token');
    const authToken = localStorage.getItem('authToken');
    
    try {
      const parsed = supabaseToken ? JSON.parse(supabaseToken) : null;
      return {
        supabaseToken: supabaseToken ? 'PRESENTE' : 'AUSENTE',
        authToken: authToken ? 'PRESENTE' : 'AUSENTE',
        parsed: parsed ? {
          hasCurrentSession: !!parsed.currentSession,
          hasAccessToken: !!parsed.currentSession?.access_token,
          tokenStart: parsed.currentSession?.access_token?.substring(0, 20) || 'N/A'
        } : 'N/A'
      };
    } catch (e) {
      return { error: e.message };
    }
  }, [session]); // Só recalcular quando a sessão mudar

  // ✅ MEMOIZAR: Informações dos cookies para evitar recálculos
  const cookiesInfo = useMemo(() => {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
    };

    return {
      supabaseAuthToken: getCookie('supabase-auth-token') ? 'PRESENTE' : 'AUSENTE',
      jsAuthToken: getCookie('js-auth-token') ? 'PRESENTE' : 'AUSENTE'
    };
  }, [session]); // Só recalcular quando a sessão mudar

  if (loading) {
    return (
      <div className="fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded z-50">
        <div className="font-bold">🔄 Carregando Sessão...</div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded z-50 max-w-md">
      <div className="font-bold mb-2">🔍 Debug de Sessão</div>
      
      <div className="text-sm space-y-1">
        <div><strong>Estado:</strong> {isAuthenticated() ? '✅ Autenticado' : '❌ Não Autenticado'}</div>
        <div><strong>Sessão:</strong> {session ? '✅ Presente' : '❌ Ausente'}</div>
        <div><strong>Token:</strong> {getToken() ? '✅ Presente' : '❌ Ausente'}</div>
        
        {error && (
          <div className="text-red-600">
            <strong>Erro:</strong> {error}
          </div>
        )}
        
        <div className="mt-2 pt-2 border-t border-gray-300">
          <div className="font-semibold">LocalStorage:</div>
          <div className="text-xs">
            <div>Supabase: {localStorageInfo.supabaseToken}</div>
            <div>AuthToken: {localStorageInfo.authToken}</div>
            {localStorageInfo.parsed !== 'N/A' && (
              <div>Parsed: {JSON.stringify(localStorageInfo.parsed)}</div>
            )}
          </div>
        </div>
        
        <div className="mt-2 pt-2 border-t border-gray-300">
          <div className="font-semibold">Cookies:</div>
          <div className="text-xs">
            <div>Supabase: {cookiesInfo.supabaseAuthToken}</div>
            <div>JS: {cookiesInfo.jsAuthToken}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
