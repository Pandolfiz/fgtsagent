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
let redisInitialized = false;

// Função para inicializar o Redis
async function initializeRedis() {
  if (redisInitialized) {
    return redis;
  }

  if (!redisUrl) {
    logger.warn('REDIS_URL não configurado. Usando Redis mock');
    redisInitialized = true;
    return mockRedis;
  }

  try {
    // Tentar importar o pacote redis
    const { createClient } = require('redis');
    
    logger.info('Conectando ao Redis...');
    
    // Criar cliente Redis
    const client = createClient({
      url: redisUrl
    });

    // Configurar event handlers
    client.on('error', (err) => {
      logger.error(`Erro no Redis: ${err}`);
      logger.warn('Usando Redis mock devido a erro de conexão');
      redis = mockRedis;
    });

    client.on('connect', () => {
      logger.info('Conectado ao Redis com sucesso');
    });

    client.on('ready', () => {
      logger.info('Redis pronto para uso');
    });

    client.on('end', () => {
      logger.warn('Conexão com Redis encerrada');
    });

    try {
      // Aguardar conexão ser estabelecida
      await client.connect();
      redis = client;
      redisInitialized = true;
      logger.info('Redis inicializado com sucesso');
    } catch (err) {
      logger.error(`Falha ao conectar ao Redis: ${err.message}`);
      logger.warn('Usando Redis mock devido a falha na conexão');
      redis = mockRedis;
      redisInitialized = true;
    }
  } catch (err) {
    logger.error(`Falha ao carregar módulo do Redis: ${err.message}`);
    logger.warn('Usando Redis mock devido a módulo não encontrado');
    redis = mockRedis;
    redisInitialized = true;
  }

  return redis;
}

// Proxy para garantir que o Redis seja inicializado antes de qualquer operação
const redisProxy = new Proxy(mockRedis, {
  get(target, prop) {
    if (prop === 'initialize') {
      return initializeRedis;
    }
    
    // Se a propriedade for um método, retornar uma versão que inicializa o Redis primeiro
    if (typeof target[prop] === 'function') {
      return async function(...args) {
        await initializeRedis();
        return redis[prop](...args);
      };
    }
    
    return target[prop];
  }
});

// Inicializar Redis no background, mas não bloquear a exportação
initializeRedis().catch(err => {
  logger.error(`Erro na inicialização do Redis: ${err.message}`);
});

module.exports = redisProxy; 