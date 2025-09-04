/**
 * Utilitários para funcionalidades de chat
 */

/**
 * Sanitiza conteúdo de mensagem removendo caracteres perigosos
 * @param {string} content - Conteúdo da mensagem
 * @returns {string} - Conteúdo sanitizado
 */
export const sanitizeContent = (content) => {
  if (!content || typeof content !== 'string') return '';
  
  // Remove tags HTML perigosas mas mantém quebras de linha
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\n/g, '<br>');
};

/**
 * Formata timestamp para exibição inteligente
 * @param {string|Date} timestamp - Timestamp da mensagem
 * @returns {string} - Timestamp formatado
 */
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    const messageDate = new Date(timestamp);
    
    // Verificar se a data é válida
    if (isNaN(messageDate.getTime())) {
      console.error(`Data inválida: ${timestamp}`);
      return '';
    }
    
    const now = new Date();
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);
    
    // Timestamp inteligente baseado no tempo
    if (diffInHours < 1) {
      return messageDate.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 24) {
      return messageDate.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 168) { // 7 dias
      return messageDate.toLocaleDateString('pt-BR', { 
        weekday: 'short' 
      });
    } else {
      return messageDate.toLocaleDateString('pt-BR', { 
        day: '2-digit',
        month: '2-digit'
      });
    }
  } catch (error) {
    console.error(`Erro ao formatar data ${timestamp}:`, error);
    return '';
  }
};

/**
 * Formata data para separador de mensagens
 * @param {string|Date} dateString - Data da mensagem
 * @returns {string} - Data formatada para separador
 */
export const formatDateSeparator = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  } catch (error) {
    console.error(`Erro ao formatar separador de data ${dateString}:`, error);
    return '';
  }
};

/**
 * Valida entrada do usuário
 * @param {string} input - Entrada do usuário
 * @returns {boolean} - Se a entrada é válida
 */
export const validateUserInput = (input) => {
  if (!input || typeof input !== 'string') return false;
  
  // Verificar se não está vazio após trim
  const trimmed = input.trim();
  if (trimmed.length === 0) return false;
  
  // Verificar se não excede limite de caracteres
  if (trimmed.length > 4000) return false;
  
  return true;
};

/**
 * Formata nome do contato para exibição
 * @param {string} name - Nome do contato
 * @param {string} phone - Telefone do contato
 * @returns {string} - Nome formatado
 */
export const formatContactName = (name, phone) => {
  if (!name || name.trim() === '') {
    // Se não tem nome, usar telefone formatado
    if (phone) {
      return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return 'Contato';
  }
  
  return name.trim();
};





