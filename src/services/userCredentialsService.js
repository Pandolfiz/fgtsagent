/**
 * Serviço para gerenciar credenciais de usuários (API keys)
 */
const { supabase, supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Adicionar chaves de teste para validação sem banco de dados
const TEST_API_KEYS = {
  'apikey_1234_teste': {
    keyId: 'test_key_id_1234',
    userId: 'test_user_123', 
    keyName: 'Chave de Teste',
    userEmail: 'usuario.teste@example.com',
    userName: 'Usuário de Teste',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString() // expira em 1 ano
  }
};

class UserCredentialsService {
  /**
   * Gera uma nova chave de API para o usuário
   * @param {string} userId - ID do usuário
   * @param {string} name - Nome descritivo da chave
   * @param {number} expiresInDays - Dias até a expiração (padrão: 365)
   * @returns {Promise<Object>} Objeto contendo a nova chave de API
   */
  async generateApiKey(userId, name, expiresInDays = 365) {
    try {
      logger.info(`Gerando nova chave API para usuário ${userId} com nome: ${name}`);
      
      // Usar a função RPC para criar a chave (definida no SQL)
      const { data, error } = await supabase.rpc('create_user_api_key', {
        p_user_id: userId,
        p_name: name,
        p_expires_in_days: expiresInDays
      });
      
      if (error) {
        logger.error(`Erro ao gerar chave API: ${error.message}`);
        throw new Error(`Falha ao gerar chave API: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        throw new Error('Não foi possível gerar a chave API');
      }
      
      logger.info(`Chave API gerada com sucesso para usuário ${userId}, prefix: ${data[0].key_prefix}`);
      
      return {
        id: data[0].id,
        name: data[0].name,
        key: data[0].key_value,
        prefix: data[0].key_prefix,
        expiresAt: data[0].expires_at
      };
    } catch (error) {
      logger.error(`Erro ao gerar chave API: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Lista todas as chaves de API de um usuário
   * @param {string} userId - ID do usuário
   * @returns {Promise<Array>} Array de chaves de API
   */
  async listApiKeys(userId) {
    try {
      logger.info(`Listando chaves API do usuário ${userId}`);
      
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('id, name, key_prefix, created_at, expires_at, is_active, last_used')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.error(`Erro ao listar chaves API: ${error.message}`);
        throw new Error(`Falha ao listar chaves API: ${error.message}`);
      }
      
      logger.info(`Recuperadas ${data.length} chaves API para o usuário ${userId}`);
      
      return data.map(key => ({
        id: key.id,
        name: key.name,
        prefix: key.key_prefix,
        createdAt: key.created_at,
        expiresAt: key.expires_at,
        isActive: key.is_active,
        lastUsed: key.last_used
      }));
    } catch (error) {
      logger.error(`Erro ao listar chaves API: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Revoga (desativa) uma chave de API
   * @param {string} keyId - ID da chave a ser revogada
   * @param {string} userId - ID do usuário proprietário da chave
   * @returns {Promise<boolean>} Resultado da operação
   */
  async revokeApiKey(keyId, userId) {
    try {
      logger.info(`Revogando chave API ${keyId} do usuário ${userId}`);
      
      // Usar a função RPC para revogar a chave (definida no SQL)
      const { data, error } = await supabase.rpc('revoke_user_api_key', {
        p_key_id: keyId
      });
      
      if (error) {
        logger.error(`Erro ao revogar chave API: ${error.message}`);
        throw new Error(`Falha ao revogar chave API: ${error.message}`);
      }
      
      // Verificar se a operação foi bem-sucedida
      if (data !== true) {
        logger.warn(`Falha ao revogar chave API ${keyId}: Permissão negada ou chave não encontrada`);
        return false;
      }
      
      logger.info(`Chave API ${keyId} revogada com sucesso`);
      return true;
    } catch (error) {
      logger.error(`Erro ao revogar chave API: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Atualiza o nome de uma chave de API
   * @param {string} keyId - ID da chave
   * @param {string} newName - Novo nome para a chave
   * @param {string} userId - ID do usuário proprietário da chave
   * @returns {Promise<Object>} Chave atualizada
   */
  async updateApiKeyName(keyId, newName, userId) {
    try {
      logger.info(`Atualizando nome da chave API ${keyId} para "${newName}"`);
      
      // Verificar se a chave pertence ao usuário
      const { data: keyData, error: keyError } = await supabase
        .from('user_api_keys')
        .select('id')
        .eq('id', keyId)
        .eq('user_id', userId)
        .single();
      
      if (keyError || !keyData) {
        logger.warn(`Chave API ${keyId} não encontrada ou não pertence ao usuário ${userId}`);
        throw new Error('Chave não encontrada ou acesso negado');
      }
      
      // Atualizar o nome da chave
      const { data, error } = await supabase
        .from('user_api_keys')
        .update({ 
          name: newName,
          updated_at: new Date().toISOString()
        })
        .eq('id', keyId)
        .select('id, name, key_prefix, created_at, expires_at, is_active')
        .single();
      
      if (error) {
        logger.error(`Erro ao atualizar nome da chave API: ${error.message}`);
        throw new Error(`Falha ao atualizar nome da chave: ${error.message}`);
      }
      
      logger.info(`Nome da chave API ${keyId} atualizado com sucesso`);
      
      return {
        id: data.id,
        name: data.name,
        prefix: data.key_prefix,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
        isActive: data.is_active
      };
    } catch (error) {
      logger.error(`Erro ao atualizar nome da chave API: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Verifica e valida uma chave de API
   * @param {string} apiKey - Valor da chave API a ser validada
   * @returns {Promise<Object|null>} Informações do usuário e chave, ou null se inválida
   */
  async validateApiKey(apiKey) {
    try {
      if (!apiKey) {
        logger.warn('Tentativa de validação com chave API vazia');
        return null;
      }
      
      logger.info('Validando chave API');
      
      // Verificar se é uma chave de teste
      if (TEST_API_KEYS[apiKey]) {
        logger.info(`Chave API de teste encontrada: ${apiKey.substring(0, 5)}...`);
        return TEST_API_KEYS[apiKey];
      }
      
      // Buscar chave no banco de dados
      const { data, error } = await supabaseAdmin
        .from('user_api_keys')
        .select(`
          id, 
          user_id, 
          name, 
          expires_at, 
          is_active,
          auth.users!user_id (
            email,
            user_metadata
          )
        `)
        .eq('key_value', apiKey)
        .single();
      
      if (error || !data) {
        logger.warn(`Chave API não encontrada: ${error?.message || 'Não encontrada'}`);
        return null;
      }
      
      // Verificar se a chave está ativa
      if (!data.is_active) {
        logger.warn(`Tentativa de uso de chave API revogada: ${data.id}`);
        return null;
      }
      
      // Verificar se a chave não expirou
      const now = new Date();
      const expiryDate = new Date(data.expires_at);
      
      if (expiryDate < now) {
        logger.warn(`Tentativa de uso de chave API expirada: ${data.id}`);
        return null;
      }
      
      // Atualizar data de último uso
      await supabaseAdmin
        .from('user_api_keys')
        .update({ 
          last_used: new Date().toISOString() 
        })
        .eq('id', data.id);
      
      logger.info(`Chave API ${data.id} validada com sucesso para usuário ${data.user_id}`);
      
      // Retornar informações do usuário e da chave
      return {
        keyId: data.id,
        userId: data.user_id,
        keyName: data.name,
        userEmail: data.auth?.users?.email,
        userName: data.auth?.users?.user_metadata?.name,
        expiresAt: data.expires_at
      };
    } catch (error) {
      logger.error(`Erro ao validar chave API: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Registra o uso de uma API key
   * @param {string} keyId - ID da chave API
   * @param {string} operation - Operação realizada (GET, POST, etc)
   * @param {string} endpoint - Endpoint acessado
   * @param {Object} requestInfo - Informações adicionais da requisição
   */
  async logApiKeyUsage(keyId, operation, endpoint, requestInfo = {}) {
    try {
      // Ignorar logs para chaves de teste
      if (keyId && keyId.startsWith('test_key_id_')) {
        logger.info(`[TESTE] Uso de chave API de teste ${keyId} registrado (simulado)`);
        return true;
      }
      
      logger.info(`Registrando uso da chave API ${keyId}`);
      
      const { error } = await supabase
        .from('api_key_usage')
        .insert({
          key_id: keyId,
          operation,
          endpoint,
          request_info: requestInfo,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        logger.error(`Erro ao registrar uso da chave API: ${error.message}`);
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error(`Erro ao registrar uso da chave API: ${error.message}`);
      return false;
    }
  }
}

module.exports = new UserCredentialsService(); 