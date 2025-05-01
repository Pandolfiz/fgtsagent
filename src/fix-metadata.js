// Script para corrigir metadados e aplicar migrações
require('dotenv').config();
const { fixAllUserMetadata } = require('./utils/fix-user-metadata');
const { applyAllSql } = require('./sql/apply-migrations');
const logger = require('./utils/logger');

async function main() {
  try {
    // 1. Aplicar migrações e funções SQL
    logger.info('Aplicando migrações e funções SQL...');
    await applyAllSql();
    
    // 2. Corrigir metadados dos usuários
    logger.info('Corrigindo metadados dos usuários...');
    await fixAllUserMetadata();
    
    logger.info('Processo de correção concluído com sucesso!');
    return true;
  } catch (error) {
    logger.error(`Erro durante processo de correção: ${error.message}`);
    return false;
  }
}

// Executar script
if (require.main === module) {
  main()
    .then(result => {
      process.exit(result ? 0 : 1);
    })
    .catch(error => {
      logger.error(`Erro não tratado: ${error}`);
      process.exit(1);
    });
} 