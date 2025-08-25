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

// Interceptor para logs em desenvolvimento
if (import.meta.env.DEV) {
  api.interceptors.request.use(
    (config) => {
      // ✅ CORRIGIR: Não duplicar URLs - o proxy já faz o redirecionamento
      // Remover a lógica que estava causando duplicação de /api
      
      console.log('🚀 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`
      });
      return config;
    },
    (error) => {
      console.error('❌ API Request Error:', error);
      return Promise.reject(error);
    }
  );

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
}

export default api;