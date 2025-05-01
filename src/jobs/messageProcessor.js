// Job para processamento de mensagens
const Bull = require('bull');
const messageService = require('../services/message');
const config = require('../config');
const logger = require('../utils/logger');

// Configurar fila Redis
const messageQueue = new Bull('message-processing', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password
  }
});

// Processar campanhas agendadas
messageQueue.process('process-campaigns', async (job) => {
  logger.info('Iniciando processamento de campanhas agendadas');
  
  try {
    const processed = await messageService.processPendingCampaigns();
    
    logger.info(`Processamento de campanhas concluído: ${processed.length} campanhas processadas`);
    
    return { processed };
  } catch (error) {
    logger.error(`Erro no processamento de campanhas: ${error.message}`);
    throw error;
  }
});

// Processar mensagens diretas agendadas
messageQueue.process('process-direct-messages', async (job) => {
  logger.info('Iniciando processamento de mensagens diretas agendadas');
  
  try {
    const processed = await messageService.processPendingDirectMessages();
    
    logger.info(`Processamento de mensagens diretas concluído: ${processed.length} mensagens processadas`);
    
    return { processed };
  } catch (error) {
    logger.error(`Erro no processamento de mensagens diretas: ${error.message}`);
    throw error;
  }
});

// Agendar jobs recorrentes
function scheduleRecurringJobs() {
  // Verificar campanhas a cada minuto
  messageQueue.add('process-campaigns', {}, {
    repeat: { cron: '* * * * *' }
  });
  
  // Verificar mensagens diretas a cada minuto
  messageQueue.add('process-direct-messages', {}, {
    repeat: { cron: '* * * * *' }
  });
  
  logger.info('Jobs recorrentes agendados');
}

// Eventos da fila
messageQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} concluído: ${job.name}`);
});

messageQueue.on('failed', (job, error) => {
  logger.error(`Job ${job.id} falhou: ${error.message}`);
});

module.exports = {
  messageQueue,
  scheduleRecurringJobs
};