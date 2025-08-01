#!/usr/bin/env node

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const partnerCredentialsService = require('../services/partnerCredentialsService');

/**
 * Script para debugar o oauth_config
 */
async function debugOAuthConfig() {
  console.log('🔧 Debugando oauth_config...\n');

  try {
    // 1. Buscar credenciais diretamente do banco
    console.log('1️⃣ Buscando credenciais diretamente do banco...');
    const { data: rawCreds, error } = await supabaseAdmin
      .from('partner_credentials')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Erro ao buscar credenciais:', error.message);
      return;
    }

    if (!rawCreds || rawCreds.length === 0) {
      console.log('❌ Nenhuma credencial encontrada');
      return;
    }

    const rawCred = rawCreds[0];
    console.log('✅ Credencial bruta do banco:');
    Object.keys(rawCred).forEach(key => {
      const value = key === 'password' ? '[HIDDEN]' : rawCred[key];
      console.log(`   ${key}: ${value}`);
    });

    // 2. Buscar credenciais através do serviço
    console.log('\n2️⃣ Buscando credenciais através do serviço...');
    const serviceCreds = await partnerCredentialsService.listPartnerCredentials(rawCred.user_id);
    
    if (serviceCreds && serviceCreds.length > 0) {
      const serviceCred = serviceCreds[0];
      console.log('✅ Credencial do serviço:');
      console.log('   ID:', serviceCred.id);
      console.log('   Partner Type:', serviceCred.partner_type);
      console.log('   Auth Type:', serviceCred.auth_type);
      console.log('   OAuth Config:', serviceCred.oauth_config ? 'EXISTE' : 'NÃO EXISTE');
      
      if (serviceCred.oauth_config) {
        console.log('   📋 Conteúdo do oauth_config:');
        Object.keys(serviceCred.oauth_config).forEach(key => {
          const value = key === 'password' ? '[HIDDEN]' : serviceCred.oauth_config[key];
          console.log(`     ${key}: ${value}`);
        });
      }
    } else {
      console.log('❌ Nenhuma credencial retornada pelo serviço');
    }

    // 3. Testar a função getV8AccessToken
    console.log('\n3️⃣ Testando função getV8AccessToken...');
    try {
      const token = await getV8AccessToken(rawCred.user_id);
      console.log('✅ Token obtido com sucesso:', token ? 'SIM' : 'NÃO');
    } catch (tokenError) {
      console.log('❌ Erro ao obter token:', tokenError.message);
    }

  } catch (error) {
    console.error('❌ Erro durante o debug:', error.message);
    logger.error('Erro no debug do oauth_config:', error);
  }
}

async function getV8AccessToken(userId) {
  const creds = await partnerCredentialsService.listPartnerCredentials(userId);
  if (!creds || creds.length === 0) throw new Error('Credenciais do parceiro não encontradas para este usuário.');
  
  console.log('🔍 Credenciais retornadas pelo serviço:');
  console.log('   Quantidade:', creds.length);
  console.log('   Primeira credencial tem oauth_config:', creds[0].oauth_config ? 'SIM' : 'NÃO');
  
  if (creds[0].oauth_config) {
    console.log('   📋 Campos do oauth_config:');
    Object.keys(creds[0].oauth_config).forEach(key => {
      console.log(`     ${key}: ${creds[0].oauth_config[key]}`);
    });
  }
  
  // O serviço retorna os dados em oauth_config
  const { oauth_config } = creds[0];
  const { grant_type, username, password, audience, scope, client_id } = oauth_config;
  
  console.log('🔑 Dados extraídos:');
  console.log('   grant_type:', grant_type);
  console.log('   username:', username);
  console.log('   audience:', audience);
  console.log('   scope:', scope);
  console.log('   client_id:', client_id);
  console.log('   password:', password ? '[HIDDEN]' : 'undefined');
  
  return 'test-token';
}

// Executar se chamado diretamente
if (require.main === module) {
  debugOAuthConfig().catch(console.error);
}

module.exports = { debugOAuthConfig }; 

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const partnerCredentialsService = require('../services/partnerCredentialsService');

/**
 * Script para debugar o oauth_config
 */
async function debugOAuthConfig() {
  console.log('🔧 Debugando oauth_config...\n');

  try {
    // 1. Buscar credenciais diretamente do banco
    console.log('1️⃣ Buscando credenciais diretamente do banco...');
    const { data: rawCreds, error } = await supabaseAdmin
      .from('partner_credentials')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Erro ao buscar credenciais:', error.message);
      return;
    }

    if (!rawCreds || rawCreds.length === 0) {
      console.log('❌ Nenhuma credencial encontrada');
      return;
    }

    const rawCred = rawCreds[0];
    console.log('✅ Credencial bruta do banco:');
    Object.keys(rawCred).forEach(key => {
      const value = key === 'password' ? '[HIDDEN]' : rawCred[key];
      console.log(`   ${key}: ${value}`);
    });

    // 2. Buscar credenciais através do serviço
    console.log('\n2️⃣ Buscando credenciais através do serviço...');
    const serviceCreds = await partnerCredentialsService.listPartnerCredentials(rawCred.user_id);
    
    if (serviceCreds && serviceCreds.length > 0) {
      const serviceCred = serviceCreds[0];
      console.log('✅ Credencial do serviço:');
      console.log('   ID:', serviceCred.id);
      console.log('   Partner Type:', serviceCred.partner_type);
      console.log('   Auth Type:', serviceCred.auth_type);
      console.log('   OAuth Config:', serviceCred.oauth_config ? 'EXISTE' : 'NÃO EXISTE');
      
      if (serviceCred.oauth_config) {
        console.log('   📋 Conteúdo do oauth_config:');
        Object.keys(serviceCred.oauth_config).forEach(key => {
          const value = key === 'password' ? '[HIDDEN]' : serviceCred.oauth_config[key];
          console.log(`     ${key}: ${value}`);
        });
      }
    } else {
      console.log('❌ Nenhuma credencial retornada pelo serviço');
    }

    // 3. Testar a função getV8AccessToken
    console.log('\n3️⃣ Testando função getV8AccessToken...');
    try {
      const token = await getV8AccessToken(rawCred.user_id);
      console.log('✅ Token obtido com sucesso:', token ? 'SIM' : 'NÃO');
    } catch (tokenError) {
      console.log('❌ Erro ao obter token:', tokenError.message);
    }

  } catch (error) {
    console.error('❌ Erro durante o debug:', error.message);
    logger.error('Erro no debug do oauth_config:', error);
  }
}

async function getV8AccessToken(userId) {
  const creds = await partnerCredentialsService.listPartnerCredentials(userId);
  if (!creds || creds.length === 0) throw new Error('Credenciais do parceiro não encontradas para este usuário.');
  
  console.log('🔍 Credenciais retornadas pelo serviço:');
  console.log('   Quantidade:', creds.length);
  console.log('   Primeira credencial tem oauth_config:', creds[0].oauth_config ? 'SIM' : 'NÃO');
  
  if (creds[0].oauth_config) {
    console.log('   📋 Campos do oauth_config:');
    Object.keys(creds[0].oauth_config).forEach(key => {
      console.log(`     ${key}: ${creds[0].oauth_config[key]}`);
    });
  }
  
  // O serviço retorna os dados em oauth_config
  const { oauth_config } = creds[0];
  const { grant_type, username, password, audience, scope, client_id } = oauth_config;
  
  console.log('🔑 Dados extraídos:');
  console.log('   grant_type:', grant_type);
  console.log('   username:', username);
  console.log('   audience:', audience);
  console.log('   scope:', scope);
  console.log('   client_id:', client_id);
  console.log('   password:', password ? '[HIDDEN]' : 'undefined');
  
  return 'test-token';
}

// Executar se chamado diretamente
if (require.main === module) {
  debugOAuthConfig().catch(console.error);
}

module.exports = { debugOAuthConfig }; 