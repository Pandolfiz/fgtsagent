import { createClient } from '@supabase/supabase-js';

// Obter variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validar se as variáveis obrigatórias estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
}

// Determinar as URLs para redirecionamento
const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
const redirectUrl = `${siteUrl}/auth/callback`;

// Classe personalizada para persistência de tokens (SIMPLIFICADA)
class CustomStorage {
  constructor() {
    this.storage = localStorage;
    this.KEY_PREFIX = 'supabase-auth'; // ✅ CORRIGIDO: Usar mesma chave
  }

  getItem(key) {
    const value = this.storage.getItem(key);
    // Removido log excessivo que estava causando spam no console
    return value;
  }

  setItem(key, value) {
    console.log(`💾 CustomStorage.setItem(${key}):`, value ? '✅ Definindo' : '❌ Vazio');
    this.storage.setItem(key, value);
    
    // ✅ SINCRONIZAR: Token com localStorage principal (SIMPLIFICADO)
    try {
      const parsed = JSON.parse(value);
      if (parsed?.currentSession?.access_token) {
        localStorage.setItem('authToken', parsed.currentSession.access_token);
        console.log('✅ Token sincronizado com localStorage');
      }
    } catch (e) {
      console.warn('⚠️ Erro ao sincronizar token:', e);
    }
    
    return value;
  }

  removeItem(key) {
    console.log(`🗑️ CustomStorage.removeItem(${key})`);
    this.storage.removeItem(key);
    localStorage.removeItem('authToken');
    return null;
  }
}

// Opções de configuração para o cliente Supabase (SIMPLIFICADAS)
const supabaseOptions = {
  auth: {
    // ✅ CONFIGURAÇÕES ESSENCIAIS PARA PERSISTÊNCIA
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    redirectTo: redirectUrl,
    storage: new CustomStorage(),
    storageKey: 'supabase-auth', // ✅ CORRIGIDO: Usar mesma chave do backend
    site_url: siteUrl,
    clearHashAfterLogin: true,
    debug: false, // ✅ DESABILITAR DEBUG para evitar logs excessivos
    authTimeout: 30000,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-browser/2.x'
    }
  },
  realtime: {
    timeout: 60000
  }
};

// Criar e exportar o cliente
const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

console.log('✅ Cliente Supabase inicializado com sucesso');

// ✅ INTERCEPTOR SIMPLIFICADO: Apenas para adicionar token a requisições da API
export const setupApiInterceptor = () => {
  if (typeof window === 'undefined') return;
  
  const originalFetch = window.fetch;

  window.fetch = async (resource, options = {}) => {
    const url = resource.toString();
    
    // Não interceptar requisições para o Supabase
    if (url.includes(supabaseUrl)) {
      return originalFetch(resource, options);
    }

    // Não interceptar webhooks para n8n
    if (url.includes('n8n') || url.includes('webhook')) {
      return originalFetch(resource, options);
    }

    // Não interceptar requisições de autenticação
    if (url.includes('/auth/') || url.includes('/login') || url.includes('/register')) {
      return originalFetch(resource, options);
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
      console.warn('Erro ao obter sessão para interceptor:', e);
    }

    return originalFetch(resource, options);
  };

  console.log('✅ Interceptor de API configurado');
};

// Função para verificar a conexão com o Supabase
export const verifySupabaseConnection = async () => {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout ao verificar conexão')), 10000);
    });

    const checkConnection = async () => {
      try {
        // Usar uma tabela que sabemos que existe (user_profiles)
        const { error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true });

        if (error && error.code !== 'PGRST116') {
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
  return true;
};

// Executar verificação inicial de conexão
verifySupabaseConnection();

// Configurar interceptor automaticamente quando o cliente é inicializado
if (typeof window !== 'undefined') {
  setupApiInterceptor();
}

export default supabase;

