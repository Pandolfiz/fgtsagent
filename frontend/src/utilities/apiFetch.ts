export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  try {
    const res = await fetch(input, { ...init, credentials: 'include' });
    
    // Verificar se é erro de autenticação (401) ou autorização (403)
    if (res.status === 401 || res.status === 403) {
      console.error('Sessão expirada ou autenticação inválida');

      // Tentar renovar o token uma vez (se não estivermos já na página de login)
      if (!window.location.pathname.includes('/login')) {
        // Antes de redirecionar, tente renovar o token uma vez
        let tokenRenewed = false;
        
        try {
          console.log('Tentando renovar o token...');
          const refreshResponse = await fetch('/api/auth/refresh-token', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (refreshResponse.ok) {
            // Token renovado com sucesso, tentar a requisição original novamente
            console.log('Token renovado com sucesso, tentando requisição novamente');
            tokenRenewed = true;
            return fetch(input, { ...init, credentials: 'include' });
          } else {
            // Analisa a resposta para identificar os tipos específicos de erro
            try {
              const errorData = await refreshResponse.json();
              console.error('Detalhes do erro de renovação:', errorData);
              
              if (errorData.message?.includes('supabaseAdmin.auth.admin.createSession')) {
                console.error('Erro específico de sessão do Supabase detectado');
              }
            } catch (parseError) {
              console.warn('Não foi possível analisar detalhes do erro:', parseError);
            }
            
            console.error('Falha ao renovar token, redirecionando para login');
          }
        } catch (refreshError) {
          console.error('Erro ao tentar renovar token:', refreshError);
        }
        
        if (!tokenRenewed) {
          // O token não foi renovado, limpar tudo e redirecionar
          
          // Salvar a URL atual para redirecionamento pós-login
          localStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
          
          // Limpar todos os possíveis tokens para garantir que não fique em um loop
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('supabase_tokens');
          localStorage.removeItem('authToken');
          document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'js-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          
          // Redirecionar para login com mensagem explicativa
          const redirectUrl = '/login?error=session_expired&message=Sua sessão expirou. Por favor faça login novamente.';
          console.log('Redirecionando para:', redirectUrl);
          
          // Usar replace para evitar que o usuário possa voltar para a página que exigia autenticação
          window.location.replace(redirectUrl);
          
          // Retornar uma nova resposta para evitar processamento adicional
          return new Response(JSON.stringify({ error: 'Redirecionando para login' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Retornar resposta para interromper o fluxo
      return res;
    }
    
    return res;
  } catch (error) {
    console.error('Erro na requisição:', error);
    
    // Se o erro indicar problema de rede, podemos considerar um problema de autenticação
    if (error instanceof TypeError && error.message.includes('network')) {
      console.warn('Erro de rede detectado, verificando autenticação...');
      
      // Verificar se o usuário está em uma página protegida
      const currentPath = window.location.pathname;
      const isProtectedPage = !isPublicPath(currentPath);
      
      if (isProtectedPage) {
        // Tentar renovar o token antes de redirecionar
        try {
          const refreshResponse = await fetch('/api/auth/refresh-token', {
            method: 'POST',
            credentials: 'include'
          });
          
          if (!refreshResponse.ok) {
            // Falha na renovação, redirecionar para login
            localStorage.setItem('redirectAfterLogin', currentPath + window.location.search);
            window.location.replace('/login?error=connection&message=Problema de conexão. Por favor, faça login novamente.');
          }
        } catch (refreshError) {
          localStorage.setItem('redirectAfterLogin', currentPath + window.location.search);
          window.location.replace('/login?error=connection&message=Problema de conexão. Por favor, faça login novamente.');
        }
      }
    }
    
    return new Response(JSON.stringify({ error: 'Erro de conexão' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Função auxiliar para verificar se o caminho é público (não requer autenticação)
function isPublicPath(path: string): boolean {
  const publicPaths = [
    '/login',
    '/auth/login',
    '/signup',
    '/auth/signup',
    '/reset-password',
    '/auth/reset-password',
    '/privacy',
    '/terms',
    '/',
    '/auth/callback',
    '/auth/confirm'
  ];
  
  return publicPaths.some(publicPath => path === publicPath || path.startsWith(publicPath));
} 