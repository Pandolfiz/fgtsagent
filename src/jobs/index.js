// Inicializador de jobs
const { scheduleRecurringJobs } = require('./messageProcessor');
const logger = require('../utils/logger');

function initializeJobs() {
  logger.info('Inicializando sistema de jobs');
  
  try {
    // Iniciar jobs recorrentes
    scheduleRecurringJobs();
    
    logger.info('Sistema de jobs inicializado com sucesso');
  } catch (error) {
    logger.error(`Erro ao inicializar sistema de jobs: ${error.message}`);
    throw error;
  }
}

module.exports = {
  initializeJobs
};