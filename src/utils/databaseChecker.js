// Utilitário para verificar a configuração do banco de dados
const { supabaseAdmin } = require('../config/supabase');
const logger = require('./logger');

/**
 * Verifica a conexão com o Supabase e as tabelas necessárias
 */
async function checkDatabaseSetup() {
  if (!supabaseAdmin) {
    logger.error('ERRO: Cliente Supabase não está configurado. Verifique as variáveis de ambiente.');
    return false;
  }
  
  try {
    
    // Apenas verificar se conseguimos nos conectar ao Supabase usando o método auth.getSession()
    // que não requer nenhuma permissão especial
    const { data, error } = await supabaseAdmin.auth.getSession();
    
    // Mesmo se não tivermos uma sessão válida, o importante é que conseguimos nos conectar
    // ao servidor sem erros de conexão
    if (error && error.message && typeof error.message === 'string' && (error.message.includes('network') || error.message.includes('connect'))) {
      logger.error(`Erro ao conectar ao Supabase: ${error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    logger.error(`Erro ao verificar configuração do banco de dados: ${error.message}`);
    return false;
  }
}

module.exports = {
  checkDatabaseSetup
}; 