// Configuração do Supabase
const { createClient } = require('@supabase/supabase-js');
const config = require('./index');
const logger = require('../utils/logger');
const { withTimeout } = require('../utils/supabaseTimeout');

// Obter credenciais da configuração centralizada
const supabaseUrl = config.supabase.url;
const supabaseKey = config.supabase.anonKey;
const supabaseServiceKey = config.supabase.serviceKey;

// Usar validador centralizado
const { validateSupabaseEnvironment } = require('../utils/supabaseValidator');

// Validar configuração do ambiente
const validation = validateSupabaseEnvironment();

if (!validation.isValid) {
  logger.error('ERROS DE CONFIGURAÇÃO DO SUPABASE:');
  validation.errors.forEach(error => logger.error(`- ${error}`));
  logger.error('O sistema não funcionará corretamente até que estes problemas sejam resolvidos.');
}

if (validation.warnings.length > 0) {
  logger.warn('AVISOS DE CONFIGURAÇÃO DO SUPABASE:');
  validation.warnings.forEach(warning => logger.warn(`- ${warning}`));
}

// Registrar a configuração do Supabase
logger.info(`==== CONFIGURAÇÃO DO SUPABASE ====`);
logger.info(`URL: ${supabaseUrl || 'não configurada'}`);
logger.info(`Chave anônima: ${supabaseKey ? 'configurada' : 'não configurada'}`);
logger.info(`Chave de serviço: ${supabaseServiceKey ? 'configurada' : 'não configurada'}`);

// Verificar se estamos usando URLs de ngrok
const isNgrok = process.env.APP_URL && process.env.APP_URL.includes('ngrok');
if (isNgrok) {
  logger.info('Detectado uso de ngrok. Ajustando configurações para melhor compatibilidade.');
}

// Configurações para cliente Supabase
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Desabilitar detecção de URL para evitar problemas com ngrok
    storageKey: 'supabase-auth', // Chave de armazenamento explícita
    flowType: isNgrok ? 'pkce' : 'implicit' // Usar PKCE para ngrok
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-node-backend'
    }
  }
};

// Criar cliente Supabase
let supabase = null;
let supabaseAdmin = null;

// Só criar clientes se as configurações estão válidas
if (validation.isValid && supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, supabaseOptions);
    logger.info('Cliente Supabase criado com sucesso');
    
    if (supabaseServiceKey) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, supabaseOptions);
      logger.info('Cliente Supabase Admin criado com sucesso');
    } else {
      logger.warn('Cliente Supabase Admin não criado devido à falta da chave de serviço');
    }
  } catch (error) {
    logger.error(`Erro ao criar cliente Supabase: ${error.message}`);
    // Não criar clientes vazios - deixar como null para indicar falha
    supabase = null;
    supabaseAdmin = null;
  }
} else {
  logger.error('Clientes Supabase não criados devido a erros de configuração');
  logger.error('Corrija as configurações acima antes de reiniciar o servidor');
}

// Função para verificar a conexão com o Supabase
const checkSupabaseConnection = async () => {
  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Credenciais do Supabase não configuradas corretamente');
    }
    
    // Teste simples de conexão com timeout
    logger.info('Testando conexão com o Supabase...');
    const { data, error } = await withTimeout(
      supabase.from('whatsapp_credentials').select('count').limit(1),
      10000, // 10 segundos timeout para conexão inicial
      'Supabase connection test'
    );
    
    if (error) {
      throw new Error(error.message);
    }
    
    logger.info('Conexão com o Supabase estabelecida com sucesso!');
    return true;
  } catch (error) {
    logger.error(`Erro ao verificar conexão com o Supabase: ${error.message}`);
    return false;
  }
};

// Executar verificação de conexão ao inicializar
checkSupabaseConnection().then(isConnected => {
  if (isConnected) {
    logger.info('Supabase está online e respondendo');
  } else {
    logger.error('Falha na conexão com o Supabase. Verifique as configurações e credenciais.');
  }
});

module.exports = {
  supabase,
  supabaseAdmin,
  checkSupabaseConnection,
  supabaseUrl,
  supabaseKey
}; 