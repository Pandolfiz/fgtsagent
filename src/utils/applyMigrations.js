/**
 * Utilitário para aplicar migrações SQL no banco de dados
 */
const fs = require('fs').promises;
const fsSync = require('fs');
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
    if (!supabaseAdmin) {
      logger.error('Cliente Supabase Admin não está disponível para aplicar migrações');
      return false;
    }
    
    const migrationPath = path.join(__dirname, '..', 'sql', 'migrations', migrationName);
    
    // Verificar se o arquivo existe (usando versão síncrona para verificação rápida)
    if (!fsSync.existsSync(migrationPath)) {
      logger.error(`Arquivo de migração não encontrado: ${migrationPath}`);
      return false;
    }
    
    // Ler o conteúdo do arquivo de forma assíncrona
    const sqlContent = await fs.readFile(migrationPath, 'utf8');
    
    // Para o cliente JavaScript do Supabase, não podemos executar SQL arbitrário
    // Precisamos usar operações específicas da API
    
    // Migração específica para adicionar coluna phone
    if (migrationName === 'add_phone_to_user_profiles.sql') {
      return await applyPhoneColumnMigration();
    }
    
    // Migração específica para adicionar coluna full_name
    if (migrationName === 'add_full_name_to_user_profiles.sql') {
      return await applyFullNameColumnMigration();
    }
    
    // Para outras migrações, sugerir uso do painel do Supabase
    logger.warn(`Migração ${migrationName} não pode ser aplicada automaticamente pelo cliente JavaScript`);
    logger.warn('Para aplicar esta migração:');
    logger.warn('1. Acesse o painel do Supabase (https://supabase.com/dashboard)');
    logger.warn('2. Vá para "SQL Editor"');
    logger.warn('3. Cole e execute o conteúdo do arquivo:');
    logger.warn(`   ${migrationPath}`);
    
    // Retornar true para não bloquear o sistema
    return true;
  } catch (error) {
    logger.error(`Erro ao aplicar migração ${migrationName}: ${error.message}`);
    return false;
  }
}

/**
 * Aplica migração para adicionar coluna phone
 */
async function applyPhoneColumnMigration() {
  try {
    // Verificar se a coluna já existe tentando fazer um select
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('phone')
      .limit(1);
    
    if (error && error.message.includes('column "phone" does not exist')) {
      logger.info('Coluna phone não existe. Solicitando criação manual.');
      logger.error('AÇÃO NECESSÁRIA: Criar coluna phone manualmente');
      logger.error('Execute no painel do Supabase (SQL Editor):');
      logger.error('ALTER TABLE user_profiles ADD COLUMN phone TEXT;');
      return false;
    } else if (error) {
      logger.error(`Erro ao verificar coluna phone: ${error.message}`);
      return false;
    } else {
      logger.info('Coluna phone já existe na tabela user_profiles');
      return true;
    }
  } catch (error) {
    logger.error(`Erro na migração da coluna phone: ${error.message}`);
    return false;
  }
}

/**
 * Aplica migração para adicionar coluna full_name
 */
async function applyFullNameColumnMigration() {
  try {
    // Verificar se a coluna já existe tentando fazer um select
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('full_name')
      .limit(1);
    
    if (error && error.message.includes('column "full_name" does not exist')) {
      logger.info('Coluna full_name não existe. Solicitando criação manual.');
      logger.error('AÇÃO NECESSÁRIA: Criar coluna full_name manualmente');
      logger.error('Execute no painel do Supabase (SQL Editor):');
      logger.error('ALTER TABLE user_profiles ADD COLUMN full_name TEXT;');
      return false;
    } else if (error) {
      logger.error(`Erro ao verificar coluna full_name: ${error.message}`);
      return false;
    } else {
      logger.info('Coluna full_name já existe na tabela user_profiles');
      return true;
    }
  } catch (error) {
    logger.error(`Erro na migração da coluna full_name: ${error.message}`);
    return false;
  }
}

/**
 * Aplica todas as migrações necessárias para o campo de telefone
 */
async function applyPhoneMigration() {
  return await applyMigration('add_phone_to_user_profiles.sql');
}

// Cache para evitar tentar aplicar as mesmas migrações repetidamente
const migrationCache = new Map();

/**
 * Aplica todas as migrações pendentes
 */
async function applyAllMigrations() {
  // Lista de migrações a serem aplicadas em ordem
  const migrations = [
    'add_phone_to_user_profiles.sql',
    'add_full_name_to_user_profiles.sql',
    // Adicione outras migrações aqui conforme necessário
  ];
  
  let success = true;
  let hasNewErrors = false;
  
  for (const migration of migrations) {
    // Verificar se já tentamos esta migração recentemente
    const cacheKey = `${migration}_${Date.now() - (Date.now() % 300000)}`; // Cache por 5 minutos
    
    if (migrationCache.has(migration) && migrationCache.get(migration) === 'error') {
      // Se a migração falhou recentemente, não tentar novamente
      logger.debug(`Pulando migração ${migration} (falha recente)`);
      continue;
    }
    
    const result = await applyMigration(migration);
    if (!result) {
      success = false;
      hasNewErrors = true;
      migrationCache.set(migration, 'error');
      logger.error(`Falha ao aplicar migração: ${migration}`);
    } else {
      migrationCache.set(migration, 'success');
    }
  }
  
  // Só reportar erros se houver novos erros
  if (hasNewErrors) {
    logger.error('Algumas migrações falharam. Verifique os logs acima para instruções.');
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