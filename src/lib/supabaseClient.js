/**
 * Cliente Supabase para acesso ao banco de dados
 */
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Obter as credenciais do ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Verificar se as credenciais estão definidas
if (!supabaseUrl || !supabaseKey) {
  logger.error('Credenciais do Supabase não configuradas. Verifique as variáveis SUPABASE_URL e SUPABASE_KEY.');
  process.exit(1);
}

// Criar cliente do Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase }; 