/**
 * Serviço para gerenciar credenciais
 */
const { supabase, supabaseAdmin } = require('../config/supabase');
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
      if (!userId) {
        logger.error('ID do usuário não fornecido para buscar credenciais do WhatsApp');
        throw new Error('ID do usuário é obrigatório para obter credenciais do WhatsApp');
      }

      logger.info(`Buscando credenciais do WhatsApp para o usuário: ${userId}`);
      logger.info(`Token de acesso do WhatsApp presente no .env: ${whatsappConfig.accessToken ? 'Sim' : 'Não'}`);
      
      // Verificar se o token de acesso está configurado
      if (!whatsappConfig.accessToken) {
        logger.error('WHATSAPP_ACCESS_TOKEN não configurado no arquivo .env');
        throw new Error('Token de acesso do WhatsApp não configurado no .env');
      }
      
      // Realizar uma consulta simplificada e direta usando a conexão ADMIN do Supabase
      logger.info(`Consultando tabela 'whatsapp_credentials' para o cliente: ${userId} (usando credenciais admin)`);
      
      const { data, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .limit(10);
      
      logger.info(`Resposta da consulta admin ao Supabase: ${JSON.stringify({
        sucesso: !error,
        registros: data ? data.length : 0,
        erro: error ? error.message : 'nenhum'
      })}`);
      
      if (error) {
        logger.error(`Erro na consulta admin ao Supabase: ${error.message}`);
        throw new Error(`Falha ao consultar tabela whatsapp_credentials: ${error.message}`);
      }
      
      // Verificar explicitamente se temos registros
      if (!data || data.length === 0) {
        logger.error('Nenhum registro encontrado na tabela whatsapp_credentials (admin)');
        throw new Error('Tabela whatsapp_credentials vazia');
      }
      
      // Filtrar para o usuário específico
      let userCredentials = data.filter(cred => cred.client_id === userId);
      
      // Se não encontrou para este usuário, usar o primeiro registro
      if (!userCredentials || userCredentials.length === 0) {
        logger.warn(`Nenhuma credencial encontrada para o usuário ${userId}. Usando a primeira disponível.`);
        userCredentials = [data[0]];
      }
      
      // Registro encontrado
      const credential = userCredentials[0];
      logger.info(`Usando credencial: ${JSON.stringify({
        id: credential.id,
        client_id: credential.client_id,
        wpp_number_id: credential.wpp_number_id,
        wpp_business_account_id: credential.wpp_business_account_id
      })}`);
      
      // Verificar se os campos necessários estão presentes
      if (!credential.wpp_number_id || !credential.wpp_business_account_id) {
        logger.error('Credencial encontrada com campos obrigatórios vazios');
        throw new Error('Credenciais do WhatsApp incompletas. Configure wpp_number_id e wpp_business_account_id.');
      }
      
      // Retornar as credenciais encontradas
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
      const { data: existingData } = await supabaseAdmin
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
        const { data, error } = await supabaseAdmin
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
        
        const { data, error } = await supabaseAdmin
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
      const { data, error } = await supabaseAdmin
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
        const { error: deleteError } = await supabaseAdmin
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