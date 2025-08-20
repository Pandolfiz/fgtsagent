#!/usr/bin/env node

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script para debugar as credenciais do parceiro
 */
async function debugPartnerCredentials() {
  console.log('🔧 Debugando credenciais do parceiro...\n');

  try {
    // 1. Buscar credenciais no banco
    console.log('1️⃣ Buscando credenciais no banco...');
    const { data: credentials, error } = await supabaseAdmin
      .from('partner_credentials')
      .select('*')
      .limit(5);

    if (error) {
      console.log('❌ Erro ao buscar credenciais:', error.message);
      return;
    }

    if (!credentials || credentials.length === 0) {
      console.log('❌ Nenhuma credencial encontrada');
      return;
    }

    console.log(`✅ ${credentials.length} credenciais encontradas:`);
    
    credentials.forEach((cred, index) => {
      console.log(`\n📋 Credencial ${index + 1}:`);
      console.log('   ID:', cred.id);
      console.log('   User ID:', cred.user_id);
      console.log('   Partner Type:', cred.partner_type);
      console.log('   Auth Type:', cred.auth_type);
      console.log('   API Key:', cred.api_key ? '[HIDDEN]' : 'undefined');
      console.log('   OAuth Config:', cred.oauth_config ? JSON.stringify(cred.oauth_config, null, 2) : 'undefined');
      console.log('   Created At:', cred.created_at);
      console.log('   Updated At:', cred.updated_at);
    });

    // 2. Testar com um usuário específico
    if (credentials.length > 0) {
      const testUserId = credentials[0].user_id;
      console.log(`\n2️⃣ Testando com usuário: ${testUserId}`);
      
      const { data: userCreds, error: userError } = await supabaseAdmin
        .from('partner_credentials')
        .select('*')
        .eq('user_id', testUserId);

      if (userError) {
        console.log('❌ Erro ao buscar credenciais do usuário:', userError.message);
      } else {
        console.log(`✅ ${userCreds.length} credenciais para o usuário:`);
        userCreds.forEach((cred, index) => {
          console.log(`\n   Credencial ${index + 1}:`);
          console.log('   ID:', cred.id);
          console.log('   Partner Type:', cred.partner_type);
          console.log('   Auth Type:', cred.auth_type);
          if (cred.oauth_config) {
            console.log('   OAuth Config:');
            Object.keys(cred.oauth_config).forEach(key => {
              const value = key === 'password' ? '[HIDDEN]' : cred.oauth_config[key];
              console.log(`     ${key}: ${value}`);
            });
          }
        });
      }
    }

  } catch (error) {
    console.error('❌ Erro durante o debug:', error.message);
    logger.error('Erro no debug de credenciais:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  debugPartnerCredentials().catch(console.error);
}

module.exports = { debugPartnerCredentials }; 

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script para debugar as credenciais do parceiro
 */
async function debugPartnerCredentials() {
  console.log('🔧 Debugando credenciais do parceiro...\n');

  try {
    // 1. Buscar credenciais no banco
    console.log('1️⃣ Buscando credenciais no banco...');
    const { data: credentials, error } = await supabaseAdmin
      .from('partner_credentials')
      .select('*')
      .limit(5);

    if (error) {
      console.log('❌ Erro ao buscar credenciais:', error.message);
      return;
    }

    if (!credentials || credentials.length === 0) {
      console.log('❌ Nenhuma credencial encontrada');
      return;
    }

    console.log(`✅ ${credentials.length} credenciais encontradas:`);
    
    credentials.forEach((cred, index) => {
      console.log(`\n📋 Credencial ${index + 1}:`);
      console.log('   ID:', cred.id);
      console.log('   User ID:', cred.user_id);
      console.log('   Partner Type:', cred.partner_type);
      console.log('   Auth Type:', cred.auth_type);
      console.log('   API Key:', cred.api_key ? '[HIDDEN]' : 'undefined');
      console.log('   OAuth Config:', cred.oauth_config ? JSON.stringify(cred.oauth_config, null, 2) : 'undefined');
      console.log('   Created At:', cred.created_at);
      console.log('   Updated At:', cred.updated_at);
    });

    // 2. Testar com um usuário específico
    if (credentials.length > 0) {
      const testUserId = credentials[0].user_id;
      console.log(`\n2️⃣ Testando com usuário: ${testUserId}`);
      
      const { data: userCreds, error: userError } = await supabaseAdmin
        .from('partner_credentials')
        .select('*')
        .eq('user_id', testUserId);

      if (userError) {
        console.log('❌ Erro ao buscar credenciais do usuário:', userError.message);
      } else {
        console.log(`✅ ${userCreds.length} credenciais para o usuário:`);
        userCreds.forEach((cred, index) => {
          console.log(`\n   Credencial ${index + 1}:`);
          console.log('   ID:', cred.id);
          console.log('   Partner Type:', cred.partner_type);
          console.log('   Auth Type:', cred.auth_type);
          if (cred.oauth_config) {
            console.log('   OAuth Config:');
            Object.keys(cred.oauth_config).forEach(key => {
              const value = key === 'password' ? '[HIDDEN]' : cred.oauth_config[key];
              console.log(`     ${key}: ${value}`);
            });
          }
        });
      }
    }

  } catch (error) {
    console.error('❌ Erro durante o debug:', error.message);
    logger.error('Erro no debug de credenciais:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  debugPartnerCredentials().catch(console.error);
}

module.exports = { debugPartnerCredentials }; 