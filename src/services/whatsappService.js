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
  async sendTextMessage(to, message, userId, instanceId = null) {
    try {
      if (!userId) {
        logger.error('ID do usuário não fornecido para enviar mensagem');
        return {
          success: false,
          error: 'ID do usuário é obrigatório para enviar mensagem'
        };
      }

      logger.info(`Iniciando envio de mensagem para ${to} pelo usuário ${userId}${instanceId ? `, instância: ${instanceId}` : ''}`);
      
      // Se userId não for uma string, converter para string
      if (typeof userId !== 'string') {
        userId = String(userId);
        logger.info(`UserId convertido para string: ${userId}`);
      }
      
      // Obter credenciais do usuário
      let credentials;
      try {
        credentials = await credentialsService.getWhatsappCredentials(userId, instanceId);
        logger.info('Credenciais obtidas com sucesso');
        logger.info(`Tipo de conexão: ${credentials.connectionType}`);
      } catch (credError) {
        logger.error(`Erro ao obter credenciais: ${credError.message}`);
        return {
          success: false,
          error: 'Credenciais do WhatsApp não encontradas',
          error_details: credError.message
        };
      }
      
      // Decidir qual API usar baseado no tipo de conexão
      if (credentials.connectionType === 'whatsapp_business') {
        // Usar Evolution API
        logger.info('Usando Evolution API para envio de mensagem');
        return await this._sendViaEvolutionAPI(to, message, credentials);
      } else {
        // Usar API oficial da Meta
        logger.info('Usando API oficial da Meta para envio de mensagem');
        return await this._sendViaMetaAPI(to, message, credentials);
      }
    } catch (error) {
      logger.error(`Erro ao enviar mensagem: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Método privado para envio via Evolution API
  async _sendViaEvolutionAPI(to, message, credentials) {
    try {
      logger.info('Iniciando envio via Evolution API');
      
      // Importar EvolutionService dinamicamente para evitar dependência circular
      const EvolutionService = require('./evolutionService');
      
      // Criar instância do EvolutionService
      const evolutionService = new EvolutionService({
        baseUrl: credentials.evolutionApiUrl,
        apiKey: credentials.evolutionApiKey,
        instanceName: credentials.instanceName,
        instanceId: credentials.instanceId
      });
      
      // Formatar número para Evolution API (deve terminar com @c.us)
      let formattedTo = to.replace(/\D/g, '');
      if (!formattedTo.endsWith('@c.us')) {
        formattedTo = formattedTo + '@c.us';
      }
      
      logger.info(`Enviando via Evolution API para: ${formattedTo}`);
      
      // Tentar primeiro via webhook (conforme solicitado)
      const webhookResult = await evolutionService.sendMessageViaWebhook(
        formattedTo, 
        message, 
        credentials.instanceId, 
        credentials.instanceName
      );
      
      if (webhookResult.success) {
        logger.info('Mensagem enviada com sucesso via webhook Evolution');
        return {
          success: true,
          data: {
            messages: [{
              id: `evolution_${Date.now()}`,
              to: formattedTo
            }]
          }
        };
      } else {
        logger.warn(`Webhook falhou: ${webhookResult.error}. Tentando via REST API...`);
        
        // Fallback para REST API
        const restResult = await evolutionService.sendTextMessage(formattedTo, message);
        
        if (restResult.success) {
          logger.info('Mensagem enviada com sucesso via REST API Evolution');
          return {
            success: true,
            data: {
              messages: [{
                id: `evolution_${Date.now()}`,
                to: formattedTo
              }]
            }
          };
        } else {
          throw new Error(`REST API também falhou: ${restResult.error}`);
        }
      }
    } catch (error) {
      logger.error(`Erro ao enviar via Evolution API: ${error.message}`);
      
      // Verificar se é erro de conectividade
      if (error.message && typeof error.message === 'string' && (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND'))) {
        logger.warn('Evolution API está offline. Mensagem será salva como pending para reenvio posterior.');
        return {
          success: false,
          error: 'Evolution API temporariamente indisponível',
          error_details: 'A mensagem foi salva e será reenviada quando a API estiver online',
          should_retry: true,
          status: 'pending'
        };
      }
      
      return {
        success: false,
        error: `Erro Evolution API: ${error.message}`,
        should_retry: false
      };
    }
  }

  // Método privado para envio via Meta API
  async _sendViaMetaAPI(to, message, credentials) {
    try {
      logger.info('Iniciando envio via Meta API');
      
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

  // Verificar status de um número WhatsApp via API da Meta
  async checkPhoneNumberStatus(wppNumberId, accessToken) {
    try {
      logger.info(`[WHATSAPP] Verificando status do número: ${wppNumberId}`);
      
      const response = await axios.get(
        `https://graph.facebook.com/v23.0/${wppNumberId}?fields=status`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      const status = response.data.status;
      logger.info(`[WHATSAPP] Status do número ${wppNumberId}: ${status}`);
      
      // Mapear status da Meta para nosso sistema
      const statusMapping = {
        'CONNECTED': 'connected',
        'VERIFIED': 'verified', 
        'PENDING': 'pending',
        'REJECTED': 'rejected',
        'DISABLED': 'disabled',
        'UNVERIFIED': 'unverified',
        'IN_REVIEW': 'in_review',
        'APPROVED': 'approved',
        'DECLINED': 'declined',
        'SUSPENDED': 'suspended'
      };
      
      const mappedStatus = statusMapping[status] || status.toLowerCase();
      logger.info(`[WHATSAPP] Status mapeado: ${status} → ${mappedStatus}`);
      
      return {
        success: true,
        status: mappedStatus,
        original_status: status,
        data: response.data
      };
      
    } catch (error) {
      logger.error(`[WHATSAPP] Erro ao verificar status do número ${wppNumberId}: ${error.message}`);
      
      if (error.response) {
        logger.error(`[WHATSAPP] Resposta de erro da API:`, error.response.data);
        return {
          success: false,
          error: error.response.data.error?.message || 'Erro na API da Meta',
          status: 'unknown'
        };
      }
      
      return {
        success: false,
        error: error.message,
        status: 'unknown'
      };
    }
  }

  // Verificar status de múltiplos números
  async checkMultiplePhoneNumbers(credentials) {
    try {
      logger.info(`[WHATSAPP] Verificando status de ${credentials.length} números`);
      
      const results = [];
      
      for (const credential of credentials) {
        if (credential.connection_type === 'ads' && credential.wpp_number_id && credential.wpp_access_token) {
          try {
            const statusResult = await this.checkPhoneNumberStatus(
              credential.wpp_number_id, 
              credential.wpp_access_token
            );
            
            results.push({
              credential_id: credential.id,
              phone: credential.phone,
              wpp_number_id: credential.wpp_number_id,
              status: statusResult.status,
              success: statusResult.success,
              error: statusResult.error
            });
            
          } catch (error) {
            logger.error(`[WHATSAPP] Erro ao verificar número ${credential.phone}: ${error.message}`);
            results.push({
              credential_id: credential.id,
              phone: credential.phone,
              wpp_number_id: credential.wpp_number_id,
              status: 'unknown',
              success: false,
              error: error.message
            });
          }
        }
      }
      
      return results;
      
    } catch (error) {
      logger.error(`[WHATSAPP] Erro ao verificar múltiplos números: ${error.message}`);
      throw error;
    }
  }

  /**
   * Adiciona um novo número de telefone à conta WhatsApp Business
   * @param {string} phoneNumber - Número de telefone no formato internacional (ex: 5511999999999)
   * @param {string} accessToken - Token de acesso da Meta
   * @param {string} businessAccountId - ID da conta de negócios
   * @returns {Promise<object>} - Resposta da API
   */
  async addPhoneNumber(phoneNumber, accessToken, businessAccountId, verifiedName = 'Business Name') {
    try {
      logger.info(`[WHATSAPP] Adicionando número ${phoneNumber} à conta ${businessAccountId}`);
      
      // Validar parâmetros
      if (!phoneNumber) {
        return {
          success: false,
          error: 'phoneNumber é obrigatório'
        };
      }
      
      if (!accessToken) {
        return {
          success: false,
          error: 'accessToken é obrigatório'
        };
      }
      
      if (!businessAccountId) {
        return {
          success: false,
          error: 'businessAccountId é obrigatório'
        };
      }
      
      // Validar formato do businessAccountId (deve ser um número)
      if (isNaN(businessAccountId)) {
        return {
          success: false,
          error: 'businessAccountId deve ser um número válido'
        };
      }
      
      // Limpar e validar verifiedName
      let cleanVerifiedName = verifiedName || 'Business';
      // Remover caracteres especiais e limitar a 25 caracteres (limite da Meta API)
      cleanVerifiedName = cleanVerifiedName
        .replace(/[^\w\s]/g, '') // Remove caracteres especiais exceto letras, números e espaços
        .replace(/\s+/g, ' ') // Remove espaços múltiplos
        .trim() // Remove espaços no início e fim
        .substring(0, 25); // Limita a 25 caracteres
      
      // Se ficou vazio após limpeza, usar valor padrão
      if (!cleanVerifiedName) {
        cleanVerifiedName = 'Business';
      }
      
      logger.info(`[WHATSAPP] Parâmetros validados:`, {
        phoneNumber: phoneNumber,
        businessAccountId: businessAccountId,
        accessToken: accessToken ? `${accessToken.substring(0, 10)}...` : 'undefined',
        verifiedName: verifiedName,
        cleanVerifiedName: cleanVerifiedName
      });
      
      // Separar código do país e número
      let cc = '55'; // Brasil por padrão
      let number = phoneNumber;
      
      // Remover caracteres especiais e espaços
      const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
      
      // Se o número começa com código do país, extrair
      if (cleanNumber.startsWith('55')) {
        cc = '55';
        number = cleanNumber.substring(2);
      } else if (cleanNumber.startsWith('+55')) {
        cc = '55';
        number = cleanNumber.substring(3);
      } else {
        // Se não tem código do país, assumir que é um número brasileiro
        cc = '55';
        number = cleanNumber;
      }
      
      // Validar se o número tem pelo menos 8 dígitos
      if (number.length < 8) {
        return {
          success: false,
          error: 'Número de telefone inválido. Deve ter pelo menos 8 dígitos.'
        };
      }
      
      logger.info(`[WHATSAPP] Código do país: ${cc}, Número: ${number}`);
      
      const payload = {
        cc: cc,
        phone_number: number,
        verified_name: cleanVerifiedName // Campo obrigatório da Meta API (limpo)
      };
      
      logger.info(`[WHATSAPP] Enviando requisição para: https://graph.facebook.com/v23.0/${businessAccountId}/phone_numbers`);
      logger.info(`[WHATSAPP] Payload: cc=${cc}, phone_number=${number}, verified_name=${cleanVerifiedName}`);
      logger.info(`[WHATSAPP] Headers: Authorization=Bearer ${accessToken ? accessToken.substring(0, 10) + '...' : 'undefined'}`);
      
      const response = await axios.post(
        `https://graph.facebook.com/v23.0/${businessAccountId}/phone_numbers`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      logger.info(`[WHATSAPP] Número ${phoneNumber} adicionado com sucesso:`, response.data);
      
      return {
        success: true,
        data: response.data,
        phone_number_id: response.data.id
      };
      
    } catch (error) {
      logger.error(`[WHATSAPP] Erro ao adicionar número ${phoneNumber}: ${error.message}`);
      
      if (error.response) {
        logger.error(`[WHATSAPP] Status da resposta: ${error.response.status}`);
        logger.error(`[WHATSAPP] Erro da API: ${error.response.data?.error?.message || 'Erro desconhecido'}`);
        
        // Verificar erros específicos da Meta
        const errorData = error.response.data;
        if (errorData.error) {
          const errorCode = errorData.error.code;
          const errorMessage = errorData.error.message;
          const errorSubcode = errorData.error.error_subcode;
          const errorUserMsg = errorData.error.error_user_msg; // Mensagem descritiva para o usuário
          
          // Usar a mensagem descritiva quando disponível, senão usar a mensagem padrão
          const displayMessage = errorUserMsg || errorMessage;
          
          // Erro específico para número já registrado (código 100, subcódigo 2388002)
          if (errorCode === 100 && errorSubcode === 2388002) {
            return {
              success: false,
              error: errorUserMsg || 'Número de telefone já está registrado em uma conta do WhatsApp. Para usar este número, desconecte-o da conta existente e tente novamente em até 3 minutos.',
              details: errorData,
              code: 'NUMBER_ALREADY_REGISTERED'
            };
          }
          
          // Erro específico para verified_name obrigatório
          if (errorCode === 100 && errorMessage && typeof errorMessage === 'string' && errorMessage.includes('verified_name is required')) {
            return {
              success: false,
              error: errorUserMsg || 'Nome de verificação é obrigatório para registrar o número',
              details: errorData,
              code: 'VERIFIED_NAME_REQUIRED'
            };
          }
          
          // Erro específico para número não disponível
          if (errorCode === 100 || (errorMessage && typeof errorMessage === 'string' && errorMessage.includes('phone number'))) {
            return {
              success: false,
              error: errorUserMsg || 'Número de telefone não está disponível para registro',
              details: errorData
            };
          }
          
          // Erro de token inválido
          if (errorCode === 190 || errorMessage.includes('access token')) {
            return {
              success: false,
              error: errorUserMsg || 'Token de acesso inválido ou expirado',
              details: errorData
            };
          }
          
          // Erro de permissões
          if (errorCode === 200 || errorMessage.includes('permission')) {
            return {
              success: false,
              error: errorUserMsg || 'Token não tem permissões suficientes para WhatsApp Business API',
              details: errorData
            };
          }
          
          // Para outros erros, usar a mensagem descritiva quando disponível
          return {
            success: false,
            error: displayMessage,
            details: errorData
          };
        }
        
        return {
          success: false,
          error: errorData.error?.error_user_msg || errorData.error?.message || 'Erro na API da Meta',
          details: errorData
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verifica se um número está disponível para registro
   * @param {string} phoneNumber - Número de telefone
   * @param {string} accessToken - Token de acesso da Meta
   * @returns {Promise<object>} - Resposta da API
   */
  async checkPhoneNumberAvailability(phoneNumber, accessToken, verifiedName = 'Business') {
    try {
      logger.info(`[WHATSAPP] Verificando disponibilidade do número ${phoneNumber}`);
      
      // Limpar e validar verifiedName
      let cleanVerifiedName = verifiedName || 'Business';
      // Remover caracteres especiais e limitar a 25 caracteres (limite da Meta API)
      cleanVerifiedName = cleanVerifiedName
        .replace(/[^\w\s]/g, '') // Remove caracteres especiais exceto letras, números e espaços
        .replace(/\s+/g, ' ') // Remove espaços múltiplos
        .trim() // Remove espaços no início e fim
        .substring(0, 25); // Limita a 25 caracteres
      
      // Se ficou vazio após limpeza, usar valor padrão
      if (!cleanVerifiedName) {
        cleanVerifiedName = 'Business';
      }
      
      logger.info(`[WHATSAPP] Parâmetros recebidos:`, {
        phoneNumber: phoneNumber,
        accessToken: accessToken ? `${accessToken.substring(0, 10)}...` : 'undefined',
        verifiedName: verifiedName,
        cleanVerifiedName: cleanVerifiedName,
        phoneNumberType: typeof phoneNumber,
        accessTokenType: typeof accessToken
      });
      
      // Validar se phoneNumber não está undefined
      if (!phoneNumber) {
        logger.error(`[WHATSAPP] phoneNumber está undefined ou vazio`);
        return {
          success: false,
          error: 'phoneNumber é obrigatório'
        };
      }
      
      // Separar código do país e número para verificação
      let cc = '55'; // Brasil por padrão
      let number = phoneNumber;
      
      // Se o número começa com código do país, extrair
      if (phoneNumber && phoneNumber.startsWith('55')) {
        cc = '55';
        number = phoneNumber.substring(2);
      } else if (phoneNumber && phoneNumber.startsWith('+55')) {
        cc = '55';
        number = phoneNumber.substring(3);
      }
      
      logger.info(`[WHATSAPP] Código do país: ${cc}, Número: ${number}`);
      
      // Fazer uma verificação real tentando adicionar o número temporariamente
      // Se der erro específico de número já registrado, saberemos que não está disponível
      const testPayload = {
        cc: cc,
        phone_number: number,
        verified_name: cleanVerifiedName
      };
      
      logger.info(`[WHATSAPP] Testando adição do número para verificar disponibilidade`);
      
      try {
        const response = await axios.post(
          'https://graph.facebook.com/v23.0/me/phone_numbers',
          testPayload,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        // Se chegou aqui, o número está disponível
        logger.info(`[WHATSAPP] Número está disponível para registro`);
        return {
          success: true,
          available: true,
          data: response.data
        };
        
      } catch (testError) {
        logger.info(`[WHATSAPP] Erro no teste de disponibilidade: ${testError.response?.data?.error?.message || testError.message}`);
        
        const errorData = testError.response?.data;
        if (errorData?.error) {
          const errorCode = errorData.error.code;
          const errorSubcode = errorData.error.error_subcode;
          const errorUserMsg = errorData.error.error_user_msg;
          
          // Erro específico para número já registrado
          if (errorCode === 100 && errorSubcode === 2388002) {
            logger.info(`[WHATSAPP] Número já está registrado em uma conta do WhatsApp`);
            return {
              success: false,
              available: false,
              error: errorUserMsg || 'Número de telefone já está registrado em uma conta do WhatsApp',
              code: 'NUMBER_ALREADY_REGISTERED',
              details: errorData
            };
          }
          
          // Para outros erros, assumir que o número está disponível
          // (pode ser erro de permissão, token, etc.)
          logger.info(`[WHATSAPP] Erro não relacionado à disponibilidade do número, assumindo disponível`);
          return {
            success: true,
            available: true,
            data: { message: 'Número será verificado na adição real' }
          };
        }
        
        // Para erros sem detalhes, assumir disponível
        logger.info(`[WHATSAPP] Erro sem detalhes, assumindo número disponível`);
        return {
          success: true,
          available: true,
          data: { message: 'Número será verificado na adição real' }
        };
      }
      
    } catch (error) {
      logger.error(`[WHATSAPP] Erro ao verificar disponibilidade do número ${phoneNumber}: ${error.message}`);
      
      if (error.response) {
        logger.error(`[WHATSAPP] Status da resposta: ${error.response.status}`);
        logger.error(`[WHATSAPP] Erro da API: ${error.response.data?.error?.message || 'Erro desconhecido'}`);
        
        const errorData = error.response.data;
        if (errorData.error) {
          const errorCode = errorData.error.code;
          const errorMessage = errorData.error.message;
          const errorUserMsg = errorData.error.error_user_msg; // Mensagem descritiva para o usuário
          
          // Usar a mensagem descritiva quando disponível
          const displayMessage = errorUserMsg || errorMessage;
          
          // Erro específico para número já registrado
          if (errorCode === 100 && errorData.error.error_subcode === 2388002) {
            return {
              success: false,
              available: false,
              error: errorUserMsg || 'Número de telefone já está registrado em uma conta do WhatsApp',
              code: 'NUMBER_ALREADY_REGISTERED'
            };
          }
          
          // Erro de token inválido
          if (errorCode === 190 || errorMessage.includes('access token')) {
            return {
              success: false,
              error: errorUserMsg || 'Token de acesso inválido ou expirado',
              code: 'INVALID_ACCESS_TOKEN'
            };
          }
          
          // Erro de permissões
          if (errorCode === 200 || errorMessage.includes('permission')) {
            return {
              success: false,
              error: errorUserMsg || 'Token não tem permissões suficientes para WhatsApp Business API',
              code: 'INSUFFICIENT_PERMISSIONS'
            };
          }
          
          // Para outros erros, usar a mensagem descritiva quando disponível
          return {
            success: false,
            error: displayMessage,
            code: errorCode
          };
        }
        
        return {
          success: false,
          error: errorData.error?.error_user_msg || errorData.error?.message || 'Erro na API da Meta'
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Lista todos os números de telefone da conta
   * @param {string} accessToken - Token de acesso da Meta
   * @param {string} businessAccountId - ID da conta de negócios
   * @returns {Promise<object>} - Resposta da API
   */
  async listPhoneNumbers(accessToken, businessAccountId) {
    try {
      logger.info(`[WHATSAPP] Listando números da conta ${businessAccountId}`);
      
      const response = await axios.get(
        `https://graph.facebook.com/v23.0/${businessAccountId}/phone_numbers`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      logger.info(`[WHATSAPP] Números listados com sucesso:`, response.data);
      
      return {
        success: true,
        data: response.data.data || [],
        total: response.data.data?.length || 0
      };
      
    } catch (error) {
      logger.error(`[WHATSAPP] Erro ao listar números: ${error.message}`);
      
      if (error.response) {
        logger.error(`[WHATSAPP] Resposta de erro da API:`, error.response.data);
        return {
          success: false,
          error: error.response.data.error?.message || 'Erro na API da Meta',
          details: error.response.data
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove um número de telefone da conta
   * @param {string} phoneNumberId - ID do número de telefone
   * @param {string} accessToken - Token de acesso da Meta
   * @returns {Promise<object>} - Resposta da API
   */
  async removePhoneNumber(phoneNumberId, accessToken) {
    try {
      logger.info(`[WHATSAPP] Removendo número ${phoneNumberId}`);
      
      const response = await axios.delete(
        `https://graph.facebook.com/v23.0/${phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      logger.info(`[WHATSAPP] Número ${phoneNumberId} removido com sucesso`);
      
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      logger.error(`[WHATSAPP] Erro ao remover número ${phoneNumberId}: ${error.message}`);
      
      if (error.response) {
        logger.error(`[WHATSAPP] Resposta de erro da API:`, error.response.data);
        return {
          success: false,
          error: error.response.data.error?.message || 'Erro na API da Meta',
          details: error.response.data
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Solicita código de verificação via SMS
   * @param {string} phoneNumberId - ID do número de telefone
   * @param {string} accessToken - Token de acesso da Meta
   * @param {string} codeMethod - Método de código (SMS, VOICE)
   * @param {string} language - Idioma do código (pt_BR, en_US, etc.)
   * @returns {Promise<object>} - Resposta da API
   */
  async requestVerificationCode(phoneNumberId, accessToken, codeMethod = 'SMS', language = 'pt_BR') {
    try {
      logger.info(`[WHATSAPP] Solicitando código de verificação para ${phoneNumberId} via ${codeMethod}`);
      
      const response = await axios.post(
        `https://graph.facebook.com/v23.0/${phoneNumberId}/request_code`,
        {
          code_method: codeMethod,
          language: language
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      logger.info(`[WHATSAPP] Código de verificação solicitado com sucesso:`, response.data);
      
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      logger.error(`[WHATSAPP] Erro ao solicitar código de verificação: ${error.message}`);
      
      if (error.response) {
        logger.error(`[WHATSAPP] Resposta de erro da API:`, error.response.data);
        
        const errorData = error.response.data.error;
        const responseData = error.response.data;
        
        if (errorData) {
          // Capturar campos específicos da Meta API
          const userTitle = responseData.error_user_title || errorData.error_user_title;
          const userMessage = responseData.error_user_msg || errorData.error_user_msg;
          const errorCode = errorData.code;
          const errorSubcode = errorData.error_subcode;
          
          // Log detalhado do erro
          logger.error(`[WHATSAPP] Detalhes do erro:`, {
            code: errorCode,
            subcode: errorSubcode,
            userTitle,
            userMessage,
            fullError: errorData
          });
          
          // Erro específico para código já solicitado
          if (errorCode === 100 && errorSubcode === 2388004) {
            return {
              success: false,
              error: userMessage || 'Código já foi solicitado. Aguarde alguns minutos antes de solicitar novamente.',
              userTitle: userTitle || 'Código já solicitado',
              code: 'CODE_ALREADY_REQUESTED',
              metaCode: errorCode,
              metaSubcode: errorSubcode,
              details: errorData
            };
          }
          
          // Erro específico para número não pendente de verificação
          if (errorCode === 100 && errorSubcode === 2388005) {
            return {
              success: false,
              error: userMessage || 'Número não está pendente de verificação.',
              userTitle: userTitle || 'Número não pendente',
              code: 'NUMBER_NOT_PENDING_VERIFICATION',
              metaCode: errorCode,
              metaSubcode: errorSubcode,
              details: errorData
            };
          }
          
          // Erro genérico com campos da Meta
          return {
            success: false,
            error: userMessage || errorData.message || 'Erro ao solicitar código de verificação',
            userTitle: userTitle || 'Erro na solicitação',
            code: 'META_API_ERROR',
            metaCode: errorCode,
            metaSubcode: errorSubcode,
            details: errorData
          };
        }
        
        // Se não há error específico, verificar se há campos de erro no nível da resposta
        const userTitle = responseData.error_user_title;
        const userMessage = responseData.error_user_msg;
        
        if (userTitle || userMessage) {
          return {
            success: false,
            error: userMessage || 'Erro na API da Meta',
            userTitle: userTitle || 'Erro na API',
            code: 'META_API_ERROR',
            details: responseData
          };
        }
        
        return {
          success: false,
          error: 'Erro na API da Meta',
          code: 'META_API_ERROR',
          details: responseData
        };
      }
      
      return {
        success: false,
        error: error.message,
        code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Verifica código de verificação
   * @param {string} phoneNumberId - ID do número de telefone
   * @param {string} accessToken - Token de acesso da Meta
   * @param {string} code - Código de verificação
   * @returns {Promise<object>} - Resposta da API
   */
  async verifyWhatsAppCode(phoneNumberId, accessToken, code) {
    try {
      logger.info(`[WHATSAPP] Verificando código para ${phoneNumberId}`);
      
      const response = await axios.post(
        `https://graph.facebook.com/v23.0/${phoneNumberId}/verify_code`,
        {
          code: code
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      logger.info(`[WHATSAPP] Código verificado com sucesso:`, response.data);
      
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      logger.error(`[WHATSAPP] Erro ao verificar código: ${error.message}`);
      
      if (error.response) {
        logger.error(`[WHATSAPP] Resposta de erro da API:`, error.response.data);
        
        const errorData = error.response.data.error;
        if (errorData) {
          // Erro específico para código inválido
          if (errorData.code === 100 && errorData.error_subcode === 2388006) {
            return {
              success: false,
              error: 'Código de verificação inválido.',
              code: 'INVALID_CODE',
              details: errorData
            };
          }
          
          return {
            success: false,
            error: errorData.message || 'Erro ao verificar código',
            details: errorData
          };
        }
        
        return {
          success: false,
          error: 'Erro na API da Meta',
          details: error.response.data
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verifica status da verificação
   * @param {string} phoneNumberId - ID do número de telefone
   * @param {string} accessToken - Token de acesso da Meta
   * @returns {Promise<object>} - Resposta da API
   */
  async checkVerificationStatus(phoneNumberId, accessToken) {
    try {
      logger.info(`[WHATSAPP] Verificando status da verificação para ${phoneNumberId}`);
      
      const response = await axios.get(
        `https://graph.facebook.com/v23.0/${phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      logger.info(`[WHATSAPP] Status da verificação:`, response.data);
      
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      logger.error(`[WHATSAPP] Erro ao verificar status: ${error.message}`);
      
      if (error.response) {
        logger.error(`[WHATSAPP] Resposta de erro da API:`, error.response.data);
        return {
          success: false,
          error: error.response.data.error?.message || 'Erro na API da Meta',
          details: error.response.data
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Atualiza status de uma credencial
   * @param {string} credentialId - ID da credencial
   * @param {string} status - Novo status
   * @param {Object} metadata - Metadados adicionais
   * @returns {Promise<Object>} Resultado da atualização
   */
  async updateCredentialStatus(credentialId, status, metadata = {}) {
    try {
      const query = `
        UPDATE whatsapp_credentials 
        SET status = $1, 
            metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;

      const values = [status, JSON.stringify(metadata), credentialId];
      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Credencial não encontrada');
      }

      console.log(`✅ Status da credencial ${credentialId} atualizado para: ${status}`);
      return result.rows[0];

    } catch (error) {
      console.error('❌ Erro ao atualizar status da credencial:', error);
      throw error;
    }
  }

  /**
   * Ativa número do WhatsApp na Meta API
   * @param {string} credentialId - ID da credencial
   * @param {string} pin - PIN de ativação
   * @returns {Promise<Object>} Resultado da ativação
   */
  async activateWhatsAppNumber(credentialId, pin) {
    try {
      console.log(`🔐 Ativando número do WhatsApp para credencial ${credentialId}`);

      // Buscar credencial
      const credential = await this.getCredentialById(credentialId);
      if (!credential) {
        throw new Error('Credencial não encontrada');
      }

      if (credential.connection_type !== 'ads') {
        throw new Error('Apenas credenciais ADS podem ser ativadas via Meta API');
      }

      if (!credential.wpp_access_token || !credential.wpp_number_id) {
        throw new Error('Credencial não possui token de acesso ou ID do número');
      }

      // Fazer chamada para Meta API
      const response = await this.makeMetaApiCall(
        `/${credential.wpp_number_id}/register`,
        'POST',
        {
          messaging_product: 'whatsapp',
          pin: pin
        },
        credential.wpp_access_token
      );

      console.log('✅ Número ativado com sucesso na Meta API:', response);

      // Atualizar status da credencial
      await this.updateCredentialStatus(credentialId, 'ativo', {
        last_activation: new Date().toISOString(),
        activation_pin: pin,
        meta_response: response
      });

      return {
        success: true,
        message: 'Número ativado com sucesso',
        data: response
      };

    } catch (error) {
      console.error('❌ Erro ao ativar número do WhatsApp:', error);
      throw error;
    }
  }
}

// Exporta uma instância do serviço
module.exports = new WhatsappService(); 