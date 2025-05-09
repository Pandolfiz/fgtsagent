/**
 * Configuração do WhatsApp Cloud API
 */
module.exports = {
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || 'seu-token-aqui',
  apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
  baseUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com',
  defaultPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  defaultBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
}; 