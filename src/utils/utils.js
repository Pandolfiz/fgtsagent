/**
 * Utilitários gerais para o sistema
 */

/**
 * Normaliza um nome removendo acentos, espaços e caracteres especiais
 * @param {string} name - Nome a ser normalizado
 * @returns {string} Nome normalizado
 */
function normalizeName(name) {
  if (!name) return '';
  
  try {
    // Remover acentos
    const withoutAccents = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Remover caracteres especiais e espaços
    const normalized = withoutAccents.replace(/[^a-zA-Z0-9]/g, '');
    
    // Garantir que temos pelo menos um caractere
    return normalized || 'U_';
  } catch (error) {
    console.error(`Erro ao normalizar nome: ${error.message}`);
    return 'U_';
  }
}

/**
 * Formata um número de telefone removendo todos os caracteres não numéricos
 * @param {string} phoneNumber - Número de telefone a ser formatado
 * @returns {string} Número de telefone apenas com dígitos
 */
function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';
  
  try {
    // Remover todos os caracteres não numéricos
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    return cleaned;
  } catch (error) {
    console.error(`Erro ao formatar número de telefone: ${error.message}`);
    return phoneNumber || '';
  }
}

module.exports = {
  normalizeName,
  formatPhoneNumber
}; 