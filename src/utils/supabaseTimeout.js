/**
 * Utilitário para adicionar timeout às operações do Supabase
 */
const logger = require('./logger');

/**
 * Adiciona timeout a uma operação do Supabase
 * @param {Promise} supabaseOperation - A operação do Supabase
 * @param {number} timeoutMs - Timeout em milissegundos (padrão: 30000ms = 30s)
 * @param {string} operationName - Nome da operação para logs
 * @returns {Promise} A operação com timeout
 */
async function withTimeout(supabaseOperation, timeoutMs = 30000, operationName = 'Supabase operation') {
  // Timeout promise
  const timeoutPromise = new Promise((_, rejectTimeout) => {
    setTimeout(() => {
      rejectTimeout(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    // Race entre a operação e o timeout
    const result = await Promise.race([supabaseOperation, timeoutPromise]);
    return result;
  } catch (error) {
    // Log do erro com informações úteis
    if (error.message && typeof error.message === 'string' && error.message.includes('timed out')) {
      logger.error(`[TIMEOUT] ${operationName} excedeu o timeout de ${timeoutMs}ms`);
    } else {
      logger.error(`[ERROR] ${operationName} falhou: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Wrapper para operações SELECT do Supabase com timeout
 * @param {object} supabaseClient - Cliente Supabase
 * @param {string} table - Nome da tabela
 * @param {string} columns - Colunas a selecionar
 * @param {object} filters - Filtros a aplicar
 * @param {number} timeoutMs - Timeout em milissegundos
 * @returns {Promise} Resultado da operação
 */
async function selectWithTimeout(supabaseClient, table, columns = '*', filters = {}, timeoutMs = 30000) {
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
    }
    // Adicionar mais filtros conforme necessário
  });
  
  const operationName = `SELECT ${columns} FROM ${table}`;
  return withTimeout(query, timeoutMs, operationName);
}

/**
 * Wrapper para operações INSERT do Supabase com timeout
 * @param {object} supabaseClient - Cliente Supabase
 * @param {string} table - Nome da tabela
 * @param {object} data - Dados a inserir
 * @param {number} timeoutMs - Timeout em milissegundos
 * @returns {Promise} Resultado da operação
 */
async function insertWithTimeout(supabaseClient, table, data, timeoutMs = 30000) {
  const query = supabaseClient.from(table).insert(data);
  const operationName = `INSERT INTO ${table}`;
  return withTimeout(query, timeoutMs, operationName);
}

/**
 * Wrapper para operações UPDATE do Supabase com timeout
 * @param {object} supabaseClient - Cliente Supabase
 * @param {string} table - Nome da tabela
 * @param {object} data - Dados a atualizar
 * @param {object} filters - Filtros WHERE
 * @param {number} timeoutMs - Timeout em milissegundos
 * @returns {Promise} Resultado da operação
 */
async function updateWithTimeout(supabaseClient, table, data, filters = {}, timeoutMs = 30000) {
  let query = supabaseClient.from(table).update(data);
  
  // Aplicar filtros WHERE
  Object.entries(filters).forEach(([key, value]) => {
    if (key === 'eq') {
      Object.entries(value).forEach(([column, val]) => {
        query = query.eq(column, val);
      });
    }
  });
  
  const operationName = `UPDATE ${table}`;
  return withTimeout(query, timeoutMs, operationName);
}

/**
 * Wrapper para operações DELETE do Supabase com timeout
 * @param {object} supabaseClient - Cliente Supabase
 * @param {string} table - Nome da tabela
 * @param {object} filters - Filtros WHERE
 * @param {number} timeoutMs - Timeout em milissegundos
 * @returns {Promise} Resultado da operação
 */
async function deleteWithTimeout(supabaseClient, table, filters = {}, timeoutMs = 30000) {
  let query = supabaseClient.from(table).delete();
  
  // Aplicar filtros WHERE
  Object.entries(filters).forEach(([key, value]) => {
    if (key === 'eq') {
      Object.entries(value).forEach(([column, val]) => {
        query = query.eq(column, val);
      });
    }
  });
  
  const operationName = `DELETE FROM ${table}`;
  return withTimeout(query, timeoutMs, operationName);
}

/**
 * Wrapper para operações RPC do Supabase com timeout
 * @param {object} supabaseClient - Cliente Supabase
 * @param {string} functionName - Nome da função RPC
 * @param {object} params - Parâmetros da função
 * @param {number} timeoutMs - Timeout em milissegundos
 * @returns {Promise} Resultado da operação
 */
async function rpcWithTimeout(supabaseClient, functionName, params = {}, timeoutMs = 30000) {
  const query = supabaseClient.rpc(functionName, params);
  const operationName = `RPC ${functionName}`;
  return withTimeout(query, timeoutMs, operationName);
}

module.exports = {
  withTimeout,
  selectWithTimeout,
  insertWithTimeout,
  updateWithTimeout,
  deleteWithTimeout,
  rpcWithTimeout
}; 