import { createClient } from '@supabase/supabase-js';

// Obter variáveis de ambiente ou usar valores do arquivo .env do backend
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uwcdaafcpezmzuveefrh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Y2RhYWZjcGV6bXp1dmVlZnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyNzE0MjMsImV4cCI6MjA2MDg0NzQyM30.LuXtP_WSFTaDj41_zlIiEM0UXKXIRPiBNxCyrFPzAos';

// Determinar as URLs para redirecionamento
const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
const redirectUrl = `${siteUrl}/auth/callback`;

// Log detalhado para depuração
console.log('Configuração do Supabase:', {
  url: supabaseUrl || 'AUSENTE',
  key: supabaseAnonKey ? 'PRESENTE' : 'AUSENTE',
  siteUrl,
  redirectUrl
});

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
          document.cookie = `supabase-auth-token=${parsed.access_token}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `js-auth-token=${parsed.access_token}; path=/; max-age=86400; SameSite=Lax`;
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
        document.cookie = `supabase-auth-token=${parsed.access_token}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `js-auth-token=${parsed.access_token}; path=/; max-age=86400; SameSite=Lax`;
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
    document.cookie = `supabase-auth-token=; path=/; max-age=0`;
    document.cookie = `js-auth-token=; path=/; max-age=0`;
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
  window.fetch = async (resource, options = {}) => {
    // Não interceptar requisições para o Supabase (ele já gerencia tokens)
    if (resource.toString().includes(supabaseUrl)) {
      return originalFetch(resource, options);
    }
    
    // Adicionar token de autenticação aos headers
    try {
      const session = await supabase.auth.getSession();
      if (session?.data?.session?.access_token) {
        const token = session.data.session.access_token;
        options.headers = options.headers || {};
        options.headers['Authorization'] = `Bearer ${token}`;
        console.log('Token adicionado à requisição:', resource);
      }
    } catch (e) {
      console.error('Erro ao obter sessão para interceptor:', e);
    }
    
    return originalFetch(resource, options);
  };
  
  console.log('Interceptor de API configurado com sucesso');
};

// Função melhorada para verificar a conexão com o Supabase
export const verifySupabaseConnection = async () => {
  try {
    console.log('Verificando conexão com o Supabase...');
    
    // Adicionar timeout para evitar que a verificação fique presa
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout ao verificar conexão')), 10000);
    });
    
    // Criar uma promessa para a verificação de conexão
    const checkPromise = new Promise(async (resolve) => {
      try {
        // Tentar fazer uma simples operação com o Supabase
        const { error } = await supabase.from('healthcheck').select('count', { count: 'exact', head: true });
        
        if (error && error.code !== 'PGRST116') { // PGRST116 é o código para "tabela não encontrada" e é esperado
          console.error('Erro ao verificar conexão com Supabase:', error.message);
          resolve({
            connected: false,
            error: error.message,
            status: error.code || 'ERROR'
          });
          return;
        }
        
        console.log('Conexão com o Supabase verificada com sucesso');
        resolve({
          connected: true,
          timestamp: new Date().toISOString(),
          status: 'OK'
        });
      } catch (err) {
        console.error('Exceção ao verificar conexão com Supabase:', err.message);
        resolve({
          connected: false,
          error: err.message,
          status: 'EXCEPTION'
        });
      }
    });
    
    // Usar Promise.race para detectar timeout
    return await Promise.race([checkPromise, timeoutPromise]);
  } catch (err) {
    console.error('Erro crítico ao verificar conexão com Supabase:', err.message);
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
verifySupabaseConnection().then(status => {
  console.log('Status da conexão Supabase:', status);
});

// Configurar interceptor automaticamente quando o cliente é inicializado
if (typeof window !== 'undefined') {
  setupApiInterceptor();
}

export default supabase;

