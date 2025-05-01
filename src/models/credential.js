/**
 * Modelo de Credencial
 * Implementação básica para resolver a dependência no controlador de credenciais n8n
 */
const { supabase } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const credentialsService = require('../services/credentialsService');
const logger = require('../utils/logger');

class Credential {
  /**
   * @param {Object} data - Dados da credencial
   * @param {string} data.name - Nome da credencial
   * @param {string} data.type - Tipo da credencial (ex: microsoft)
   * @param {string} data.organizationId - ID da organização
   * @param {Object} data.data - Dados específicos da credencial (tokens, etc)
   * @param {string} data.createdBy - ID do usuário que criou a credencial
   */
  constructor(data) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.type = data.type;
    this.organizationId = data.organizationId;
    this.data = data.data || {};
    this.createdBy = data.createdBy;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  /**
   * Salva a credencial no banco de dados
   * @returns {Promise<Object>} Credencial salva
   */
  async save() {
    try {
      logger.info('Tentando salvar credencial com o modelo Credential');
      
      // Primeiro, tentar usar o service_role para salvar a credencial
      try {
        const credentialData = {
          id: this.id,
          name: this.name,
          type: this.type,
          organization_id: this.organizationId,
          data: this.data,
          created_by: this.createdBy,
          created_at: this.created_at,
          updated_at: this.updated_at
        };
        
        const savedCredential = await credentialsService.saveCredentialAsServiceRole(credentialData);
        if (savedCredential) {
          logger.info(`Credencial ${savedCredential.id} salva com sucesso usando service_role`);
          return savedCredential;
        }
      } catch (serviceRoleError) {
        let errorMessage = 'Erro ao salvar com service_role';
        
        if (serviceRoleError.message) {
          errorMessage = `${errorMessage}: ${serviceRoleError.message}`;
        } else if (typeof serviceRoleError === 'object') {
          errorMessage = `${errorMessage}: ${JSON.stringify(serviceRoleError)}`;
        }
        
        logger.warn(`${errorMessage}, tentando método padrão`);
      }
      
      // Se não conseguir com service_role, tentar o método padrão
      const { data, error } = await supabase
        .from('credentials')
        .insert({
          id: this.id,
          name: this.name,
          type: this.type,
          organization_id: this.organizationId,
          data: this.data,
          created_by: this.createdBy,
          created_at: this.created_at,
          updated_at: this.updated_at,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        // Registrar todos os detalhes possíveis do erro
        let errorDetail = '';
        
        if (error.message) {
          errorDetail = error.message;
        } else if (error.code) {
          errorDetail = `Código: ${error.code}`;
          if (error.details) errorDetail += `, Detalhes: ${error.details}`;
        } else {
          errorDetail = JSON.stringify(error);
        }
        
        logger.error(`Erro ao salvar credencial: ${errorDetail}`);
        throw new Error(`Erro ao salvar credencial: ${errorDetail}`);
      }

      return data;
    } catch (error) {
      // Tratar o erro final capturando todos os detalhes possíveis
      let errorMessage = '';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'object') {
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = 'Erro não serializável';
        }
      } else {
        errorMessage = 'Erro desconhecido ao salvar credencial';
      }
      
      logger.error(`Erro ao salvar credencial: ${errorMessage}`);
      throw error; // Repassar o erro original para manter o rastreamento da pilha
    }
  }
  
  /**
   * Busca uma credencial pelo ID
   * @param {string} id - ID da credencial
   * @returns {Promise<Credential|null>} Instância da credencial ou null
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('credentials')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error || !data) {
        return null;
      }
      
      return new Credential({
        id: data.id,
        name: data.name,
        type: data.type,
        organizationId: data.organization_id,
        data: data.data,
        createdBy: data.created_by,
        created_at: data.created_at,
        updated_at: data.updated_at
      });
    } catch (error) {
      logger.error(`Erro ao buscar credencial: ${error.message}`);
      return null;
    }
  }
}

module.exports = Credential; 