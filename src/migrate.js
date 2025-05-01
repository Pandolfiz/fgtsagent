/**
 * Script executável para migração do banco de dados
 */
const { migrate } = require('./config/migrate');
const logger = require('./utils/logger');

async function main() {
  try {
    logger.info('Iniciando script de migração...');
    const result = await migrate();
    
    if (result.success) {
      logger.info(`Migração concluída: ${result.message}`);
      process.exit(0);
    } else {
      logger.error(`Falha na migração: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    logger.error(`Erro fatal durante a migração: ${error.message}`);
    process.exit(1);
  }
}

// Executar o script
main(); 