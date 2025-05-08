import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../utilities/apiFetch';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<string>('Processando autenticação...');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [details, setDetails] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{path: string, hash: string, search: string} | null>(null);

  useEffect(() => {
    // Para depuração - captura informações da URL
    setDebugInfo({
      path: location.pathname,
      hash: location.hash,
      search: location.search
    });

    async function processAuth() {
      try {
        // Verificar se temos um código na URL ou hash fragment
        const queryParams = new URLSearchParams(location.search);
        const code = queryParams.get('code');
        const errorParam = queryParams.get('error');

        // Verificar error nos parâmetros da URL
        if (errorParam) {
          setError(`Erro de autenticação: ${errorParam}`);
          setIsLoading(false);
          setTimeout(() => navigate('/login?error=' + encodeURIComponent(errorParam)), 3000);
          return;
        }

        // Verificar se temos um hash fragment (formato #access_token=...)
        if (location.hash) {
          setStatus('Token de acesso detectado, processando...');
          let hashParams: URLSearchParams;
          
          try {
            // Remover '#' do início do hash antes de passá-lo para URLSearchParams
            const cleanHash = location.hash.startsWith('#') ? location.hash.substring(1) : location.hash;
            hashParams = new URLSearchParams(cleanHash);
            
            // Para depuração
            console.log("Hash processado:", cleanHash);
            console.log("Parâmetros encontrados:", Array.from(hashParams.entries()));
          } catch (err) {
            console.error("Erro ao processar hash da URL:", err);
            setDetails(JSON.stringify({
              error: err,
              hash: location.hash,
              hashLength: location.hash.length
            }, null, 2));
            setError("Formato de token inválido na URL");
            setIsLoading(false);
            return;
          }

          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const expiresAt = hashParams.get('expires_at');
          const providerToken = hashParams.get('provider_token');

          if (accessToken) {
            // Salvar tokens no localStorage temporariamente
            localStorage.setItem('tempAccessToken', accessToken);
            if (refreshToken) localStorage.setItem('tempRefreshToken', refreshToken);
            if (expiresAt) localStorage.setItem('tempExpiresAt', expiresAt);

            // Enviar tokens para o backend para validar/criar sessão
            setStatus('Validando token...');
            try {
              const response = await apiFetch('/api/auth/process-token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                  expires_at: expiresAt,
                  provider_token: providerToken
                })
              });

              const data = await response.json();

              if (data.success) {
                // Remover tokens temporários
                localStorage.removeItem('tempAccessToken');
                localStorage.removeItem('tempRefreshToken');
                localStorage.removeItem('tempExpiresAt');
                
                // Salvar token definitivo ou cookie de sessão se o backend retornar
                if (data.token) localStorage.setItem('authToken', data.token);
                
                setStatus('Autenticação bem-sucedida! Redirecionando...');
                setIsLoading(false);
                setTimeout(() => navigate('/dashboard'), 1500);
              } else {
                throw new Error(data.message || 'Falha na autenticação');
              }
            } catch (err: any) {
              console.error("Erro ao validar token:", err);
              setError(`Erro ao validar credenciais: ${err.message || 'Erro desconhecido'}`);
              setIsLoading(false);
            }
          } else {
            setError('Token de acesso não encontrado na URL');
            setIsLoading(false);
          }
        } 
        // Verificar se temos um código de autorização
        else if (code) {
          setStatus('Código de autorização detectado, trocando por token...');
          try {
            // Enviar código para o backend trocar por token
            const response = await apiFetch('/api/auth/exchange-code', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ code })
            });

            const data = await response.json();

            if (data.success) {
              if (data.token) localStorage.setItem('authToken', data.token);
              setStatus('Autenticação bem-sucedida! Redirecionando...');
              setIsLoading(false);
              setTimeout(() => navigate('/dashboard'), 1500);
            } else {
              throw new Error(data.message || 'Falha ao trocar código por token');
            }
          } catch (err: any) {
            console.error("Erro ao trocar código por token:", err);
            setError(`Erro ao trocar código: ${err.message || 'Erro desconhecido'}`);
            setIsLoading(false);
          }
        } else {
          setError('Nenhum código ou token encontrado na URL');
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('Erro durante autenticação:', err);
        setError(err.message || 'Ocorreu um erro durante a autenticação');
        setDetails(JSON.stringify(err, null, 2));
        setIsLoading(false);
        setTimeout(() => navigate('/login?error=' + encodeURIComponent(err.message || 'erro_processamento')), 3000);
      }
    }

    processAuth();
  }, [navigate, location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="mb-6">
          {!error ? (
            <>
              <h2 className="text-2xl font-bold mb-2">{status}</h2>
              {isLoading && (
                <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mt-4"></div>
              )}
              {!isLoading && (
                <div className="text-green-400 text-5xl mb-4">
                  <i className="fas fa-check-circle"></i>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-red-500 mb-2">Erro de Autenticação</h2>
              <div className="text-red-400 text-5xl mb-4">
                <i className="fas fa-exclamation-circle"></i>
              </div>
              <p className="text-gray-300 mb-4">{error}</p>
              
              {(process.env.NODE_ENV === 'development' || true) && details && (
                <div className="mt-4 p-4 bg-gray-700 rounded overflow-auto text-left">
                  <details>
                    <summary className="cursor-pointer font-medium text-gray-300 mb-2">Detalhes técnicos</summary>
                    <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                      {details}
                    </pre>
                  </details>
                </div>
              )}

              {/* Informações de depuração de rota - visível mesmo em produção */}
              {debugInfo && (
                <div className="mt-4 p-4 bg-gray-700 rounded overflow-auto text-left">
                  <details>
                    <summary className="cursor-pointer font-medium text-gray-300 mb-2">Informações de URL</summary>
                    <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
              
              <p className="text-gray-400 mt-4">Redirecionando para página de login...</p>
            </>
          )}
          
          {/* Link para voltar ao login caso algo dê errado */}
          {error && (
            <div className="mt-6">
              <button 
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Voltar para o login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback; 