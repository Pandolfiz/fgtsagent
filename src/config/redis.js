/**
 * Configuração do Redis
 * 
 * Este arquivo fornece uma configuração para uso do Redis ou um mock
 * simplificado quando o Redis não está disponível ou configurado
 */

const logger = require('../utils/logger');
const mockRedis = {
  set: async (key, value, options) => {
    logger.info(`[Mock Redis] SET ${key}`);
    return 'OK';
  },
  get: async (key) => {
    logger.info(`[Mock Redis] GET ${key}`);
    return null;
  },
  del: async (key) => {
    logger.info(`[Mock Redis] DEL ${key}`);
    return 1;
  },
  setex: async (key, seconds, value) => {
    logger.info(`[Mock Redis] SETEX ${key} ${seconds}`);
    return 'OK';
  }
};

// Verificar se o Redis está configurado via variáveis de ambiente
const redisUrl = process.env.REDIS_URL;

let redis = mockRedis;

if (redisUrl) {
  try {
    // Tentar importar o pacote redis
    const { createClient } = require('redis');
    
    logger.info('Conectando ao Redis...');
    
    // Criar cliente Redis
    const client = createClient({
      url: redisUrl
    });

    // Conectar ao Redis
    client.on('error', (err) => {
      logger.error(`Erro no Redis: ${err}`);
      logger.warn('Usando Redis mock devido a erro de conexão');
      redis = mockRedis;
    });

    client.on('connect', () => {
      logger.info('Conectado ao Redis com sucesso');
    });

    // Atribuir client ao redis que será exportado
    redis = client;

    // Iniciar conexão
    (async () => {
      try {
        await client.connect();
      } catch (err) {
        logger.error(`Falha ao conectar ao Redis: ${err.message}`);
        logger.warn('Usando Redis mock devido a falha na conexão');
        redis = mockRedis;
      }
    })();
  } catch (err) {
    logger.error(`Falha ao carregar módulo do Redis: ${err.message}`);
    logger.warn('Usando Redis mock devido a módulo não encontrado');
  }
} else {
  logger.warn('REDIS_URL não configurado. Usando Redis mock');
}

module.exports = redis; 