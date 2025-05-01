#!/usr/bin/env node
/**
 * Script para executar migrações no banco de dados
 * Uso: node run-migration.js [arquivo_de_migração]
 */

require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

async function runMigration(migrationFile) {
  try {
    logger.info(`Executando migração: ${migrationFile}`);
    
    // Ler arquivo de migração
    const filePath = path.resolve(__dirname, 'sql', 'migrations', migrationFile);
    
    if (!fs.existsSync(filePath)) {
      logger.error(`Arquivo de migração não encontrado: ${filePath}`);
      process.exit(1);
    }
    
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Executar SQL via supabase
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      logger.error(`Erro na execução da migração: ${error.message}`);
      throw new Error(`Falha na migração: ${error.message}`);
    }
    
    logger.info('Migração executada com sucesso!');
    return true;
  } catch (error) {
    logger.error(`Erro na migração: ${error.message}`);
    return false;
  }
}

// Se executado diretamente
if (require.main === module) {
  const args = process.argv.slice(2);
  const migrationFile = args[0];
  
  if (!migrationFile) {
    console.log('Uso: node run-migration.js [arquivo_de_migração]');
    console.log('Exemplo: node run-migration.js 002_add_workflow_metadata.sql');
    process.exit(1);
  }
  
  runMigration(migrationFile)
    .then(success => {
      if (success) {
        console.log('✅ Migração concluída com sucesso!');
        process.exit(0);
      } else {
        console.error('❌ Falha na migração!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { runMigration }; 