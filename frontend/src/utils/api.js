import axios from 'axios';

// Configuração da base URL da API
const getApiBaseUrl = () => {
  // Em desenvolvimento (Vite dev server)
  if (import.meta.env.DEV) {
    // O proxy do Vite redireciona /api -> http://localhost:3000/api
    // Usar /api como base URL para que o proxy funcione corretamente
    return '/api';
  }

  // Em produção - sempre usar /api como prefixo
  // O nginx vai fazer o proxy para o backend
  return '/api';
};

// Criar instância do axios com configuração
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000, // ✅ AUMENTADO: 30 segundos para evitar timeouts prematuros
  headers: {
    'Content-Type': 'application/json',
  }
});

// ✅ INTERCEPTOR: Adicionar token de autorização automaticamente
api.interceptors.request.use(
  async (config) => {
    try {
      // ✅ OBTER: Token do Supabase ou localStorage
      let authToken = localStorage.getItem('authToken');
      
      if (!authToken) {
        // Tentar obter do supabase-auth
        const supabaseAuth = localStorage.getItem('supabase-auth');
        if (supabaseAuth) {
          try {
            const parsed = JSON.parse(supabaseAuth);
            if (parsed?.currentSession?.access_token) {
              authToken = parsed.currentSession.access_token;
              // Sincronizar com localStorage principal
              localStorage.setItem('authToken', authToken);
            }
          } catch (e) {
            console.warn('⚠️ Erro ao parsear supabase-auth:', e);
          }
        }
      }
      
      // ✅ ADICIONAR: Token ao header de autorização
      if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
        console.log('🔐 Token adicionado ao request:', authToken.substring(0, 20) + '...');
      } else {
        console.warn('⚠️ Nenhum token de autenticação encontrado');
      }
    } catch (error) {
      console.error('❌ Erro no interceptor de autenticação:', error);
    }
    
    // ✅ LOGS: Em desenvolvimento
    if (import.meta.env.DEV) {
      console.log('🚀 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        hasAuth: !!config.headers.Authorization
      });
    }
    
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// ✅ INTERCEPTOR: Resposta da API
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    // ✅ MELHORADO: Tratamento específico para diferentes tipos de erro
    if (error.code === 'ECONNABORTED') {
      console.error('❌ API Timeout Error:', {
        url: error.config?.url,
        timeout: error.config?.timeout,
        message: 'Request timeout - servidor pode estar sobrecarregado'
      });
    } else if (error.response) {
      console.error('❌ API Response Error:', {
        status: error.response.status,
        url: error.config?.url,
        message: error.message,
        data: error.response?.data
      });
    } else if (error.request) {
      console.error('❌ API Network Error:', {
        url: error.config?.url,
        message: 'Sem resposta do servidor - verificar conectividade'
      });
    } else {
      console.error('❌ API Unknown Error:', {
        url: error.config?.url,
        message: error.message
      });
    }
    
    return Promise.reject(error);
  }
);

export default api;