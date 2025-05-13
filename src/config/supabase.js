// Configuração do Supabase
const { createClient } = require('@supabase/supabase-js');
const config = require('./index');
const logger = require('../utils/logger');

// Obter credenciais da configuração centralizada
const supabaseUrl = config.supabase.url;
const supabaseKey = config.supabase.anonKey;
const supabaseServiceKey = config.supabase.serviceKey;

// Verificar se todas as credenciais necessárias estão disponíveis
if (!supabaseUrl) {
  logger.error('URL do Supabase não configurada. Verifique SUPABASE_URL ou SUPABASE_PROJECT_ID no arquivo .env');
}

if (!supabaseKey) {
  logger.error('Chave anônima do Supabase não configurada. Verifique SUPABASE_ANON_KEY no arquivo .env');
}

if (!supabaseServiceKey) {
  logger.error('Chave de serviço do Supabase não configurada. Verifique SUPABASE_SERVICE_KEY no arquivo .env');
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
let supabase;
let supabaseAdmin;

try {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Credenciais do Supabase incompletas');
  }
  
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
  // Criar clientes vazios para evitar erros de referência nula
  supabase = { supabaseUrl: null, supabaseKey: null };
  supabaseAdmin = { supabaseUrl: null, supabaseKey: null };
}

// Função para verificar a conexão com o Supabase
const checkSupabaseConnection = async () => {
  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Credenciais do Supabase não configuradas corretamente');
    }
    
    // Teste simples de conexão
    logger.info('Testando conexão com o Supabase...');
    const { data, error } = await supabase.from('whatsapp_credentials').select('count').limit(1);
    
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