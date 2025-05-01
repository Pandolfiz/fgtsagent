#!/usr/bin/env node
/**
 * Script para aplicar todas as migrações necessárias em ordem
 */

require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

// Importar funções
const { applyUtilityFunctions } = require('./apply-utility-functions');

async function applyMigration(filePath) {
  try {
    logger.info(`Aplicando migração: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      logger.error(`Arquivo de migração não encontrado: ${filePath}`);
      return false;
    }
    
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Tentar usar a função RPC exec_sql
    try {
      logger.info(`Tentando executar ${path.basename(filePath)} via função RPC exec_sql...`);
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: sqlContent });
      
      if (error) {
        logger.error(`Erro na migração via RPC: ${error.message}`);
        throw new Error(`Falha na migração via RPC: ${error.message}`);
      }
      
      logger.info(`Migração ${path.basename(filePath)} aplicada com sucesso via RPC!`);
      return true;
    } catch (rpcError) {
      logger.warn(`Não foi possível usar exec_sql: ${rpcError.message}`);
      
      // Exibir instruções para execução manual
      console.log(`\n⚠️ Não foi possível aplicar a migração ${path.basename(filePath)} automaticamente.`);
      console.log('Por favor, execute o seguinte SQL no console do Supabase:');
      console.log('\n' + sqlContent);
      
      // Perguntar se o usuário executou manualmente
      if (process.stdin.isTTY) {
        console.log('\nVocê já executou este SQL manualmente? (s/n)');
        process.stdin.setEncoding('utf8');
        
        const response = await new Promise(resolve => {
          process.stdin.once('data', data => {
            resolve(data.trim().toLowerCase());
          });
        });
        
        if (response === 's' || response === 'sim' || response === 'yes' || response === 'y') {
          logger.info(`Usuário confirmou execução manual da migração ${path.basename(filePath)}`);
          return true;
        } else {
          logger.warn(`Migração ${path.basename(filePath)} não foi executada.`);
          return false;
        }
      } else {
        logger.warn(`Não foi possível solicitar confirmação manual. Assumindo que a migração ${path.basename(filePath)} não foi executada.`);
        return false;
      }
    }
  } catch (error) {
    logger.error(`Erro ao aplicar migração ${path.basename(filePath)}: ${error.message}`);
    return false;
  }
}

async function applyAllMigrations() {
  console.log('Iniciando aplicação de todas as migrações necessárias...');
  let success = true;
  
  // 1. Primeiro aplicar as funções utilitárias
  logger.info('PASSO 1: Aplicando funções utilitárias...');
  if (await applyUtilityFunctions()) {
    console.log('✅ Funções utilitárias instaladas com sucesso!');
  } else {
    console.error('❌ Falha ao instalar funções utilitárias!');
    console.log('\nPor favor, execute as funções utilitárias manualmente no console SQL do Supabase conforme as instruções acima.');
    console.log('Depois volte a executar este script para continuar com as migrações.');
    return false;
  }
  
  // 2. Criar função get_user_profile
  logger.info('PASSO 2: Criando função get_user_profile...');
  const getUserProfilePath = path.resolve(__dirname, 'sql', 'migrations', 'create_get_user_profile_function.sql');
  if (await applyMigration(getUserProfilePath)) {
    console.log('✅ Função get_user_profile criada com sucesso!');
  } else {
    console.error('❌ Falha ao criar função get_user_profile!');
    success = false;
  }
  
  // 3. Aplicar migração para adicionar full_name
  logger.info('PASSO 3: Adicionando coluna full_name...');
  const addFullNamePath = path.resolve(__dirname, 'sql', 'migrations', 'add_full_name_to_user_profiles.sql');
  if (await applyMigration(addFullNamePath)) {
    console.log('✅ Coluna full_name adicionada com sucesso!');
  } else {
    console.error('❌ Falha ao adicionar coluna full_name!');
    success = false;
  }
  
  return success;
}

// Se executado diretamente
if (require.main === module) {
  applyAllMigrations()
    .then(success => {
      if (success) {
        console.log('\n✅ Todas as migrações foram aplicadas com sucesso!');
        console.log('O sistema deve funcionar normalmente agora.');
        process.exit(0);
      } else {
        console.error('\n⚠️ Algumas migrações falharam. Verifique os logs para mais detalhes.');
        console.log('Execute as migrações pendentes manualmente conforme instruções acima.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { applyAllMigrations }; 