// Configuração do Facebook SDK
export const FACEBOOK_CONFIG = {
  // App ID do Facebook (substitua pelo valor real)
  APP_ID: import.meta.env.VITE_APP_META_APP_ID || 'your_META_APP_ID_here',

  // Config ID para WhatsApp Business API (substitua pelo valor real)
  CONFIG_ID: import.meta.env.VITE_APP_META_CONFIG_ID || 'your_META_APP_CONFIG_ID_here',

  // Versão da API do Facebook
  API_VERSION: 'v23.0',

  // Configurações do SDK
  SDK_CONFIG: {
    autoLogAppEvents: true,
    xfbml: true,
    cookie: true, // Habilitar cookies para sessão
    status: true, // Verificar status de login
  },

  // Configurações do Embedded Signup
  SIGNUP_CONFIG: {
    response_type: 'code',
    override_default_response_type: true,
    extras: {
      featureType: 'whatsapp_business',
      sessionInfoVersion: '3',
    }
  },

  // Configurações de segurança
  SECURITY_CONFIG: {
    // Domínios autorizados (desenvolvimento e produção)
    allowedDomains: [
      'localhost',
      '127.0.0.1',
      'fgtsagent.com.br',
      'www.fgtsagent.com.br'
    ],

    // Verificar se o domínio atual está autorizado
    isDomainAllowed: () => {
      const currentDomain = window.location.hostname;
      return FACEBOOK_CONFIG.SECURITY_CONFIG.allowedDomains.includes(currentDomain);
    }
  }
};

// Verificar se as configurações estão definidas
export const isFacebookConfigured = () => {
  const hasValidConfig = FACEBOOK_CONFIG.APP_ID !== 'your_META_APP_ID_here' &&
                        FACEBOOK_CONFIG.CONFIG_ID !== 'your_META_APP_CONFIG_ID_here';

  // Facebook SDK requer HTTPS obrigatoriamente
  const isSecureConnection = window.location.protocol === 'https:';

  const isDomainAllowed = FACEBOOK_CONFIG.SECURITY_CONFIG.isDomainAllowed();

  console.log('🔍 Verificação de configuração Facebook:', {
    hasValidConfig,
    isSecureConnection,
    isDomainAllowed,
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    appId: FACEBOOK_CONFIG.APP_ID,
    configId: FACEBOOK_CONFIG.CONFIG_ID
  });

  return hasValidConfig && isSecureConnection && isDomainAllowed;
};

// Mensagens de erro para configuração
export const FACEBOOK_ERRORS = {
  NOT_CONFIGURED: 'Facebook SDK não está configurado. Configure o VITE_APP_META_APP_ID e VITE_APP_META_CONFIG_ID.',
  SDK_NOT_LOADED: 'Facebook SDK não carregado. Tente recarregar a página.',
  LOGIN_CANCELLED: 'Login cancelado ou não autorizado completamente.',
  AUTH_FAILED: 'Falha na autorização. Tente novamente.',
  INSECURE_CONNECTION: 'O Facebook SDK requer HTTPS para funcionar corretamente. Acesse o site via HTTPS.',
  DOMAIN_NOT_AUTHORIZED: 'Este domínio não está autorizado no Facebook App. Verifique as configurações.',
  CONFIGURATION_INCOMPLETE: 'Configuração incompleta. Verifique App ID, Config ID e domínio autorizado.',
  SECURITY_VIOLATION: 'Violação de segurança detectada. Verifique protocolo HTTPS e domínio autorizado.',
};