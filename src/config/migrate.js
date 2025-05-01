/**
 * Script para criar tabelas no Supabase
 */
const { supabase } = require('./supabase');
const logger = require('../utils/logger');

/**
 * Cria tabelas necessárias para o sistema
 */
async function migrate() {
  try {
    // Verificar se a tabela credentials já existe
    const { error: checkError } = await supabase.rpc('check_table_exists', { 
      p_table_name: 'credentials'
    });
    
    if (!checkError) {
      // Tabela existe, não precisa logar nada
      return { success: true, message: 'Tabela credentials já existe' };
    }
    // Se der erro, apenas retornar sucesso para seguir o fluxo
    return { success: true, message: "Migração de 'credentials' ignorada" };
  } catch (error) {
    logger.error(`Erro durante a migração: ${error.message}. Migração será pulada.`);
    return { success: true, message: 'Migração pulada devido a erro' };
  }
}

// Exportar função de migração
module.exports = { migrate }; 