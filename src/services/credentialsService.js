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
  async getWhatsappCredentials(userId, instanceId = null) {
    try {
      if (!userId) {
        logger.error('ID do usuário não fornecido para buscar credenciais do WhatsApp');
        throw new Error('ID do usuário é obrigatório para obter credenciais do WhatsApp');
      }

      logger.info(`Buscando credenciais do WhatsApp para o usuário: ${userId}${instanceId ? `, instância: ${instanceId}` : ''}`);
      
      // Construir query base
      let query = supabaseAdmin
        .from('whatsapp_credentials')
        .select('*');
      
      // Se instanceId foi fornecido, filtrar por ele
      if (instanceId) {
        query = query.eq('id', instanceId);
      } else {
        // Caso contrário, filtrar por client_id
        query = query.eq('client_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        logger.error(`Erro na consulta admin ao Supabase: ${error.message}`);
        throw new Error(`Falha ao consultar tabela whatsapp_credentials: ${error.message}`);
      }
      
      // Verificar se temos registros
      if (!data || data.length === 0) {
        logger.error('Nenhum registro encontrado na tabela whatsapp_credentials');
        throw new Error('Credenciais do WhatsApp não encontradas');
      }
      
      // Usar o primeiro registro encontrado
      const credential = data[0];
      logger.info(`Usando credencial: ${JSON.stringify({
        id: credential.id,
        client_id: credential.client_id,
        connection_type: credential.connection_type,
        wpp_number_id: credential.wpp_number_id,
        wpp_business_account_id: credential.wpp_business_account_id
      })}`);
      
      // Retornar credenciais baseado no tipo de conexão
      if (credential.connection_type === 'whatsapp_business') {
        // Para Evolution API
        logger.info('Retornando credenciais para Evolution API');
        return {
          connectionType: 'whatsapp_business',
          instanceId: credential.id,
          instanceName: credential.instance_name,
          phone: credential.phone,
          // Evolution API não precisa de accessToken, usa apikey da configuração
          evolutionApiUrl: process.env.EVOLUTION_API_URL,
          evolutionApiKey: process.env.EVOLUTION_API_KEY
        };
      } else {
        // Para API oficial da Meta (ads)
        logger.info('Retornando credenciais para API oficial da Meta');
        
        // Verificar se os campos necessários estão presentes
        if (!credential.wpp_number_id || !credential.wpp_business_account_id) {
          logger.error('Credencial ADS encontrada com campos obrigatórios vazios');
          throw new Error('Credenciais do WhatsApp ADS incompletas. Configure wpp_number_id e wpp_business_account_id.');
        }
        
        // Verificar se o access token está presente na credencial
        if (!credential.wpp_access_token) {
          logger.error('Access token não encontrado na credencial do usuário');
          throw new Error('Access token do WhatsApp não configurado para este usuário');
        }
        
        return {
          connectionType: 'ads',
          accessToken: credential.wpp_access_token,
          phoneNumberId: credential.wpp_number_id,
          businessAccountId: credential.wpp_business_account_id,
          apiVersion: whatsappConfig.apiVersion,
          baseUrl: whatsappConfig.baseUrl
        };
      }
    } catch (error) {
      logger.error(`Erro ao processar credenciais do WhatsApp: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Busca TODAS as credenciais do WhatsApp para um usuário
   * @param {string} userId - ID do usuário
   * @returns {Promise<Array>} - Lista de todas as credenciais
   */
  async getAllWhatsappCredentials(userId) {
    try {
      if (!userId) {
        logger.error('ID do usuário não fornecido para buscar credenciais do WhatsApp');
        throw new Error('ID do usuário é obrigatório para obter credenciais do WhatsApp');
      }

      logger.info(`Buscando TODAS as credenciais do WhatsApp para o usuário: ${userId}`);
      
      const { data, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('client_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.error(`Erro na consulta admin ao Supabase: ${error.message}`);
        throw new Error(`Falha ao consultar tabela whatsapp_credentials: ${error.message}`);
      }
      
      logger.info(`Credenciais encontradas: ${data?.length || 0}`);
      return data || [];
      
    } catch (error) {
      logger.error(`Erro ao buscar credenciais do WhatsApp: ${error.message}`);
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