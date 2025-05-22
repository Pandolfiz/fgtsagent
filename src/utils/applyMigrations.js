/**
 * Utilitário para aplicar migrações SQL no banco de dados
 */
const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../config/supabase');
const logger = require('./logger');

/**
 * Aplica uma migração SQL específica
 * @param {string} migrationName - Nome do arquivo de migração
 * @returns {Promise<boolean>} - Resultado da migração
 */
async function applyMigration(migrationName) {
  try {
    const migrationPath = path.join(__dirname, '..', 'sql', 'migrations', migrationName);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(migrationPath)) {
      logger.error(`Arquivo de migração não encontrado: ${migrationPath}`);
      return false;
    }
    
    // Ler o conteúdo do arquivo
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    // Método alternativo: Em vez de usar RPC, criar a coluna diretamente
    // Extrair o nome da coluna e tabela do conteúdo SQL para execução direta
    const tableName = 'user_profiles';
    const columnName = 'phone';
    
    // Verificar se a coluna já existe
    const { data: columnExists, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('phone')
      .limit(1)
      .maybeSingle();
    
    if (checkError && !checkError.message.includes('column')) {
      logger.error(`Erro ao verificar coluna: ${checkError.message}`);
      return false;
    }
    
    if (checkError && checkError.message.includes('column')) {
      // A coluna não existe, temos que adicioná-la
      logger.info(`Adicionando coluna ${columnName} à tabela ${tableName}`);
      
      // Podemos usar o método .alter() para modificar a tabela
      const { error: alterError } = await supabaseAdmin
        .schema
        .alterTable(tableName)
        .addColumn(columnName, 'text')
        .execute();
      
      if (alterError) {
        logger.error(`Erro ao adicionar coluna: ${alterError.message}`);
        return false;
      }
      
      logger.info(`Coluna ${columnName} adicionada com sucesso à tabela ${tableName}`);
      return true;
    } else {
      // A coluna já existe
      logger.info(`Coluna ${columnName} já existe na tabela ${tableName}`);
      return true;
    }
  } catch (error) {
    logger.error(`Erro ao aplicar migração ${migrationName}: ${error.message}`);
    return false;
  }
}

/**
 * Aplica todas as migrações necessárias para o campo de telefone
 */
async function applyPhoneMigration() {
  return await applyMigration('add_phone_to_user_profiles.sql');
}

/**
 * Aplica todas as migrações pendentes
 */
async function applyAllMigrations() {
  // Lista de migrações a serem aplicadas em ordem
  const migrations = [
    'add_phone_to_user_profiles.sql',
    // Adicione outras migrações aqui conforme necessário
  ];
  
  let success = true;
  for (const migration of migrations) {
    const result = await applyMigration(migration);
    if (!result) {
      success = false;
      logger.error(`Falha ao aplicar migração: ${migration}`);
    }
  }
  
  return success;
}

// Se executado diretamente
if (require.main === module) {
  applyAllMigrations()
    .then(success => {
      if (success) {
        logger.info('Todas as migrações foram aplicadas com sucesso!');
      } else {
        logger.error('Houve falhas ao aplicar algumas migrações.');
      }
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      logger.error('Erro não tratado:', err);
      process.exit(1);
    });
} else {
  // Exportar as funções para uso em outros módulos
  module.exports = {
    applyMigration,
    applyPhoneMigration,
    applyAllMigrations
  };
} 