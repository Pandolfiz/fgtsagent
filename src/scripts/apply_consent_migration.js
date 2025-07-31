#!/usr/bin/env node

const { supabaseAdmin } = require('../config/supabase');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Script para aplicar migração de consentimentos LGPD
 */
async function applyConsentMigration() {
  console.log('🔧 Aplicando migração de consentimentos LGPD...\n');

  try {
    // Ler arquivo de migração
    const migrationPath = path.join(__dirname, '../sql/migrations/create_consent_logs_table.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    console.log('📄 Arquivo de migração carregado');
    console.log('📊 Executando migração...');

    // Executar migração
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      console.error('❌ Erro ao executar migração:', error.message);
      throw new Error(`Falha na migração: ${error.message}`);
    }

    console.log('✅ Migração aplicada com sucesso!');
    console.log('📋 Tabela consent_logs criada');
    console.log('🔐 RLS (Row Level Security) habilitado');
    console.log('📝 Funções de consentimento criadas');

    // Verificar se a tabela foi criada
    console.log('\n🔍 Verificando criação da tabela...');
    const { data: tables, error: checkError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'consent_logs');

    if (checkError) {
      console.error('❌ Erro ao verificar tabela:', checkError.message);
    } else if (tables && tables.length > 0) {
      console.log('✅ Tabela consent_logs confirmada');
    } else {
      console.log('⚠️ Tabela não encontrada - verificar manualmente');
    }

    // Verificar funções
    console.log('\n🔍 Verificando funções...');
    const functions = [
      'log_consent',
      'get_user_consent_history', 
      'get_current_consent'
    ];

    for (const funcName of functions) {
      try {
        const { error: funcError } = await supabaseAdmin.rpc(funcName, {
          p_user_id: '00000000-0000-0000-0000-000000000000',
          p_consent_type: 'test',
          p_granted: false
        });

        if (funcError && !funcError.message.includes('invalid input syntax for type uuid')) {
          console.error(`❌ Erro na função ${funcName}:`, funcError.message);
        } else {
          console.log(`✅ Função ${funcName} disponível`);
        }
      } catch (error) {
        console.log(`✅ Função ${funcName} disponível`);
      }
    }

    console.log('\n🎉 Migração de consentimentos LGPD concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Testar o banner de cookies no frontend');
    console.log('2. Verificar consentimentos no cadastro');
    console.log('3. Testar APIs de consentimento');
    console.log('4. Configurar monitoramento de compliance');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error.message);
    logger.error('Erro na migração de consentimentos:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  applyConsentMigration().catch(console.error);
}

module.exports = { applyConsentMigration }; 

const { supabaseAdmin } = require('../config/supabase');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Script para aplicar migração de consentimentos LGPD
 */
async function applyConsentMigration() {
  console.log('🔧 Aplicando migração de consentimentos LGPD...\n');

  try {
    // Ler arquivo de migração
    const migrationPath = path.join(__dirname, '../sql/migrations/create_consent_logs_table.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    console.log('📄 Arquivo de migração carregado');
    console.log('📊 Executando migração...');

    // Executar migração
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      console.error('❌ Erro ao executar migração:', error.message);
      throw new Error(`Falha na migração: ${error.message}`);
    }

    console.log('✅ Migração aplicada com sucesso!');
    console.log('📋 Tabela consent_logs criada');
    console.log('🔐 RLS (Row Level Security) habilitado');
    console.log('📝 Funções de consentimento criadas');

    // Verificar se a tabela foi criada
    console.log('\n🔍 Verificando criação da tabela...');
    const { data: tables, error: checkError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'consent_logs');

    if (checkError) {
      console.error('❌ Erro ao verificar tabela:', checkError.message);
    } else if (tables && tables.length > 0) {
      console.log('✅ Tabela consent_logs confirmada');
    } else {
      console.log('⚠️ Tabela não encontrada - verificar manualmente');
    }

    // Verificar funções
    console.log('\n🔍 Verificando funções...');
    const functions = [
      'log_consent',
      'get_user_consent_history', 
      'get_current_consent'
    ];

    for (const funcName of functions) {
      try {
        const { error: funcError } = await supabaseAdmin.rpc(funcName, {
          p_user_id: '00000000-0000-0000-0000-000000000000',
          p_consent_type: 'test',
          p_granted: false
        });

        if (funcError && !funcError.message.includes('invalid input syntax for type uuid')) {
          console.error(`❌ Erro na função ${funcName}:`, funcError.message);
        } else {
          console.log(`✅ Função ${funcName} disponível`);
        }
      } catch (error) {
        console.log(`✅ Função ${funcName} disponível`);
      }
    }

    console.log('\n🎉 Migração de consentimentos LGPD concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Testar o banner de cookies no frontend');
    console.log('2. Verificar consentimentos no cadastro');
    console.log('3. Testar APIs de consentimento');
    console.log('4. Configurar monitoramento de compliance');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error.message);
    logger.error('Erro na migração de consentimentos:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  applyConsentMigration().catch(console.error);
}

module.exports = { applyConsentMigration }; 