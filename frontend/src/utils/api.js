import axios from 'axios';

// Configuração da base URL da API
const getApiBaseUrl = () => {
  // Em desenvolvimento (Vite dev server)
  if (import.meta.env.DEV) {
    // O proxy do Vite já cuida do redirecionamento /api -> http://localhost:3000
    return '';
  }
  
  // Em produção
  const hostname = window.location.hostname;
  
  // Se estiver no mesmo domínio/servidor (produção)
  if (hostname === 'fgtsagent.com.br' || 
      hostname.includes('fgtsagent') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      // Para builds de produção testados localmente
      hostname.includes('preview') ||
      // Para deploy em subdomínios
      hostname.includes('.vercel.app') ||
      hostname.includes('.netlify.app') ||
      hostname.includes('.herokuapp.com')) {
    return ''; // API no mesmo servidor/domínio
  }
  
  // Fallback para servidor de desenvolvimento/staging
  return 'http://localhost:3000';
};

// Criar instância do axios com configuração
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000, // 10 segundos
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor para logs em desenvolvimento
if (import.meta.env.DEV) {
  api.interceptors.request.use(
    (config) => {
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
      console.error('❌ API Response Error:', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.message,
        data: error.response?.data
      });
      return Promise.reject(error);
    }
  );
}

export default api; 