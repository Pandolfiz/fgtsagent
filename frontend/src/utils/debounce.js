/**
 * Função debounce para otimizar performance
 * @param {Function} func - Função a ser executada
 * @param {number} wait - Tempo de espera em milissegundos
 * @param {boolean} immediate - Se deve executar imediatamente na primeira chamada
 * @returns {Function} Função debounced
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Função throttle para limitar a frequência de execução
 * @param {Function} func - Função a ser executada
 * @param {number} limit - Limite de tempo em milissegundos
 * @returns {Function} Função throttled
 */
export function throttle(func, limit) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}























