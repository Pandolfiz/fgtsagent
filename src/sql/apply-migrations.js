// Script para aplicar migrações e funções SQL no Supabase
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../services/database');
const logger = require('../utils/logger');

// Diretórios das migrações e funções
const migrationsDir = path.join(__dirname, 'migrations');
const functionsDir = path.join(__dirname, 'functions');

// Função para ler arquivos SQL
async function readSqlFiles(directory) {
  try {
    const files = fs.readdirSync(directory);
    const sqlFiles = files.filter(file => file.endsWith('.sql'));
    
    return sqlFiles.map(file => ({
      name: file.replace('.sql', ''),
      path: path.join(directory, file),
      content: fs.readFileSync(path.join(directory, file), 'utf8')
    }));
  } catch (error) {
    logger.error(`Erro ao ler arquivos SQL: ${error.message}`);
    return [];
  }
}

// Função para aplicar uma migração SQL
async function applySql(name, sql) {
  try {
    logger.info(`Aplicando SQL: ${name}`);
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      logger.error(`Erro ao aplicar SQL ${name}: ${error.message}`);
      // Tenta executar o SQL diretamente como fallback
      try {
        logger.info(`Tentando executar SQL ${name} diretamente`);
        await supabaseAdmin.sql(sql);
        logger.info(`SQL ${name} executado com sucesso via método direto`);
      } catch (directError) {
        logger.error(`Erro ao executar SQL ${name} diretamente: ${directError.message}`);
        throw directError;
      }
    } else {
      logger.info(`SQL ${name} aplicado com sucesso`);
    }
  } catch (error) {
    logger.error(`Erro ao processar SQL ${name}: ${error.message}`);
    throw error;
  }
}

// Função principal para aplicar migrações e funções
async function applyAllSql() {
  try {
    // Aplicar migrações
    const migrations = await readSqlFiles(migrationsDir);
    logger.info(`Encontradas ${migrations.length} migrações para aplicar`);
    
    for (const migration of migrations) {
      await applySql(`Migração: ${migration.name}`, migration.content);
    }
    
    // Aplicar funções
    const functions = await readSqlFiles(functionsDir);
    logger.info(`Encontradas ${functions.length} funções para aplicar`);
    
    for (const func of functions) {
      await applySql(`Função: ${func.name}`, func.content);
    }
    
    logger.info('Processo de aplicação SQL concluído com sucesso');
  } catch (error) {
    logger.error(`Erro no processo de aplicação SQL: ${error.message}`);
    process.exit(1);
  }
}

// Verificar se estamos executando diretamente
if (require.main === module) {
  logger.info('Iniciando aplicação de migrações e funções SQL...');
  applyAllSql()
    .then(() => {
      logger.info('Aplicação de SQL concluída');
      process.exit(0);
    })
    .catch(error => {
      logger.error(`Erro na aplicação de SQL: ${error.message}`);
      process.exit(1);
    });
} else {
  // Exportar para uso como módulo
  module.exports = {
    applyAllSql,
    applySql
  };
} 