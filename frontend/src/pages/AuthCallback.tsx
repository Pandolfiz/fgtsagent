import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../utilities/apiFetch';
import supabase from '../lib/supabaseClient';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<string>('Processando autenticação...');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [details, setDetails] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{path: string, hash: string, search: string, origin: string, hostname: string} | null>(null);

  useEffect(() => {
    // Para depuração - captura informações da URL
    setDebugInfo({
      path: location.pathname,
      hash: location.hash,
      search: location.search,
      origin: window.location.origin,
      hostname: window.location.hostname
    });
    
    console.log("AuthCallback - Iniciando processamento. URL:", {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      hostname: window.location.hostname,
      origin: window.location.origin,
      href: window.location.href
    });

    async function processAuth() {
      try {
        console.log("Iniciando processamento de autenticação...");
        
        // Para domínio de produção
        const isProduction = window.location.hostname === 'fgtsagent.com.br' || window.location.hostname === 'www.fgtsagent.com.br';
        console.log(`Ambiente detectado: ${isProduction ? 'Produção' : 'Desenvolvimento'}`);
        
        // Verificar se temos um código ou hash na URL
        const queryParams = new URLSearchParams(location.search);
        const code = queryParams.get('code');
        const errorParam = queryParams.get('error');
        const accessToken = queryParams.get('access_token');

        console.log("Parâmetros da URL:", { 
          code: code ? `${code.substring(0, 5)}...` : 'ausente', 
          error: errorParam || 'ausente',
          accessToken: accessToken ? 'presente' : 'ausente',
          hasHash: !!location.hash
        });
        
        // Definir função para redirecionar ao dashboard
        const redirectToDashboard = () => {
          console.log("Redirecionando para o dashboard...");
          // Verificar se há um redirecionamento personalizado em localStorage
          const redirectTo = localStorage.getItem('redirectAfterLogin');
          const targetPath = redirectTo || '/dashboard';
          
          // Limpar possível redirecionamento salvo
          if (redirectTo) localStorage.removeItem('redirectAfterLogin');
          
          // Usar replace para evitar que o usuário volte para a página de callback
          setStatus('Autenticação bem-sucedida! Redirecionando...');
          setIsLoading(false);
          setTimeout(() => navigate(targetPath, { replace: true }), 1000);
        };
        
        // Tentar obter sessão existente primeiro
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          console.log("Sessão Supabase já existente:", sessionData.session.user.email);
          // Salvar tokens em cookies para garantir
          document.cookie = `authToken=${sessionData.session.access_token}; path=/; max-age=${60*60*24}; secure; samesite=strict;`;
          
          localStorage.setItem('auth.user', JSON.stringify(sessionData.session.user));
          localStorage.setItem('auth.token', sessionData.session.access_token);
          
          redirectToDashboard();
          return;
        }

        // Verificar error nos parâmetros da URL
        if (errorParam) {
          setError(`Erro de autenticação: ${errorParam}`);
          setIsLoading(false);
          setTimeout(() => navigate('/login?error=' + encodeURIComponent(errorParam)), 3000);
          return;
        }

        // Se temos access_token diretamente como query param (raro, mas possível)
        if (accessToken) {
          console.log("Token de acesso encontrado nos parâmetros da URL");
          try {
            // Tentar configurar a sessão com o token diretamente
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: queryParams.get('refresh_token') || ''
            });
            
            if (error) throw error;
            if (data.session) {
              console.log("Sessão configurada com token da URL");
              document.cookie = `authToken=${data.session.access_token}; path=/; max-age=${60*60*24}; secure; samesite=strict;`;
              localStorage.setItem('auth.token', data.session.access_token);
              localStorage.setItem('auth.user', JSON.stringify(data.session.user));
              
              redirectToDashboard();
              return;
            }
          } catch (tokenError: any) {
            console.error("Erro ao processar token da URL:", tokenError);
          }
        }

        // Verificar se temos um hash fragment (formato #access_token=...)
        if (location.hash) {
          setStatus('Token de acesso detectado no hash, processando...');
          
          try {
            console.log('Processando hash fragment de autenticação');
            
            // Extrair os tokens do hash
            const hashParams = new URLSearchParams(location.hash.substring(1));
            const hashAccessToken = hashParams.get('access_token');
            const hashRefreshToken = hashParams.get('refresh_token');
            
            if (hashAccessToken) {
              console.log("Token extraído do hash, tentando configurar sessão");
              
              // Tentar configurar a sessão com o token extraído
              const { data, error } = await supabase.auth.setSession({
                access_token: hashAccessToken,
                refresh_token: hashRefreshToken || ''
              });
              
              if (error) throw error;
              
              if (data.session) {
                console.log("Sessão configurada com token do hash");
                // Definir cookie para garantir que o token está disponível para o backend
                document.cookie = `authToken=${data.session.access_token}; path=/; max-age=${60*60*24}; secure; samesite=strict;`;
                localStorage.setItem('auth.token', data.session.access_token);
                localStorage.setItem('auth.user', JSON.stringify(data.session.user));
                
                redirectToDashboard();
                return;
              }
            }
            
            // Se chegamos aqui, não conseguimos processar o hash diretamente
            // Vamos aguardar o Supabase processar automaticamente
            console.log("Aguardando processamento automático do hash pelo Supabase...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verificar novamente se a sessão foi criada
            const { data, error } = await supabase.auth.getSession();
            
            if (error) {
              throw new Error(`Erro ao recuperar sessão: ${error.message}`);
            }
            
            if (data?.session) {
              console.log('Sessão recuperada com sucesso através do processamento automático');
              document.cookie = `authToken=${data.session.access_token}; path=/; max-age=${60*60*24}; secure; samesite=strict;`;
              localStorage.setItem('auth.token', data.session.access_token);
              localStorage.setItem('auth.user', JSON.stringify(data.session.user));
              
              redirectToDashboard();
              return;
            }
            
            throw new Error('Nenhuma sessão encontrada após autenticação com hash fragment');
          } catch (hashError: any) {
            console.error('Erro no processamento do hash:', hashError);
            setError(`Erro no processamento da autenticação: ${hashError.message}`);
            setIsLoading(false);
          }
        } 
        // Verificar se temos um código de autorização
        else if (code) {
          setStatus('Código de autorização detectado, finalizando login...');
          try {
            console.log('Trocando código de autorização por sessão:', code.substring(0, 10) + '...');
            
            // Tenta trocar o código diretamente pelo Supabase
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            
            if (error) {
              console.error('Erro ao trocar código via Supabase:', error);
              
              // Se falhar e estivermos em fgtsagent.com.br, tentar via backend
              if (isProduction) {
                console.log('Tentando trocar código via backend...');
                const response = await fetch('/api/auth/exchange-code', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ code })
                });

                if (!response.ok) {
                  throw new Error(`Erro ao trocar código via backend: ${response.status}`);
                }

                const responseData = await response.json();
                
                if (responseData.success) {
                  console.log('Código trocado com sucesso via backend');
                  
                  if (responseData.session) {
                    // Salvar tokens recebidos do backend
                    document.cookie = `authToken=${responseData.session.access_token}; path=/; max-age=${60*60*24}; secure; samesite=strict;`;
                    localStorage.setItem('auth.token', responseData.session.access_token);
                    localStorage.setItem('auth.user', JSON.stringify(responseData.session.user || {}));
                  }
                  
                  redirectToDashboard();
                  return;
                } else {
                  throw new Error(responseData.message || 'Falha ao trocar código por token');
                }
              } else {
                throw error;
              }
            }
            
            if (data?.session) {
              console.log('Sessão criada com sucesso após troca de código via Supabase');
              
              // Salvando tokens em múltiplos lugares para garantir
              // Cookies para o backend
              document.cookie = `authToken=${data.session.access_token}; path=/; max-age=${60*60*24}; secure; samesite=strict;`;
              // localStorage para o frontend
              localStorage.setItem('auth.token', data.session.access_token);
              localStorage.setItem('auth.user', JSON.stringify(data.session.user));
              
              redirectToDashboard();
              return;
            }
            
          } catch (err: any) {
            console.error("Erro ao trocar código por token:", err);
            setError(`Erro ao trocar código: ${err.message || 'Erro desconhecido'}`);
            setIsLoading(false);
          }
        } else {
          // Nenhum código ou token encontrado
          setError('Nenhum código ou token encontrado na URL');
          setIsLoading(false);
          
          // Verificar se o usuário já está autenticado de outra forma
          setTimeout(async () => {
            const { data } = await supabase.auth.getUser();
            if (data?.user) {
              console.log("Usuário já autenticado:", data.user.email);
              navigate('/dashboard', { replace: true });
            }
          }, 2000);
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
              
              {details && (
                <div className="mt-4 p-4 bg-gray-700 rounded overflow-auto text-left">
                  <details>
                    <summary className="cursor-pointer font-medium text-gray-300 mb-2">Detalhes técnicos</summary>
                    <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                      {details}
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