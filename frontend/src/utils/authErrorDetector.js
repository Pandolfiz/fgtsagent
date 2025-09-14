/**
 * Utilitário para detectar erros de autenticação e tokens
 * Mapeia TODAS as possíveis mensagens de erro relacionadas à autenticação
 */

/**
 * Verifica se um erro é relacionado à autenticação/token
 * @param {Error|Object} error - O erro a ser verificado
 * @returns {boolean} - true se for erro de autenticação
 */
export const isAuthError = (error) => {
  if (!error) return false;
  
  // Obter mensagem do erro (suporta diferentes formatos)
  let message = '';
  if (typeof error === 'string') {
    message = error;
  } else if (error.message) {
    message = error.message;
  } else if (error.error) {
    message = error.error;
  } else if (error.response?.data?.message) {
    message = error.response.data.message;
  } else if (error.response?.data?.error) {
    message = error.response.data.error;
  } else {
    return false;
  }
  
  // Converter para minúsculas para comparação
  const lowerMessage = message.toLowerCase();
  
  // ✅ TODOS OS PADRÕES DE ERRO DE AUTENTICAÇÃO
  const authErrorPatterns = [
    // === PADRÕES JÁ IMPLEMENTADOS ===
    'token de acesso não encontrado',
    '401',
    'unauthorized',
    
    // === ERROS DO BACKEND (src/) ===
    // Middleware de Autenticação
    'api key inválida',
    'token de autenticação necessário',
    'token inválido ou expirado',
    'autenticação necessária',
    'acesso restrito a administradores',
    'usuário não pertence a nenhuma organização',
    
    // Controladores de Autenticação
    'é necessário confirmar seu email antes de fazer login',
    'email ou senha inválidos',
    'não autenticado',
    'nenhum token fornecido',
    'erro ao renovar token',
    'não foi possível renovar a sessão',
    'token não encontrado',
    'sessão expirada',
    'usuário encontrado mas plano não está ativo',
    'email não confirmado',
    'acesso negado',
    'somente administradores podem criar sessões',
    
    // Outros Controladores
    'token de acesso inválido ou expirado',
    'usuário não autenticado',
    'sua sessão expirou',
    'logout e login novamente',
    'senha atual está incorreta',
    'acesso negado a esta conversa',
    'acesso negado a esta organização',
    'token não fornecido',
    
    // === ERROS DO FRONTEND ===
    // Erros de Sessão
    'sua sessão expirou',
    'dados de autenticação inválidos',
    'token realmente inválido',
    'token expirado ou inválido',
    'sessão expirada',
    
    // === ERROS DO SUPABASE ===
    'jwt',
    'authapierror',
    'invalid login credentials',
    'email not confirmed',
    'session_invalid',
    'token inválido',
    'invalid token',
    'expired token',
    'malformed token',
    
    // === ERROS DE REFRESH TOKEN ===
    'refresh_token',
    'refreshtoken',
    'refresh token não encontrado',
    'falha no refresh automático',
    'token próximo do vencimento',
    'refresh session',
    'session refresh',
    
    // === ERROS DE REDE E CONECTIVIDADE ===
    'err_network',
    'network error',
    'typeerror',
    'networkerror',
    'fetch failed',
    'connection failed',
    'api não disponível',
    'sem resposta do servidor',
    'verificar conectividade',
    
    // === CÓDIGOS DE STATUS ===
    '403',
    'forbidden',
    'access denied',
    
    // === PADRÕES GENÉRICOS ===
    'invalid',
    'expired',
    'expirou',
    'expirado',
    'token',
    'auth',
    'authentication',
    'authorization',
    'session',
    'login',
    'credential',
    'credencial'
  ];
  
  // Verificar se a mensagem contém algum padrão de erro de autenticação
  return authErrorPatterns.some(pattern => lowerMessage.includes(pattern));
};

/**
 * Obtém uma mensagem de erro amigável para o usuário
 * @param {Error|Object} error - O erro original
 * @returns {string} - Mensagem amigável
 */
export const getAuthErrorMessage = (error) => {
  if (!error) return 'Erro de autenticação desconhecido';
  
  let message = '';
  if (typeof error === 'string') {
    message = error;
  } else if (error.message) {
    message = error.message;
  } else if (error.response?.data?.message) {
    message = error.response.data.message;
  }
  
  const lowerMessage = message.toLowerCase();
  
  // Mapear mensagens específicas para mensagens amigáveis
  if (lowerMessage.includes('email not confirmed') || lowerMessage.includes('email não confirmado')) {
    return 'Email não confirmado. Verifique sua caixa de entrada.';
  }
  
  if (lowerMessage.includes('invalid login credentials') || lowerMessage.includes('email ou senha inválidos')) {
    return 'Email ou senha inválidos. Verifique e tente novamente.';
  }
  
  if (lowerMessage.includes('refresh') || lowerMessage.includes('renovar')) {
    return 'Sua sessão expirou. Faça login novamente.';
  }
  
  if (lowerMessage.includes('network') || lowerMessage.includes('conectividade')) {
    return 'Problema de conexão. Verifique sua internet e tente novamente.';
  }
  
  if (lowerMessage.includes('access denied') || lowerMessage.includes('acesso negado')) {
    return 'Acesso negado. Você não tem permissão para esta ação.';
  }
  
  // Mensagem padrão
  return 'Sua sessão expirou. Faça login novamente.';
};

/**
 * Redireciona para a página de login com mensagem de erro
 * @param {Error|Object} error - O erro original
 * @param {string} customMessage - Mensagem personalizada (opcional)
 */
export const redirectToLogin = (error, customMessage = null) => {
  const message = customMessage || getAuthErrorMessage(error);
  const encodedMessage = encodeURIComponent(message);
  
  console.log('🔄 Redirecionando para login devido a erro de autenticação:', {
    originalError: error,
    friendlyMessage: message
  });
  
  window.location.href = `/login?error=session_expired&message=${encodedMessage}`;
};

/**
 * Função utilitária para tratar erros em catch blocks
 * @param {Error|Object} error - O erro capturado
 * @param {Function} setError - Função para definir erro local (opcional)
 * @param {string} customMessage - Mensagem personalizada (opcional)
 */
export const handleAuthError = (error, setError = null, customMessage = null) => {
  console.error('❌ Erro capturado:', error);
  
  if (isAuthError(error)) {
    redirectToLogin(error, customMessage);
    return true; // Indica que foi um erro de autenticação
  }
  
  // Se não for erro de autenticação e setError foi fornecido, definir erro local
  if (setError) {
    const message = customMessage || (error.message || 'Erro inesperado');
    setError(message);
  }
  
  return false; // Indica que não foi um erro de autenticação
};
