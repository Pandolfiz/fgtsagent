import { createClient } from '@supabase/supabase-js';

// Obter variáveis de ambiente ou usar valores do arquivo .env do backend
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validar se as variáveis obrigatórias estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
}

// Determinar as URLs para redirecionamento
const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
const redirectUrl = `${siteUrl}/auth/callback`;



// Verificar se as variáveis de ambiente estão presentes
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[ERRO CRÍTICO] Variáveis de ambiente do Supabase não estão definidas:');
  console.error('- VITE_SUPABASE_URL:', supabaseUrl ? 'OK' : 'AUSENTE');
  console.error('- VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'OK' : 'AUSENTE');
}

// Classe personalizada para persistência de tokens
class CustomStorage {
  constructor() {
    this.storage = localStorage;
    this.KEY_PREFIX = 'supabase.auth.token';
  }

  getItem(key) {
    const value = this.storage.getItem(key);
    if (value) {
      // Também armazenar no cookie para que o backend tenha acesso
      try {
        const parsed = JSON.parse(value);
        if (parsed?.access_token) {
          document.cookie = `supabase-auth-token=${parsed.access_token}; path=/; max-age=86400; SameSite=Strict; Secure`;
          document.cookie = `js-auth-token=${parsed.access_token}; path=/; max-age=86400; SameSite=Strict; Secure`;
        }
      } catch (e) {
        console.error('Erro ao processar token para cookie:', e);
      }
    }
    return value;
  }

  setItem(key, value) {
    this.storage.setItem(key, value);
    // Também armazenar no cookie para que o backend tenha acesso
    try {
      const parsed = JSON.parse(value);
      if (parsed?.access_token) {
        document.cookie = `supabase-auth-token=${parsed.access_token}; path=/; max-age=86400; SameSite=Strict; Secure`;
        document.cookie = `js-auth-token=${parsed.access_token}; path=/; max-age=86400; SameSite=Strict; Secure`;
        // Armazenar token separadamente para facilitar o acesso
        this.storage.setItem('authToken', parsed.access_token);
      }
    } catch (e) {
      console.error('Erro ao processar token para cookie:', e);
    }
    return value;
  }

  removeItem(key) {
    this.storage.removeItem(key);
    this.storage.removeItem('authToken');
    document.cookie = `supabase-auth-token=; path=/; max-age=0; SameSite=Strict; Secure`;
    document.cookie = `js-auth-token=; path=/; max-age=0; SameSite=Strict; Secure`;
    return null;
  }
}

// Opções de configuração para o cliente Supabase
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Definir explicitamente o fluxo PKCE conforme a documentação
    flowType: 'pkce',
    // URLs de redirecionamento
    redirectTo: redirectUrl,
    // Armazenamento personalizado para tokens
    storage: new CustomStorage(),
    // Configurações de cookies
    storageKey: 'supabase.auth.token',
    // Definir site URL
    site_url: siteUrl,
    // Remover hash automaticamente após autenticação
    // para evitar erros de formatação da URL
    clearHashAfterLogin: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-browser/2.x'
    }
  },
  // Aumentar o timeout para ambientes com conexão lenta
  realtime: {
    timeout: 60000 // 60 segundos
  }
};

// Criar e exportar o cliente
const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

console.log('Cliente Supabase inicializado com sucesso');

// Configurar interceptor para adicionar token a todas as requisições
// Isso é importante para garantir que o token seja enviado em todas as requisições
export const setupApiInterceptor = () => {
  // Remover interceptor anterior se existir
  const originalFetch = window.fetch;

  // Controle de requisições ativas para limpeza
  const activeRequests = new Set();

  window.fetch = async (resource, options = {}) => {
    // Não interceptar requisições para o Supabase (ele já gerencia tokens)
    if (resource.toString().includes(supabaseUrl)) {
      return originalFetch(resource, options);
    }

    // Não interceptar webhooks para n8n (sem timeout para webhooks assíncronos)
    if (resource.toString().includes('n8n') || resource.toString().includes('webhook')) {
      return originalFetch(resource, options);
    }

    // Adicionar timeout padrão se não especificado
    const timeoutMs = options.timeout || 30000; // 30 segundos padrão

    // Criar AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    // Adicionar signal ao options se não existe
    if (!options.signal) {
      options.signal = controller.signal;
    }

    // Adicionar token de autenticação aos headers
    try {
      const session = await supabase.auth.getSession();
      if (session?.data?.session?.access_token) {
        const token = session.data.session.access_token;
        options.headers = options.headers || {};
        options.headers['Authorization'] = `Bearer ${token}`;

      }
    } catch (e) {
      console.error('Erro ao obter sessão para interceptor:', e);
    }

    // Criar requisição única para rastreamento
    const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    activeRequests.add(requestId);

    try {
      const response = await originalFetch(resource, options);

      // Limpar timeout se a requisição foi bem-sucedida
      clearTimeout(timeoutId);
      activeRequests.delete(requestId);

      return response;
    } catch (error) {
      // Limpar timeout e rastreamento
      clearTimeout(timeoutId);
      activeRequests.delete(requestId);

      // Verificar se foi abortado por timeout
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout: ${resource} exceeded ${timeoutMs}ms`);
      }

      throw error;
    }
  };

  // Função para limpar todas as requisições ativas
  window.clearAllActiveRequests = () => {
    activeRequests.clear();
  };

  // Cleanup em visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.clearAllActiveRequests();
    }
  });

  // Cleanup em beforeunload
  window.addEventListener('beforeunload', () => {
    window.clearAllActiveRequests();
  });


};

// Função melhorada para verificar a conexão com o Supabase
export const verifySupabaseConnection = async () => {
  try {
    // Adicionar timeout para evitar que a verificação fique presa
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout ao verificar conexão')), 10000);
    });

    // Criar uma função assíncrona para a verificação de conexão
    const checkConnection = async () => {
      try {
        // Tentar fazer uma simples operação com o Supabase
        const { error } = await supabase.from('healthcheck').select('count', { count: 'exact', head: true });

        if (error && error.code !== 'PGRST116') { // PGRST116 é o código para "tabela não encontrada" e é esperado
          return {
            connected: false,
            error: error.message,
            status: error.code || 'ERROR'
          };
        }

        return {
          connected: true,
          timestamp: new Date().toISOString(),
          status: 'OK'
        };
      } catch (err) {
        // Em caso de exceção crítica, jogar o erro para ser tratado no nível superior
        if (err.name === 'TypeError' || err.name === 'NetworkError') {
          throw err;
        } else {
          return {
            connected: false,
            error: err.message,
            status: 'EXCEPTION'
          };
        }
      }
    };

    // Usar Promise.race para detectar timeout
    return await Promise.race([checkConnection(), timeoutPromise]);
  } catch (err) {
    return {
      connected: false,
      error: `Erro crítico: ${err.message}`,
      status: 'CRITICAL'
    };
  }
};

// Verificar se o navegador está online
export const checkOnlineStatus = () => {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  return true; // Assumir online se não puder verificar
};

// Executar verificação inicial de conexão
verifySupabaseConnection();

// Configurar interceptor automaticamente quando o cliente é inicializado
if (typeof window !== 'undefined') {
  setupApiInterceptor();
}

export default supabase;

