/**
 * Configuração para integração com a API do WhatsApp Cloud
 */
const logger = require('../utils/logger');
const dotenv = require('dotenv');

// Garantir que as variáveis de ambiente sejam carregadas
dotenv.config();

// Registrar todas as variáveis de ambiente relacionadas ao WhatsApp (para debug)
logger.info('==== CONFIGURAÇÃO DO WHATSAPP ====');
for (const key in process.env) {
  if (key.startsWith('WHATSAPP_')) {
    const maskedValue = key === 'WHATSAPP_ACCESS_TOKEN' 
      ? (process.env[key] ? '********' : 'não configurado') 
      : (process.env[key] || 'não configurado');
    logger.info(`${key}: ${maskedValue}`);
  }
}

// Verificar se as variáveis de ambiente essenciais estão configuradas
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

// Removidas referências a variáveis que não existem no .env
// Estas informações serão obtidas da tabela whatsapp_credentials

// Registrar no log a presença ou ausência das variáveis críticas
if (!accessToken) {
  logger.error('CONFIGURAÇÃO: WHATSAPP_ACCESS_TOKEN não está definido no .env');
} else {
  logger.info('CONFIGURAÇÃO: WHATSAPP_ACCESS_TOKEN está configurado no .env');
  logger.info('Os dados de phoneNumberId e businessAccountId serão obtidos do banco de dados Supabase');
}

module.exports = {
  /**
   * Token de acesso para a API WhatsApp Cloud
   * Obtido através do Facebook/Meta Developer Console
   */
  accessToken: accessToken || '',
  
  /**
   * Versão da API do WhatsApp a ser utilizada
   * Recomendado usar a versão v23.0 da API da Meta
   */
  apiVersion: process.env.WHATSAPP_API_VERSION || 'v23.0',
  
  /**
   * URL base da API do WhatsApp
   */
  baseUrl: process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com',
  
  /**
   * ID do número de telefone do WhatsApp e ID da conta business
   * serão obtidos exclusivamente do banco de dados (tabela whatsapp_credentials)
   * com os campos wpp_number_id e wpp_business_account_id
   */
  
  /**
   * Webhook verify token para validação do webhook pelo Facebook
   */
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'seu_token_de_verificacao'
}; 