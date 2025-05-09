/**
 * Serviço para integração com a API Cloud do WhatsApp
 */
const axios = require('axios');
const logger = require('../utils/logger');
const { supabase } = require('../lib/supabaseClient');

/**
 * Classe de serviço para interação com a API Cloud do WhatsApp
 */
class WhatsappService {
  /**
   * Configuração do WhatsApp
   */
  config = {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
    baseUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com'
  };

  /**
   * Inicializa o cliente axios com as credenciais
   * @param {string} phoneNumberId - ID do número de telefone do WhatsApp
   * @returns {Object} - Cliente axios configurado
   */
  _createClient(phoneNumberId) {
    return axios.create({
      baseURL: `${this.config.baseUrl}/${this.config.apiVersion}/${phoneNumberId}`,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Obtém as credenciais do WhatsApp para um usuário específico
   * @param {string} userId - ID do usuário no sistema
   * @returns {Promise<Object>} - Credenciais do WhatsApp
   */
  async getCredentials(userId) {
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
      
      return {
        phoneNumberId: credential.wpp_number_id,
        businessAccountId: credential.wpp_business_account_id
      };
    } catch (error) {
      logger.error(`Erro ao processar credenciais do WhatsApp: ${error.message}`);
      throw error;
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
   * Envia uma mensagem de texto via WhatsApp
   * @param {string} to - Número de telefone do destinatário (formato: 5511999999999)
   * @param {string} message - Conteúdo da mensagem
   * @param {string} userId - ID do usuário que está enviando a mensagem
   * @returns {Promise<object>} - Resposta da API
   */
  async sendTextMessage(to, message, userId) {
    try {
      logger.info(`Enviando mensagem para ${to} pelo usuário ${userId}`);
      
      // Obter credenciais do usuário
      const credentials = await this.getCredentials(userId);
      const client = this._createClient(credentials.phoneNumberId);
      
      // Garantir que o número de telefone tenha o formato correto
      const formattedTo = this._formatPhoneNumber(to);
      
      // Construir o payload conforme a documentação oficial da Meta
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        type: 'text',
        text: {
          preview_url: true,
          body: message
        }
      };
      
      logger.info(`Payload da requisição: ${JSON.stringify(payload)}`);
      
      // Enviar a requisição para a API do WhatsApp
      const response = await client.post('/messages', payload);
      
      logger.info(`Mensagem enviada com sucesso: ${JSON.stringify(response.data)}`);
      
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
        error: error.response ? error.response.data : error.message
      };
    }
  }

  /**
   * Envia um indicador de digitação para o destinatário
   * @param {string} to - Número de telefone do destinatário
   * @param {string} userId - ID do usuário que está enviando a mensagem
   * @returns {Promise<object>} - Resposta da API
   */
  async sendTypingIndicator(to, userId) {
    try {
      logger.info(`Enviando indicador de digitação para ${to}`);
      
      // Obter credenciais do usuário
      const credentials = await this.getCredentials(userId);
      const client = this._createClient(credentials.phoneNumberId);
      
      // Formatar o número
      const formattedTo = this._formatPhoneNumber(to);
      
      // Payload para indicador de digitação conforme documentação oficial da API
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual', 
        to: formattedTo,
        type: 'contacts'
      };
      
      logger.debug('Sending typing indication with proper "typing" status endpoint');
      
      // Usar o endpoint específico para status de digitação 
      const response = await client.post('/messages?type=typing', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        typing: {
          status: 'typing'
        }
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error(`Erro ao enviar indicador de digitação: ${error.message}`);
      return {
        success: false,
        error: error.response ? error.response.data : error.message
      };
    }
  }
}

// Exporta uma instância do serviço
module.exports = new WhatsappService(); 