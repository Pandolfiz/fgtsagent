const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Obter as variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Verificar se as variáveis de ambiente foram definidas
if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('ERRO CRÍTICO: Variáveis de ambiente do Supabase não configuradas!', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseServiceKey
  });
  // Não lançar erro aqui, permitir que a aplicação continue inicializando
}

logger.info('Inicializando cliente Supabase no backend', {
  url: supabaseUrl,
  hasKey: !!supabaseServiceKey
});

// Criar o cliente Supabase com a chave de serviço (permite acesso total ao banco)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função utilitária para testar a conexão
const testSupabaseConnection = async () => {
  try {
    const startTime = Date.now();
    const { data, error } = await supabase.from('contacts').select('count').limit(1);
    const duration = Date.now() - startTime;
    
    logger.info(`Teste de conexão Supabase: ${duration}ms`, {
      success: !error,
      error: error?.message,
      data
    });
    
    return { success: !error, data, duration };
  } catch (err) {
    logger.error('Erro ao testar conexão com Supabase:', err);
    return { success: false, error: err.message };
  }
};

module.exports = {
  supabase,
  testSupabaseConnection
}; 