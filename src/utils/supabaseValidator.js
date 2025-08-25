/**
 * Utilitário para validar configurações do Supabase e testar conectividade
 */
const logger = require('./logger');

/**
 * Valida se as variáveis de ambiente do Supabase estão configuradas corretamente
 * @returns {Object} Resultado da validação
 */
function validateSupabaseEnvironment() {
  const errors = [];
  const warnings = [];
  
  // Verificar variáveis obrigatórias
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'];
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      errors.push(`${varName} não está definida`);
    } else if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${varName} está vazia`);
    }
  });
  
  // Validar formato da URL
  if (process.env.SUPABASE_URL) {
    const url = process.env.SUPABASE_URL;
    if (!url.startsWith('https://')) {
      errors.push('SUPABASE_URL deve começar com https://');
    } else if (!url.includes('supabase.co')) {
      warnings.push('SUPABASE_URL não parece ser uma URL válida do Supabase');
    }
  }
  
  // Validar formato das chaves JWT
  if (process.env.SUPABASE_ANON_KEY) {
    const key = process.env.SUPABASE_ANON_KEY;
    if (!key.startsWith('eyJ')) {
      errors.push('SUPABASE_ANON_KEY deve ser um JWT válido (começar com "eyJ")');
    } else if (key.length < 100) {
      warnings.push('SUPABASE_ANON_KEY parece ser muito curta');
    }
  }
  
  if (process.env.SUPABASE_SERVICE_KEY) {
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!key.startsWith('eyJ')) {
      errors.push('SUPABASE_SERVICE_KEY deve ser um JWT válido (começar com "eyJ")');
    } else if (key.length < 100) {
      warnings.push('SUPABASE_SERVICE_KEY parece ser muito curta');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Testa a conectividade com o Supabase
 * @param {Object} supabaseClient - Cliente do Supabase
 * @returns {Promise<Object>} Resultado do teste
 */
async function testSupabaseConnection(supabaseClient) {
  if (!supabaseClient) {
    return {
      success: false,
      error: 'Cliente Supabase não está disponível'
    };
  }
  
  try {
    // Tentar uma operação simples para testar conectividade
    const { data, error } = await supabaseClient
      .from('_test_connection')
      .select('*')
      .limit(1);
    
    // Se chegou até aqui, a conexão funciona (mesmo que a tabela não exista)
    return {
      success: true,
      message: 'Conexão com Supabase estabelecida'
    };
  } catch (error) {
    // Analisar o tipo de erro
    if (error.message && typeof error.message === 'string' && error.message.includes('Invalid API key')) {
      return {
        success: false,
        error: 'Chave de API inválida'
      };
    } else if (error.message && typeof error.message === 'string' && error.message.includes('Project not found')) {
      return {
        success: false,
        error: 'Projeto não encontrado - verifique a URL'
      };
    } else if (error.message && typeof error.message === 'string' && (error.message.includes('network') || error.message.includes('fetch'))) {
      return {
        success: false,
        error: 'Erro de conexão de rede'
      };
    } else {
      return {
        success: false,
        error: `Erro desconhecido: ${error.message}`
      };
    }
  }
}

/**
 * Executa validação completa do Supabase
 * @param {Object} supabaseClient - Cliente do Supabase
 * @returns {Promise<Object>} Resultado completo da validação
 */
async function validateSupabaseSetup(supabaseClient) {
  logger.info('Iniciando validação do Supabase...');
  
  // Validar variáveis de ambiente
  const envValidation = validateSupabaseEnvironment();
  
  if (!envValidation.isValid) {
    logger.error('Erros de configuração encontrados:');
    envValidation.errors.forEach(error => logger.error(`- ${error}`));
    
    return {
      success: false,
      stage: 'environment',
      errors: envValidation.errors,
      warnings: envValidation.warnings
    };
  }
  
  if (envValidation.warnings.length > 0) {
    logger.warn('Avisos de configuração:');
    envValidation.warnings.forEach(warning => logger.warn(`- ${warning}`));
  }
  
  // Testar conectividade
  const connectionTest = await testSupabaseConnection(supabaseClient);
  
  if (!connectionTest.success) {
    logger.error(`Erro de conectividade: ${connectionTest.error}`);
    
    return {
      success: false,
      stage: 'connection',
      errors: [connectionTest.error],
      warnings: envValidation.warnings
    };
  }
  
  logger.info('Validação do Supabase concluída com sucesso');
  
  return {
    success: true,
    stage: 'complete',
    errors: [],
    warnings: envValidation.warnings
  };
}

module.exports = {
  validateSupabaseEnvironment,
  testSupabaseConnection,
  validateSupabaseSetup
}; 