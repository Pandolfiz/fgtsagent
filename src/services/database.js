// Serviço para interagir com o Supabase
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

// Verificar se as variáveis de ambiente do Supabase estão definidas
if (!config.supabase.url) {
  console.error('ERRO: SUPABASE_URL não está definido no arquivo .env');
}

if (!config.supabase.serviceKey) {
  console.error('ERRO: SUPABASE_SERVICE_KEY não está definido no arquivo .env');
}

if (!config.supabase.anonKey) {
  console.error('ERRO: SUPABASE_ANON_KEY não está definido no arquivo .env');
}

// Cliente Supabase para operações administrativas
const supabaseAdmin = config.supabase.url && config.supabase.serviceKey 
  ? createClient(config.supabase.url, config.supabase.serviceKey)
  : null;

// Cliente Supabase para operações públicas
const supabasePublic = config.supabase.url && config.supabase.anonKey 
  ? createClient(config.supabase.url, config.supabase.anonKey)
  : null;

module.exports = {
  supabaseAdmin,
  supabasePublic
};