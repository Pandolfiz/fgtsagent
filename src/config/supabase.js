// Configuração do Supabase
const { createClient } = require('@supabase/supabase-js');
const config = require('./index');
const logger = require('../utils/logger');

// Obter credenciais da configuração centralizada
const supabaseUrl = config.supabase.url;
const supabaseKey = config.supabase.anonKey;
const supabaseServiceKey = config.supabase.serviceKey;

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
const supabase = createClient(supabaseUrl, supabaseKey, supabaseOptions);

// Criar cliente Supabase com acesso administrativo
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, supabaseOptions);

// Função para verificar a conexão com o Supabase
const checkSupabaseConnection = async () => {
  try {
    const { error } = await supabase.from('user_profiles').select('id').limit(1);
    
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

module.exports = {
  supabase,
  supabaseAdmin,
  checkSupabaseConnection
}; 