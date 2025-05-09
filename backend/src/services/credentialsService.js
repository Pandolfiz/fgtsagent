/**
 * Serviço para gerenciar credenciais
 */
const { supabase } = require('../lib/supabaseClient');
const logger = require('../utils/logger');
const whatsappConfig = require('../config/whatsapp');

/**
 * Classe para gerenciar credenciais de serviços externos
 */
class CredentialsService {
  /**
   * Obtém as credenciais do WhatsApp para um usuário específico
   * @param {string} userId - ID do usuário no sistema
   * @returns {Promise<Object>} - Credenciais do WhatsApp
   */
  async getWhatsappCredentials(userId) {
    try {
      logger.info(`Buscando credenciais do WhatsApp para o usuário: ${userId}`);
      
      // Modificado para lidar com múltiplos registros - pega o mais recente por updated_at
      const { data, error } = await supabase
        .from('whatsapp_credentials')
        .select('wpp_number_id, wpp_business_account_id, updated_at')
        .eq('client_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (error) {
        logger.error(`Erro ao buscar credenciais do WhatsApp: ${error.message}`, { error });
        throw new Error(`Falha ao obter credenciais do WhatsApp: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        logger.error(`Nenhuma credencial do WhatsApp encontrada para o usuário: ${userId}`);
        throw new Error('Credenciais do WhatsApp não encontradas');
      }
      
      // Usar o primeiro registro (mais recente)
      const credential = data[0];
      
      // Verificar se todas as credenciais necessárias estão presentes
      if (!credential.wpp_number_id || !credential.wpp_business_account_id) {
        logger.error('Credenciais do WhatsApp incompletas', { credential });
        throw new Error('Credenciais do WhatsApp incompletas');
      }
      
      logger.info(`Credenciais do WhatsApp encontradas para o usuário: ${userId} (atualizado em: ${credential.updated_at})`);
      
      // Combinar as informações da tabela com o token de acesso do .env
      return {
        accessToken: whatsappConfig.accessToken,
        phoneNumberId: credential.wpp_number_id,
        businessAccountId: credential.wpp_business_account_id,
        apiVersion: whatsappConfig.apiVersion,
        baseUrl: whatsappConfig.baseUrl
      };
    } catch (error) {
      logger.error(`Erro ao processar credenciais do WhatsApp: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Salva ou atualiza os dados do WhatsApp para um usuário
   * @param {string} userId - ID do usuário
   * @param {Object} whatsappData - Dados do WhatsApp a serem salvos
   * @returns {Promise<Object>} - Resultado da operação
   */
  async saveWhatsappData(userId, whatsappData) {
    try {
      logger.info(`Salvando dados do WhatsApp para o usuário: ${userId}`);
      
      // Verificar se já existem dados para este usuário - pega o mais recente
      const { data: existingData } = await supabase
        .from('whatsapp_credentials')
        .select('id, updated_at')
        .eq('client_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      const whatsappCredentialsData = {
        client_id: userId,
        wpp_number_id: whatsappData.phoneNumberId,
        wpp_business_account_id: whatsappData.businessAccountId,
        updated_at: new Date().toISOString()
      };
      
      let result;
      
      if (existingData && existingData.length > 0) {
        // Atualizar dados existentes
        const { data, error } = await supabase
          .from('whatsapp_credentials')
          .update(whatsappCredentialsData)
          .eq('id', existingData[0].id)
          .select();
        
        if (error) throw new Error(`Falha ao atualizar dados do WhatsApp: ${error.message}`);
        result = data;
        
        // Fazer limpeza de registros duplicados, mantendo apenas o mais recente
        await this._cleanupDuplicateCredentials(userId, existingData[0].id);
      } else {
        // Inserir novos dados
        whatsappCredentialsData.created_at = new Date().toISOString();
        
        const { data, error } = await supabase
          .from('whatsapp_credentials')
          .insert(whatsappCredentialsData)
          .select();
        
        if (error) throw new Error(`Falha ao inserir dados do WhatsApp: ${error.message}`);
        result = data;
      }
      
      logger.info(`Dados do WhatsApp salvos com sucesso para o usuário: ${userId}`);
      return { success: true, data: result };
    } catch (error) {
      logger.error(`Erro ao salvar dados do WhatsApp: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Remove registros duplicados, mantendo apenas o registro ativo
   * @param {string} userId - ID do usuário
   * @param {string} activeRecordId - ID do registro a ser mantido
   * @private
   */
  async _cleanupDuplicateCredentials(userId, activeRecordId) {
    try {
      // Encontrar todos os outros registros para este usuário
      const { data, error } = await supabase
        .from('whatsapp_credentials')
        .select('id')
        .eq('client_id', userId)
        .neq('id', activeRecordId);
        
      if (error) {
        logger.error(`Erro ao buscar registros duplicados: ${error.message}`);
        return;
      }
      
      if (data && data.length > 0) {
        const duplicateIds = data.map(item => item.id);
        logger.info(`Encontrados ${duplicateIds.length} registros duplicados para limpeza`);
        
        // Excluir os registros duplicados
        const { error: deleteError } = await supabase
          .from('whatsapp_credentials')
          .delete()
          .in('id', duplicateIds);
          
        if (deleteError) {
          logger.error(`Erro ao excluir registros duplicados: ${deleteError.message}`);
          return;
        }
        
        logger.info(`${duplicateIds.length} registros duplicados removidos com sucesso`);
      }
    } catch (cleanupError) {
      logger.error(`Erro durante limpeza de credenciais duplicadas: ${cleanupError.message}`);
    }
  }
}

// Exporta uma instância do serviço
module.exports = new CredentialsService(); 