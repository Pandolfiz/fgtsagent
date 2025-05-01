/**
 * Serviço para gerenciar credenciais com opções de autenticação
 */
const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

class CredentialsService {
  constructor() {
    // A chave anon já está configurada no cliente supabase
    this.supabaseAdmin = supabase; // Para operações que requerem privilégios de admin
  }

  /**
   * Salva uma credencial usando autenticação de serviço
   * Útil para callbacks OAuth2 onde o usuário não está autenticado via JWT
   * @param {Object} credentialData - Dados da credencial
   * @returns {Promise<Object>} - Credencial salva ou erro
   */
  async saveCredentialAsServiceRole(credentialData) {
    try {
      logger.info('Salvando credencial usando service_role');
      
      // Verificar dados essenciais
      if (!credentialData.name || !credentialData.type || !credentialData.organization_id) {
        throw new Error('Dados incompletos: name, type e organization_id são obrigatórios');
      }
      
      // Método 1: Usar a função RPC save_credential_anonymous
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('save_credential_anonymous', {
          p_name: credentialData.name,
          p_type: credentialData.type,
          p_organization_id: credentialData.organization_id,
          p_data: credentialData.data || {},
          p_created_by: credentialData.created_by || null
        });

        if (rpcError) {
          logger.error(`Erro ao salvar credencial via RPC: ${rpcError.message || JSON.stringify(rpcError)}`, rpcError);
          throw new Error(`Erro ao salvar credencial via RPC: ${rpcError.message || JSON.stringify(rpcError)}`);
        }
        
        if (rpcData) {
          logger.info(`Credencial salva com sucesso via RPC: ${rpcData.id}`);
          return rpcData;
        }
      } catch (rpcError) {
        logger.warn(`RPC falhou, tentando método alternativo: ${rpcError.message}`);
      }
      
      // Método 2: Tentativa direta com service_role
      try {
        // Preparar objeto para inserção
        const credentialObj = {
          name: credentialData.name,
          type: credentialData.type,
          organization_id: credentialData.organization_id,
          data: credentialData.data || {},
          created_by: credentialData.created_by || null,
          created_at: credentialData.created_at || new Date().toISOString(),
          updated_at: credentialData.updated_at || new Date().toISOString(),
          status: 'active'
        };
        
        const { data, error } = await supabase
          .from('credentials')
          .insert(credentialObj)
          .select()
          .single();
          
        if (error) {
          logger.error(`Erro ao salvar credencial via Supabase client: ${error.message || JSON.stringify(error)}`);
          throw new Error(`Erro ao salvar credencial: ${error.message || JSON.stringify(error)}`);
        }
        
        logger.info(`Credencial ${data.id} salva com sucesso`);
        return data;
      } catch (error) {
        // Se todas as tentativas falharem, lançar o erro
        logger.error(`Todas as tentativas de salvar credencial falharam: ${error.message || JSON.stringify(error)}`);
        throw error;
      }
    } catch (error) {
      let errorMessage = 'Erro ao salvar credencial';
      
      if (error.message) {
        errorMessage = `${errorMessage}: ${error.message}`;
      } else if (typeof error === 'object') {
        errorMessage = `${errorMessage}: ${JSON.stringify(error)}`;
      }
      
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Obtém uma credencial pelo ID
   * @param {string} credentialId - ID da credencial
   * @param {string} organizationId - ID da organização
   * @returns {Promise<Object>} - Credencial ou null
   */
  async getCredentialById(credentialId, organizationId) {
    try {
      // Usar o cliente normal do Supabase que respeita RLS
      const { data, error } = await supabase
        .from('credentials')
        .select('*')
        .eq('id', credentialId)
        .eq('organization_id', organizationId)
        .single();
        
      if (error) {
        logger.error(`Erro ao buscar credencial ${credentialId}: ${error.message}`);
        return null;
      }
      
      return data;
    } catch (error) {
      logger.error(`Erro ao buscar credencial: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Lista credenciais de uma organização
   * @param {string} organizationId - ID da organização
   * @param {string} [type] - Filtrar por tipo (opcional)
   * @returns {Promise<Array>} - Lista de credenciais
   */
  async listOrganizationCredentials(organizationId, type = null) {
    try {
      let query = supabase
        .from('credentials')
        .select('*')
        .eq('organization_id', organizationId);
        
      if (type) {
        query = query.eq('type', type);
      }
      
      const { data, error } = await query;
      
      if (error) {
        logger.error(`Erro ao listar credenciais: ${error.message}`);
        return [];
      }
      
      return data || [];
    } catch (error) {
      logger.error(`Erro ao listar credenciais: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Atualiza uma credencial pelo ID
   * @param {string} credentialId - ID da credencial
   * @param {string} organizationId - ID da organização
   * @param {Object} updates - Dados a serem atualizados
   * @returns {Promise<Object>} - Credencial atualizada ou null
   */
  async updateCredential(credentialId, organizationId, updates) {
    try {
      // Remover campos que não podem ser atualizados
      const { id, created_at, created_by, ...updateData } = updates;
      
      // Adicionar data de atualização
      updateData.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('credentials')
        .update(updateData)
        .eq('id', credentialId)
        .eq('organization_id', organizationId)
        .select()
        .single();
        
      if (error) {
        logger.error(`Erro ao atualizar credencial ${credentialId}: ${error.message}`);
        return null;
      }
      
      return data;
    } catch (error) {
      logger.error(`Erro ao atualizar credencial: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Exclui uma credencial pelo ID
   * @param {string} credentialId - ID da credencial
   * @param {string} organizationId - ID da organização
   * @returns {Promise<boolean>} - true se excluída com sucesso
   */
  async deleteCredential(credentialId, organizationId) {
    try {
      const { error } = await supabase
        .from('credentials')
        .delete()
        .eq('id', credentialId)
        .eq('organization_id', organizationId);
        
      if (error) {
        logger.error(`Erro ao excluir credencial ${credentialId}: ${error.message}`);
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error(`Erro ao excluir credencial: ${error.message}`);
      return false;
    }
  }
}

module.exports = new CredentialsService(); 