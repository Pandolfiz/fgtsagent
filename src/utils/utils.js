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

module.exports = {
  normalizeName
}; 