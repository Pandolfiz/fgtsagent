const { supabase } = require('../config/supabase');
const whatsappService = require('./whatsappService');
const logger = require('../utils/logger');

/**
 * Reprocessa mensagens pendentes, tentando reenviá-las via WhatsApp
 */
async function reprocessPendingMessages() {
  logger.info('[Reprocessador] Iniciando reprocessamento de mensagens pendentes...');
  const { data: pendingMessages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('status', 'pending');
  if (error) {
    logger.error('[Reprocessador] Erro ao buscar mensagens pendentes:', error.message);
    return;
  }
  if (!pendingMessages || pendingMessages.length === 0) {
    logger.info('[Reprocessador] Nenhuma mensagem pendente encontrada.');
    return;
  }
  for (const msg of pendingMessages) {
    try {
      logger.info(`[Reprocessador] Tentando reenviar mensagem ${msg.id} para ${msg.recipient_id}`);
      const whatsappResponse = await whatsappService.sendTextMessage(msg.recipient_id, msg.content, msg.sender_id);
      let messageMetadata = {};
      if (whatsappResponse.success) {
        messageMetadata = {
          whatsapp_message_id: whatsappResponse.data.messages[0].id,
          response_data: whatsappResponse.data
        };
        await supabase
          .from('messages')
          .update({ status: 'sent', metadata: messageMetadata })
          .eq('id', msg.id);
        logger.info(`[Reprocessador] Mensagem ${msg.id} reenviada com sucesso!`);
      } else {
        messageMetadata = { error: whatsappResponse.error, error_details: whatsappResponse.error_details };
        await supabase
          .from('messages')
          .update({ status: 'failed', metadata: messageMetadata })
          .eq('id', msg.id);
        logger.error(`[Reprocessador] Falha ao reenviar mensagem ${msg.id}: ${whatsappResponse.error}`);
      }
    } catch (err) {
      await supabase
        .from('messages')
        .update({ status: 'failed', metadata: { error: err.message } })
        .eq('id', msg.id);
      logger.error(`[Reprocessador] Erro inesperado ao reenviar mensagem ${msg.id}: ${err.message}`);
    }
  }
  logger.info('[Reprocessador] Reprocessamento concluído.');
}

module.exports = { reprocessPendingMessages };