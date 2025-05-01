/**
 * Modelo de Organização
 * Implementação básica para resolver a dependência no controlador de credenciais n8n
 */
const { supabase } = require('../config/supabase');

class Organization {
  /**
   * Busca uma organização pelo ID
   * @param {string} id - ID da organização
   * @returns {Promise<Object|null>} Objeto da organização ou null se não encontrada
   */
  static async findById(id) {
    try {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Erro ao buscar organização:', error.message);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Erro ao buscar organização:', error.message);
      return null;
    }
  }
}

module.exports = Organization; 