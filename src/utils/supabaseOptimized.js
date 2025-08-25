/**
 * Utilitário otimizado para operações do Supabase com cache e timeouts reduzidos
 */
const logger = require('./logger');

// Cache simples em memória
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Limpa cache expirado
 */
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

// Limpar cache a cada 10 minutos
setInterval(cleanExpiredCache, 10 * 60 * 1000);

/**
 * Adiciona timeout a uma operação do Supabase (reduzido para 5s)
 */
async function withTimeout(supabaseOperation, timeoutMs = 5000, operationName = 'Supabase operation') {
  const timeoutPromise = new Promise((_, rejectTimeout) => {
    setTimeout(() => {
      rejectTimeout(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([supabaseOperation, timeoutPromise]);
    return result;
  } catch (error) {
    if (error.message && typeof error.message === 'string' && error.message.includes('timed out')) {
      logger.error(`[TIMEOUT] ${operationName} excedeu o timeout de ${timeoutMs}ms`);
    } else {
      logger.error(`[ERROR] ${operationName} falhou: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Query otimizada com cache e timeout reduzido
 */
async function optimizedSelect(supabaseClient, table, columns = '*', filters = {}, timeoutMs = 5000, useCache = true) {
  // Criar chave de cache
  const cacheKey = `${table}:${columns}:${JSON.stringify(filters)}`;
  
  // Verificar cache se habilitado
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.info(`[CACHE] Hit para ${cacheKey}`);
      return cached.data;
    }
  }

  let query = supabaseClient.from(table).select(columns);
  
  // Aplicar filtros
  Object.entries(filters).forEach(([key, value]) => {
    if (key === 'eq') {
      Object.entries(value).forEach(([column, val]) => {
        query = query.eq(column, val);
      });
    } else if (key === 'limit') {
      query = query.limit(value);
    } else if (key === 'order') {
      query = query.order(value.column, { ascending: value.ascending });
    } else if (key === 'gte') {
      Object.entries(value).forEach(([column, val]) => {
        query = query.gte(column, val);
      });
    } else if (key === 'lte') {
      Object.entries(value).forEach(([column, val]) => {
        query = query.lte(column, val);
      });
    }
  });
  
  const operationName = `SELECT ${columns} FROM ${table}`;
  const result = await withTimeout(query, timeoutMs, operationName);
  
  // Armazenar no cache se habilitado
  if (useCache && result.data) {
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    logger.info(`[CACHE] Miss para ${cacheKey}, armazenado`);
  }
  
  return result;
}

/**
 * Query otimizada para mensagens com LIMIT padrão
 */
async function optimizedMessagesQuery(supabaseClient, conversationId, limit = 100, timeoutMs = 3000) {
  const cacheKey = `messages:${conversationId}:${limit}`;
  
  // Verificar cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.info(`[CACHE] Hit para mensagens ${conversationId}`);
    return cached.data;
  }

  const query = supabaseClient
    .from('messages')
    .select('id, content, sender_id, recipient_id, timestamp, status, role')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true })
    .limit(limit);

  const result = await withTimeout(query, timeoutMs, `Messages query for ${conversationId}`);
  
  // Armazenar no cache
  if (result.data) {
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    logger.info(`[CACHE] Miss para mensagens ${conversationId}, armazenado`);
  }
  
  return result;
}

/**
 * Query otimizada para dashboard stats
 */
async function optimizedDashboardQuery(supabaseClient, userId, period, startDate, endDate, timeoutMs = 5000) {
  const cacheKey = `dashboard:${userId}:${period}:${startDate}:${endDate}`;
  
  // Verificar cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.info(`[CACHE] Hit para dashboard ${userId}`);
    return cached.data;
  }

  // Query otimizada com colunas específicas
  const query = supabaseClient
    .from('leads')
    .select('id, name, cpf, balance, simulation, error_reason, updated_at, status')
    .eq('client_id', userId)
    .gte('updated_at', startDate)
    .lte('updated_at', endDate)
    .order('updated_at', { ascending: false })
    .limit(1000);

  const result = await withTimeout(query, timeoutMs, `Dashboard query for ${userId}`);
  
  // Armazenar no cache
  if (result.data) {
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    logger.info(`[CACHE] Miss para dashboard ${userId}, armazenado`);
  }
  
  return result;
}

/**
 * Query otimizada para leads com propostas
 */
async function optimizedLeadsWithProposals(supabaseClient, userId, timeoutMs = 5000) {
  const cacheKey = `leads_proposals:${userId}`;
  
  // Verificar cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.info(`[CACHE] Hit para leads com propostas ${userId}`);
    return cached.data;
  }

  // Query otimizada
  const query = supabaseClient
    .from('leads')
    .select(`
      id, name, cpf, balance, simulation, balance_error, updated_at, status,
      proposals!inner(id, status, value)
    `)
    .eq('client_id', userId)
    .order('updated_at', { ascending: false })
    .limit(500);

  const result = await withTimeout(query, timeoutMs, `Leads with proposals for ${userId}`);
  
  // Armazenar no cache
  if (result.data) {
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    logger.info(`[CACHE] Miss para leads com propostas ${userId}, armazenado`);
  }
  
  return result;
}

/**
 * Limpar cache específico
 */
function clearCache(pattern = null) {
  if (!pattern) {
    cache.clear();
    logger.info('[CACHE] Cache limpo completamente');
    return;
  }
  
  for (const [key] of cache.entries()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
  logger.info(`[CACHE] Cache limpo para padrão: ${pattern}`);
}

/**
 * Estatísticas do cache
 */
function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}

module.exports = {
  withTimeout,
  optimizedSelect,
  optimizedMessagesQuery,
  optimizedDashboardQuery,
  optimizedLeadsWithProposals,
  clearCache,
  getCacheStats
}; 