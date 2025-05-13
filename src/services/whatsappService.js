/**
 * Serviço para integração com a API Cloud do WhatsApp
 */
const axios = require('axios');
const logger = require('../utils/logger');
const credentialsService = require('../services/credentialsService');

/**
 * Classe de serviço para interação com a API Cloud do WhatsApp
 */
class WhatsappService {
  /**
   * Inicializa o cliente axios com as credenciais
   * @param {Object} credentials - Credenciais do WhatsApp
   * @returns {Object} - Cliente axios configurado
   */
  _createClient(credentials) {
    return axios.create({
      baseURL: `${credentials.baseUrl}/${credentials.apiVersion}`,
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Envia uma mensagem de texto via WhatsApp
   * @param {string} to - Número de telefone do destinatário (formato: 5511999999999)
   * @param {string} message - Conteúdo da mensagem
   * @param {string} userId - ID do usuário que está enviando a mensagem
   * @returns {Promise<object>} - Resposta da API
   */
  async sendTextMessage(to, message, userId) {
    try {
      if (!userId) {
        logger.error('ID do usuário não fornecido para enviar mensagem');
        return {
          success: false,
          error: 'ID do usuário é obrigatório para enviar mensagem'
        };
      }

      logger.info(`Iniciando envio de mensagem para ${to} pelo usuário ${userId}`);
      logger.info(`Tipo de userId: ${typeof userId}, Valor: ${userId}`);
      
      // Se userId não for uma string, converter para string
      if (typeof userId !== 'string') {
        userId = String(userId);
        logger.info(`UserId convertido para string: ${userId}`);
      }
      
      // Verificar se userId está no formato UUID (para diagnóstico)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      logger.info(`UserId é um UUID válido? ${isUUID}`);
      
      // Obter credenciais do usuário
      let credentials;
      try {
        credentials = await credentialsService.getWhatsappCredentials(userId);
        logger.info('Credenciais obtidas com sucesso');
        logger.info(`Credenciais: phoneNumberId=${credentials.phoneNumberId}, businessAccountId=${credentials.businessAccountId}`);
      } catch (credError) {
        logger.error(`Erro ao obter credenciais: ${credError.message}`);
        return {
          success: false,
          error: 'Credenciais do WhatsApp não encontradas',
          error_details: credError.message
        };
      }
      
      // Verificar se todas as credenciais necessárias estão presentes
      if (!credentials.accessToken) {
        const errorMsg = 'Credenciais incompletas: Token de acesso não encontrado';
        logger.error(errorMsg);
        
        return {
          success: false,
          error: errorMsg,
          error_details: `Verifique se a variável WHATSAPP_ACCESS_TOKEN está configurada no arquivo .env`
        };
      }

      // Verificar phoneNumberId especificamente, pois é essencial para a API
      if (!credentials.phoneNumberId) {
        const errorMsg = 'phoneNumberId não encontrado nas credenciais';
        logger.error(errorMsg);
        
        return {
          success: false,
          error: errorMsg,
          error_details: `Verifique se existe o campo wpp_number_id na tabela whatsapp_credentials para este usuário`
        };
      }

      // Verificar businessAccountId
      if (!credentials.businessAccountId) {
        const errorMsg = 'businessAccountId não encontrado nas credenciais';
        logger.error(errorMsg);
        
        return {
          success: false,
          error: errorMsg,
          error_details: `Verifique se existe o campo wpp_business_account_id na tabela whatsapp_credentials para este usuário`
        };
      }

      // Log para verificar se o phoneNumberId está presente e parece um valor válido
      if (credentials.phoneNumberId) {
        logger.info(`Usando phoneNumberId: ${credentials.phoneNumberId}`);
        
        // Verificar se o phoneNumberId parece válido (pelo menos um número)
        if (!/^\d+$/.test(credentials.phoneNumberId)) {
          logger.warn(`phoneNumberId parece ter formato inválido: ${credentials.phoneNumberId}`);
        }
      }
      
      // Criar o cliente HTTP
      const client = this._createClient(credentials);
      
      // Garantir que o número de telefone tenha o formato correto (inclui o "+" no início)
      const formattedTo = this._formatPhoneNumber(to);
      logger.info(`Número de telefone formatado: ${formattedTo}`);
      
      // Construir o payload conforme a documentação oficial da Meta
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        type: 'text',
        text: {
          preview_url: true, // Permite pré-visualização de links
          body: message
        }
      };
      
      logger.info(`Payload da requisição: ${JSON.stringify(payload)}`);
      logger.info(`Endpoint de envio: ${credentials.baseUrl}/${credentials.apiVersion}/${credentials.phoneNumberId}/messages`);
      
      // Enviar a requisição para a API do WhatsApp
      let response;
      try {
        response = await client.post(
          `/${credentials.phoneNumberId}/messages`,
          payload
        );
        logger.info(`Mensagem enviada com sucesso: ${JSON.stringify(response.data)}`);
      } catch (apiError) {
        logger.error(`Erro na API do WhatsApp: ${apiError.message}`, {
          error: apiError.response ? apiError.response.data : apiError
        });
        
        let errorDetails = 'Erro desconhecido ao enviar mensagem';
        if (apiError.response && apiError.response.data) {
          errorDetails = JSON.stringify(apiError.response.data);
          logger.error(`Detalhes do erro da API: ${errorDetails}`);
        } else if (apiError.message) {
          errorDetails = apiError.message;
        }
        
        return {
          success: false,
          error: 'Erro ao chamar a API do WhatsApp',
          error_details: errorDetails
        };
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error(`Erro ao enviar mensagem para ${to}: ${error.message}`, {
        error: error.response ? error.response.data : error
      });
      
      return {
        success: false,
        error: error.response ? error.response.data : error.message,
        error_details: error.message
      };
    }
  }
  
  /**
   * Formata o número de telefone para garantir a compatibilidade com a API do WhatsApp
   * @param {string} phoneNumber - Número de telefone a ser formatado
   * @returns {string} - Número de telefone formatado
   */
  _formatPhoneNumber(phoneNumber) {
    // Remover caracteres não numéricos
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Verificar se já tem o '+' no início
    if (!phoneNumber.startsWith('+')) {
      // Adicionar o '+' no início
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }
  
  /**
   * Envia uma mensagem com mídia via WhatsApp
   * @param {string} to - Número de telefone do destinatário (formato: 5511999999999)
   * @param {string} mediaType - Tipo de mídia ('image', 'document', 'audio', 'video')
   * @param {string} mediaUrl - URL da mídia para envio
   * @param {string} caption - Legenda opcional para a mídia
   * @param {string} userId - ID do usuário que está enviando a mensagem
   * @returns {Promise<object>} - Resposta da API
   */
  async sendMediaMessage(to, mediaType, mediaUrl, caption = '', userId) {
    try {
      logger.info(`Enviando mídia do tipo ${mediaType} para ${to} pelo usuário ${userId}`);
      
      // Obter credenciais do usuário
      const credentials = await credentialsService.getWhatsappCredentials(userId);
      const client = this._createClient(credentials);
      
      // Garantir que o número de telefone tenha o formato correto
      const formattedTo = this._formatPhoneNumber(to);
      
      // Construir o payload de acordo com a documentação da Meta
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        type: mediaType,
        [mediaType]: {
          link: mediaUrl,
          caption: caption
        }
      };
      
      logger.info(`Payload da requisição de mídia: ${JSON.stringify(payload)}`);
      
      const response = await client.post(
        `/${credentials.phoneNumberId}/messages`,
        payload
      );
      
      logger.info(`Mídia enviada com sucesso: ${JSON.stringify(response.data)}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error(`Erro ao enviar mídia para ${to}: ${error.message}`, {
        error: error.response ? error.response.data : error
      });
      
      return {
        success: false,
        error: error.response ? error.response.data : error.message
      };
    }
  }
  
  /**
   * Envia uma mensagem interativa com botões via WhatsApp
   * @param {string} to - Número de telefone do destinatário
   * @param {string} headerText - Texto do cabeçalho (opcional)
   * @param {string} bodyText - Texto principal da mensagem
   * @param {string} footerText - Texto do rodapé (opcional)
   * @param {Array} buttons - Array de botões
   * @param {string} userId - ID do usuário que está enviando a mensagem
   * @returns {Promise<object>} - Resposta da API
   */
  async sendInteractiveMessage(to, bodyText, headerText = '', footerText = '', buttons = [], userId) {
    try {
      logger.info(`Enviando mensagem interativa para ${to}`);
      
      // Obter credenciais do usuário
      const credentials = await credentialsService.getWhatsappCredentials(userId);
      const client = this._createClient(credentials);
      
      // Garantir que o número de telefone tenha o formato correto
      const formattedTo = this._formatPhoneNumber(to);
      
      // Formatar os botões para o formato esperado pela API
      const formattedButtons = buttons.map((button, index) => ({
        type: "reply",
        reply: {
          id: `button_${index}`,
          title: button.title.substring(0, 20) // Título limitado a 20 caracteres
        }
      }));
      
      // Construir o payload da mensagem interativa
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: headerText ? { type: 'text', text: headerText } : undefined,
          body: { text: bodyText },
          footer: footerText ? { text: footerText } : undefined,
          action: {
            buttons: formattedButtons
          }
        }
      };
      
      // Remover propriedades undefined
      const cleanPayload = JSON.parse(JSON.stringify(payload));
      
      logger.info(`Payload da mensagem interativa: ${JSON.stringify(cleanPayload)}`);
      
      const response = await client.post(
        `/${credentials.phoneNumberId}/messages`,
        cleanPayload
      );
      
      logger.info(`Mensagem interativa enviada com sucesso: ${JSON.stringify(response.data)}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error(`Erro ao enviar mensagem interativa para ${to}: ${error.message}`, {
        error: error.response ? error.response.data : error
      });
      
      return {
        success: false,
        error: error.response ? error.response.data : error.message
      };
    }
  }
  
  /**
   * Marca uma mensagem como lida
   * @param {string} messageId - ID da mensagem para marcar como lida
   * @param {string} userId - ID do usuário dono da mensagem
   * @returns {Promise<object>} - Resposta da API
   */
  async markMessageAsRead(messageId, userId) {
    try {
      logger.info(`Marcando mensagem como lida: ${messageId} para o usuário ${userId}`);
      
      // Obter credenciais do usuário
      const credentials = await credentialsService.getWhatsappCredentials(userId);
      const client = this._createClient(credentials);
      
      // Payload para marcar mensagem como lida
      const payload = {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      };
      
      const response = await client.post(
        `/${credentials.phoneNumberId}/messages`,
        payload
      );
      
      logger.info(`Mensagem marcada como lida: ${JSON.stringify(response.data)}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error(`Erro ao marcar mensagem como lida ${messageId}: ${error.message}`, {
        error: error.response ? error.response.data : error
      });
      
      return {
        success: false,
        error: error.response ? error.response.data : error.message
      };
    }
  }
  
  /**
   * Envia um indicador de digitação para o destinatário
   * @param {string} to - Número de telefone do destinatário
   * @param {string} userId - ID do usuário que está enviando
   * @returns {Promise<object>} - Resposta da API
   */
  async sendTypingIndicator(to, userId) {
    try {
      // DESATIVADO - API não suporta este endpoint corretamente
      logger.info(`Indicador de digitação desativado para ${to}`);
      
      // Retornar sucesso sem fazer a chamada à API
      return {
        success: true,
        data: { status: 'ignored' }
      };
      
      /* Código original comentado
      // Obter credenciais do usuário
      const credentials = await credentialsService.getWhatsappCredentials(userId);
      const client = this._createClient(credentials);
      
      // Formatar o número
      const formattedTo = this._formatPhoneNumber(to);
      
      // Usar o endpoint específico para indicador de digitação conforme documentação oficial
      const response = await client.post(
        `/${credentials.phoneNumberId}/messages?type=typing`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          typing: {
            status: 'typing'
          }
        }
      );
      
      logger.info(`Indicador de digitação enviado com sucesso para ${to}`);
      
      return {
        success: true,
        data: response.data
      };
      */
    } catch (error) {
      logger.error(`Erro ao processar indicador de digitação: ${error.message}`);
      return {
        success: true, // Retornar sucesso mesmo em caso de erro para não interromper o fluxo
        data: { status: 'ignored' }
      };
    }
  }
}

// Exporta uma instância do serviço
module.exports = new WhatsappService(); 