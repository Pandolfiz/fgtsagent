/**
 * Serviço para controle de mensagens template da Meta API
 * Verifica se uma instância é da Meta API e se precisa usar templates após 24h
 */
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

class MetaTemplateControlService {
  /**
   * Verifica se uma instância é da Meta API oficial
   * @param {string} instanceId - ID da instância
   * @returns {Promise<boolean>} - True se for Meta API
   */
  async isMetaAPIInstance(instanceId) {
    try {
      if (!instanceId) {
        logger.warn('[META_TEMPLATE] InstanceId não fornecido');
        return false;
      }

      logger.info(`[META_TEMPLATE] 🔍 Verificando se instância ${instanceId} é Meta API...`);

      const { data: creds, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('connection_type, wpp_access_token, wpp_number_id, wpp_business_account_id')
        .eq('id', instanceId)
        .single();

      if (error) {
        logger.error(`[META_TEMPLATE] Erro ao buscar credenciais: ${error.message}`);
        return false;
      }

      if (!creds) {
        logger.warn(`[META_TEMPLATE] Credenciais não encontradas para instância: ${instanceId}`);
        return false;
      }

      logger.info(`[META_TEMPLATE] 📊 Credenciais encontradas:`, {
        connection_type: creds.connection_type,
        has_access_token: !!creds.wpp_access_token,
        has_number_id: !!creds.wpp_number_id,
        has_business_account_id: !!creds.wpp_business_account_id
      });

      // Verifica se é Meta API (connection_type = 'ads' ou tem campos específicos da Meta)
      const isMetaAPI = creds.connection_type === 'ads' || 
                       (creds.wpp_access_token && creds.wpp_number_id && creds.wpp_business_account_id);

      logger.info(`[META_TEMPLATE] ✅ Instância ${instanceId} é Meta API: ${isMetaAPI}`);
      return isMetaAPI;

    } catch (error) {
      logger.error(`[META_TEMPLATE] Erro ao verificar se é Meta API: ${error.message}`);
      return false;
    }
  }

  /**
   * Busca a última mensagem do usuário em uma conversa
   * @param {string} conversationId - ID da conversa
   * @param {string} instanceId - ID da instância
   * @returns {Promise<Object|null>} - Última mensagem do usuário ou null
   */
  async getLastUserMessage(conversationId, instanceId) {
    try {
      if (!conversationId || !instanceId) {
        logger.warn('[META_TEMPLATE] ConversationId ou InstanceId não fornecidos');
        return null;
      }

      logger.info(`[META_TEMPLATE] 🔍 Buscando última mensagem do usuário na conversa ${conversationId}...`);

      const { data: messages, error } = await supabaseAdmin
        .from('messages')
        .select('id, content, sender_id, recipient_id, timestamp, role')
        .eq('conversation_id', conversationId)
        .eq('instance_id', instanceId)
        .eq('role', 'USER') // Apenas mensagens do usuário
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        logger.error(`[META_TEMPLATE] Erro ao buscar última mensagem do usuário: ${error.message}`);
        return null;
      }

      logger.info(`[META_TEMPLATE] 📊 Query executada. Encontradas ${messages?.length || 0} mensagens com role='USER'`);

      const lastMessage = messages && messages.length > 0 ? messages[0] : null;
      
      if (lastMessage) {
        logger.info(`[META_TEMPLATE] ✅ Última mensagem do usuário encontrada:`, {
          id: lastMessage.id,
          timestamp: lastMessage.timestamp,
          content_preview: lastMessage.content?.substring(0, 50) + '...'
        });
      } else {
        logger.info(`[META_TEMPLATE] ❌ Nenhuma mensagem do usuário encontrada na conversa ${conversationId}`);
        
        // Vamos verificar se há mensagens com outros roles para debug
        const { data: allMessages, error: allError } = await supabaseAdmin
          .from('messages')
          .select('id, role, timestamp, content')
          .eq('conversation_id', conversationId)
          .eq('instance_id', instanceId)
          .order('timestamp', { ascending: false })
          .limit(5);

        if (!allError && allMessages) {
          logger.info(`[META_TEMPLATE] 🔍 Debug - Últimas 5 mensagens na conversa:`, 
            allMessages.map(m => ({ id: m.id, role: m.role, timestamp: m.timestamp, content: m.content?.substring(0, 30) }))
          );
        }
      }

      return lastMessage;

    } catch (error) {
      logger.error(`[META_TEMPLATE] Erro ao buscar última mensagem do usuário: ${error.message}`);
      return null;
    }
  }

  /**
   * Verifica se a última mensagem do usuário tem mais de 24 horas
   * @param {Object} lastMessage - Objeto da última mensagem
   * @returns {boolean} - True se tem mais de 24h
   */
  isLastMessageOlderThan24Hours(lastMessage) {
    if (!lastMessage || !lastMessage.timestamp) {
      logger.warn('[META_TEMPLATE] Mensagem inválida para verificação de tempo');
      return true; // Se não há mensagem, considera como se precisasse de template
    }

    const lastMessageTime = new Date(lastMessage.timestamp);
    const now = new Date();
    const diffInHours = (now - lastMessageTime) / (1000 * 60 * 60);

    const isOlderThan24h = diffInHours > 24;
    
    logger.info(`[META_TEMPLATE] Diferença de tempo: ${diffInHours.toFixed(2)} horas. Precisa de template: ${isOlderThan24h}`);
    
    return isOlderThan24h;
  }

  /**
   * Verifica se uma mensagem livre pode ser enviada ou se precisa de template
   * @param {string} conversationId - ID da conversa
   * @param {string} instanceId - ID da instância
   * @returns {Promise<Object>} - Status da verificação
   */
  async checkMessageSendStatus(conversationId, instanceId) {
    try {
      logger.info(`[META_TEMPLATE] Verificando status de envio para conversa ${conversationId}, instância ${instanceId}`);

      // 1. Verificar se é instância da Meta API
      const isMetaAPI = await this.isMetaAPIInstance(instanceId);
      
      if (!isMetaAPI) {
        logger.info('[META_TEMPLATE] Não é instância Meta API, envio livre permitido');
        return {
          canSendFreeMessage: true,
          requiresTemplate: false,
          reason: 'not_meta_api',
          lastUserMessage: null,
          hoursSinceLastMessage: null
        };
      }

      // 2. Buscar última mensagem do usuário
      const lastUserMessage = await this.getLastUserMessage(conversationId, instanceId);
      
      if (!lastUserMessage) {
        logger.info('[META_TEMPLATE] Nenhuma mensagem do usuário encontrada, template obrigatório');
        return {
          canSendFreeMessage: false,
          requiresTemplate: true,
          reason: 'no_user_messages',
          lastUserMessage: null,
          hoursSinceLastMessage: null
        };
      }

      // 3. Verificar se tem mais de 24 horas
      const isOlderThan24h = this.isLastMessageOlderThan24Hours(lastUserMessage);
      const hoursSinceLastMessage = lastUserMessage.timestamp ? 
        (new Date() - new Date(lastUserMessage.timestamp)) / (1000 * 60 * 60) : null;

      const result = {
        canSendFreeMessage: !isOlderThan24h,
        requiresTemplate: isOlderThan24h,
        reason: isOlderThan24h ? '24h_window_expired' : 'within_24h_window',
        lastUserMessage: {
          id: lastUserMessage.id,
          content: lastUserMessage.content,
          timestamp: lastUserMessage.timestamp
        },
        hoursSinceLastMessage: hoursSinceLastMessage ? Math.round(hoursSinceLastMessage * 100) / 100 : null
      };

      logger.info(`[META_TEMPLATE] Status de envio: ${JSON.stringify(result)}`);
      return result;

    } catch (error) {
      logger.error(`[META_TEMPLATE] Erro ao verificar status de envio: ${error.message}`);
      return {
        canSendFreeMessage: false,
        requiresTemplate: true,
        reason: 'error',
        error: error.message,
        lastUserMessage: null,
        hoursSinceLastMessage: null
      };
    }
  }

  /**
   * Busca templates aprovados disponíveis para uma instância Meta API
   * @param {string} instanceId - ID da instância
   * @returns {Promise<Array>} - Lista de templates aprovados
   */
  async getApprovedTemplates(instanceId) {
    try {
      if (!instanceId) {
        logger.warn('[META_TEMPLATE] InstanceId não fornecido para buscar templates');
        return [];
      }

      logger.info(`[META_TEMPLATE] Buscando templates para instanceId: ${instanceId}`);

      // Buscar credenciais para obter business_account_id
      const { data: creds, error: credsError } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('wpp_business_account_id')
        .eq('id', instanceId)
        .single();

      logger.info(`[META_TEMPLATE] Credenciais encontradas:`, { creds, credsError });

      if (credsError || !creds || !creds.wpp_business_account_id) {
        logger.error(`[META_TEMPLATE] Erro ao buscar credenciais para templates: ${credsError?.message || 'Credenciais não encontradas'}`);
        return [];
      }

      // Buscar templates aprovados
      logger.info(`[META_TEMPLATE] Buscando templates para business_account_id: ${creds.wpp_business_account_id}`);
      
      const { data: templates, error: templatesError } = await supabaseAdmin
        .from('whatsapp_message_templates')
        .select('template_id, template_name, template_language, template_category, template_components')
        .eq('wpp_business_account_id', creds.wpp_business_account_id)
        .eq('template_status', 'APPROVED')
        .order('template_name', { ascending: true });

      logger.info(`[META_TEMPLATE] Resultado da consulta de templates:`, { templates, templatesError });

      if (templatesError) {
        logger.error(`[META_TEMPLATE] Erro ao buscar templates: ${templatesError.message}`);
        return [];
      }

      logger.info(`[META_TEMPLATE] Encontrados ${templates?.length || 0} templates aprovados`);
      return templates || [];

    } catch (error) {
      logger.error(`[META_TEMPLATE] Erro ao buscar templates aprovados: ${error.message}`);
      return [];
    }
  }
}

module.exports = new MetaTemplateControlService();
