/**
 * Cliente Supabase para acesso ao banco de dados
 * 
 * AVISO: Este arquivo foi consolidado com src/config/supabase.js
 * Use sempre a configuração centralizada: const { supabase, supabaseAdmin } = require('../config/supabase');
 */

// Redirecionar para a configuração centralizada
const { supabase, supabaseAdmin, supabaseUrl, supabaseKey } = require('../config/supabase');

module.exports = { 
  supabase, 
  supabaseAdmin,
  supabaseUrl,
  supabaseAnonKey: supabaseKey,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY
}; 