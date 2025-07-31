#!/usr/bin/env node

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script para verificar campos OAuth específicos na tabela partner_credentials
 */
async function checkOAuthFields() {
  console.log('🔧 Verificando campos OAuth na tabela partner_credentials...\n');

  try {
    // 1. Verificar todos os campos da tabela
    console.log('1️⃣ Verificando todos os campos da tabela...');
    const { data: credentials, error } = await supabaseAdmin
      .from('partner_credentials')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Erro ao buscar dados:', error.message);
      return;
    }

    if (!credentials || credentials.length === 0) {
      console.log('❌ Nenhuma credencial encontrada');
      return;
    }

    const sample = credentials[0];
    console.log('✅ Campos encontrados na tabela:');
    Object.keys(sample).forEach(key => {
      const value = sample[key];
      const type = typeof value;
      const isNull = value === null;
      console.log(`   ${key}: ${type} (${isNull ? 'null' : 'defined'})`);
    });

    // 2. Verificar campos OAuth específicos
    console.log('\n2️⃣ Verificando campos OAuth específicos...');
    const oauthFields = ['grant_type', 'username', 'password', 'audience', 'scope', 'client_id'];
    
    oauthFields.forEach(field => {
      if (sample.hasOwnProperty(field)) {
        const value = sample[field];
        const displayValue = field === 'password' ? (value ? '[HIDDEN]' : 'undefined') : value;
        console.log(`   ✅ ${field}: ${displayValue}`);
      } else {
        console.log(`   ❌ ${field}: campo não encontrado`);
      }
    });

    // 3. Verificar se o campo oauth_config existe
    console.log('\n3️⃣ Verificando campo oauth_config...');
    if (sample.hasOwnProperty('oauth_config')) {
      console.log(`   ✅ oauth_config: ${typeof sample.oauth_config} (${sample.oauth_config === null ? 'null' : 'defined'})`);
      if (sample.oauth_config) {
        console.log('   📋 Conteúdo do oauth_config:');
        Object.keys(sample.oauth_config).forEach(key => {
          const value = key === 'password' ? '[HIDDEN]' : sample.oauth_config[key];
          console.log(`     ${key}: ${value}`);
        });
      }
    } else {
      console.log('   ❌ oauth_config: campo não encontrado');
    }

    // 4. Tentar buscar com campos específicos
    console.log('\n4️⃣ Tentando buscar com campos específicos...');
    const { data: specificFields, error: specificError } = await supabaseAdmin
      .from('partner_credentials')
      .select('id, user_id, partner_type, auth_type, grant_type, username, audience, scope, client_id')
      .limit(1);

    if (specificError) {
      console.log('❌ Erro ao buscar campos específicos:', specificError.message);
    } else {
      console.log('✅ Busca com campos específicos bem-sucedida:');
      if (specificFields && specificFields.length > 0) {
        const cred = specificFields[0];
        Object.keys(cred).forEach(key => {
          console.log(`   ${key}: ${cred[key]}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Erro durante a verificação:', error.message);
    logger.error('Erro na verificação de campos OAuth:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkOAuthFields().catch(console.error);
}

module.exports = { checkOAuthFields }; 

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Script para verificar campos OAuth específicos na tabela partner_credentials
 */
async function checkOAuthFields() {
  console.log('🔧 Verificando campos OAuth na tabela partner_credentials...\n');

  try {
    // 1. Verificar todos os campos da tabela
    console.log('1️⃣ Verificando todos os campos da tabela...');
    const { data: credentials, error } = await supabaseAdmin
      .from('partner_credentials')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Erro ao buscar dados:', error.message);
      return;
    }

    if (!credentials || credentials.length === 0) {
      console.log('❌ Nenhuma credencial encontrada');
      return;
    }

    const sample = credentials[0];
    console.log('✅ Campos encontrados na tabela:');
    Object.keys(sample).forEach(key => {
      const value = sample[key];
      const type = typeof value;
      const isNull = value === null;
      console.log(`   ${key}: ${type} (${isNull ? 'null' : 'defined'})`);
    });

    // 2. Verificar campos OAuth específicos
    console.log('\n2️⃣ Verificando campos OAuth específicos...');
    const oauthFields = ['grant_type', 'username', 'password', 'audience', 'scope', 'client_id'];
    
    oauthFields.forEach(field => {
      if (sample.hasOwnProperty(field)) {
        const value = sample[field];
        const displayValue = field === 'password' ? (value ? '[HIDDEN]' : 'undefined') : value;
        console.log(`   ✅ ${field}: ${displayValue}`);
      } else {
        console.log(`   ❌ ${field}: campo não encontrado`);
      }
    });

    // 3. Verificar se o campo oauth_config existe
    console.log('\n3️⃣ Verificando campo oauth_config...');
    if (sample.hasOwnProperty('oauth_config')) {
      console.log(`   ✅ oauth_config: ${typeof sample.oauth_config} (${sample.oauth_config === null ? 'null' : 'defined'})`);
      if (sample.oauth_config) {
        console.log('   📋 Conteúdo do oauth_config:');
        Object.keys(sample.oauth_config).forEach(key => {
          const value = key === 'password' ? '[HIDDEN]' : sample.oauth_config[key];
          console.log(`     ${key}: ${value}`);
        });
      }
    } else {
      console.log('   ❌ oauth_config: campo não encontrado');
    }

    // 4. Tentar buscar com campos específicos
    console.log('\n4️⃣ Tentando buscar com campos específicos...');
    const { data: specificFields, error: specificError } = await supabaseAdmin
      .from('partner_credentials')
      .select('id, user_id, partner_type, auth_type, grant_type, username, audience, scope, client_id')
      .limit(1);

    if (specificError) {
      console.log('❌ Erro ao buscar campos específicos:', specificError.message);
    } else {
      console.log('✅ Busca com campos específicos bem-sucedida:');
      if (specificFields && specificFields.length > 0) {
        const cred = specificFields[0];
        Object.keys(cred).forEach(key => {
          console.log(`   ${key}: ${cred[key]}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Erro durante a verificação:', error.message);
    logger.error('Erro na verificação de campos OAuth:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkOAuthFields().catch(console.error);
}

module.exports = { checkOAuthFields }; 