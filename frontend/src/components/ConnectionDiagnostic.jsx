import { useState } from 'react';
import { checkSupabaseConnection } from '../lib/oauthHandler';
import { checkOnlineStatus } from '../lib/supabaseClient';

export default function ConnectionDiagnostic({ onClose }) {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState(null);

  const runDiagnostic = async () => {
    setIsChecking(true);
    setResults(null);

    try {
      // 1. Verificar se o navegador está online
      const isOnline = checkOnlineStatus();
      
      // 2. Verificar a conexão com o Supabase
      let supabaseStatus = null;
      
      if (isOnline) {
        supabaseStatus = await checkSupabaseConnection();
      }
      
      // 3. Verificar status da rede
      const networkInfo = {
        type: navigator.connection ? navigator.connection.effectiveType : 'desconhecido',
        downlink: navigator.connection ? navigator.connection.downlink : 'desconhecido',
        rtt: navigator.connection ? navigator.connection.rtt : 'desconhecido'
      };
      
      setResults({
        timestamp: new Date().toISOString(),
        browser: {
          online: isOnline,
          userAgent: navigator.userAgent
        },
        network: networkInfo,
        supabase: supabaseStatus || { connected: false, error: 'Navegador offline' }
      });
    } catch (err) {
      setResults({
        error: err.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Diagnóstico de Conexão</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!results && !isChecking && (
          <div className="text-center py-4">
            <p className="mb-4">Clique no botão abaixo para verificar sua conexão com o Supabase.</p>
            <button 
              onClick={runDiagnostic}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Verificar Conexão
            </button>
          </div>
        )}

        {isChecking && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Verificando conexão...</p>
          </div>
        )}

        {results && !isChecking && (
          <div className="space-y-4">
            <div className={`p-3 rounded-lg ${results.supabase?.connected ? 'bg-green-100' : 'bg-red-100'}`}>
              <h3 className="font-bold mb-1">Status da Conexão:</h3>
              <p className={results.supabase?.connected ? 'text-green-700' : 'text-red-700'}>
                {results.supabase?.connected 
                  ? '✅ Conectado ao Supabase' 
                  : `❌ Problema de conexão: ${results.supabase?.error || 'Erro desconhecido'}`}
              </p>
            </div>

            <div className="border p-3 rounded-lg">
              <h3 className="font-bold mb-1">Status do Navegador:</h3>
              <p className={results.browser?.online ? 'text-green-700' : 'text-red-700'}>
                {results.browser?.online 
                  ? '✅ Navegador Online' 
                  : '❌ Navegador Offline'}
              </p>
            </div>

            {results.network && (
              <div className="border p-3 rounded-lg">
                <h3 className="font-bold mb-1">Dados da Rede:</h3>
                <ul className="text-sm">
                  <li>Tipo de Conexão: {results.network.type}</li>
                  <li>Velocidade Estimada: {results.network.downlink} Mbps</li>
                  <li>Latência (RTT): {results.network.rtt} ms</li>
                </ul>
              </div>
            )}

            <div className="mt-4 text-right">
              <button 
                onClick={runDiagnostic}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Verificar Novamente
              </button>
            </div>
          </div>
        )}

        {results && results.error && (
          <div className="bg-red-100 p-3 rounded-lg">
            <h3 className="font-bold text-red-700">Erro no diagnóstico:</h3>
            <p>{results.error}</p>
          </div>
        )}
      </div>
    </div>
  );
} 