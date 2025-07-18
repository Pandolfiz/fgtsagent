const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');
const whatsappService = require('../services/whatsappService');

/**
 * @route GET /api/messages/:conversationId
 * @desc Obter mensagens de uma conversa específica
 * @access Private
 */
router.get('/:conversationId', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    
    logger.info(`Buscando mensagens para conversa: ${conversationId}, usuário: ${userId}`);
    
    // Verificar se o usuário tem acesso a esta conversa
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('remote_jid', conversationId)
      .eq('client_id', userId)
      .single();
    
    if (contactError || !contactData) {
      logger.error(`Usuário ${userId} não tem acesso à conversa ${conversationId}`);
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta conversa'
      });
    }
    
    // Buscar mensagens
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });
    
    if (messagesError) {
      logger.error(`Erro ao buscar mensagens: ${messagesError.message}`, { error: messagesError });
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar mensagens',
        error: messagesError.message
      });
    }
    
    logger.info(`Mensagens encontradas: ${messagesData?.length || 0}`);
    
    // Formatar as mensagens
    const formattedMessages = messagesData.map(msg => ({
      id: msg.id,
      content: msg.content,
      sender_id: msg.sender_id,
      receiver_id: msg.recipient_id,
      created_at: msg.timestamp,
      is_read: msg.status === 'read',
      role: msg.role || 'USER'
    }));
    
    return res.json({
      success: true,
      messages: formattedMessages
    });
  } catch (error) {
    logger.error('Erro ao processar solicitação de mensagens:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao processar solicitação',
      error: error.message
    });
  }
});

/**
 * @route POST /api/messages
 * @desc Enviar uma nova mensagem
 * @access Private
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, content, recipientId, role } = req.body;
    
    if (!conversationId || !content) {
      return res.status(400).json({
        success: false,
        message: 'ID da conversa e conteúdo são obrigatórios'
      });
    }
    
    // Garantir que role seja um dos valores aceitos
    let validRole = role;
    if (!validRole || !['ME', 'AI', 'USER'].includes(validRole)) {
      validRole = 'ME'; // Valor padrão para mensagens enviadas pelo usuário
    }
    
    // Verificar se o usuário tem acesso a esta conversa
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('remote_jid', conversationId)
      .eq('client_id', userId)
      .single();
    
    if (contactError || !contactData) {
      logger.error(`Usuário ${userId} tentou enviar mensagem para conversa não autorizada: ${conversationId}`);
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta conversa'
      });
    }
    
    const msgTimestamp = new Date().toISOString();
    
    const newMsg = {
      conversation_id: conversationId,
      sender_id: userId,
      recipient_id: recipientId || contactData.phone,
      content: content,
      timestamp: msgTimestamp,
      status: 'pending', // Status inicial: pendente
      metadata: {},
      client_id: userId,
      contact: contactData.phone,
      role: validRole
    };
    
    logger.info(`Enviando nova mensagem para conversa ${conversationId}`);
    
    // Inserir a mensagem no banco de dados
    const { data, error } = await supabase
      .from('messages')
      .insert(newMsg)
      .select();
    
    if (error) {
      logger.error(`Erro ao inserir mensagem no banco: ${error.message}`, { error });
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar mensagem',
        error: error.message
      });
    }
    
    // Apenas enviar pelo WhatsApp se for uma mensagem do usuário ou do assistente
    // Mensagens com role 'USER' são mensagens recebidas e não precisam ser enviadas
    if (validRole === 'ME' || validRole === 'AI') {
      const recipientPhone = recipientId || contactData.phone;
      let messageMetadata = {};
      try {
        if (!userId) {
          logger.error('ID do usuário não fornecido para enviar mensagem pelo WhatsApp');
          throw new Error('ID do usuário é obrigatório para enviar mensagem');
        }
        logger.info(`Enviando mensagem para ${recipientPhone} pelo usuário ${userId}`);
        const clientId = contactData.client_id || userId;
        logger.info(`ClientId para envio de mensagem: ${clientId}, Tipo: ${typeof clientId}`);
        logger.info(`Dados de contato: ${JSON.stringify(contactData)}`);

        // CORREÇÃO: Formatar número corretamente (apenas dígitos)
        const formattedPhone = recipientPhone.replace(/\D/g, '');
        logger.info(`Número formatado para WhatsApp: ${formattedPhone}`);

        await whatsappService.sendTypingIndicator(formattedPhone, clientId);
        const typingDelay = Math.min(Math.max(content.length * 30, 1000), 3000);
        await new Promise(resolve => setTimeout(resolve, typingDelay));

        logger.info(`Tentando enviar mensagem via WhatsApp oficial para ${formattedPhone}`);
        logger.info(`Payload para WhatsApp: phone=${formattedPhone}, content=${content}, clientId=${clientId}`);
        const whatsappResponse = await whatsappService.sendTextMessage(formattedPhone, content, clientId);
        logger.info(`Resposta da API WhatsApp: ${JSON.stringify(whatsappResponse)}`);

        if (whatsappResponse.success) {
          logger.info(`Mensagem enviada com sucesso. ID: ${whatsappResponse.data.messages[0].id}`);
          messageMetadata = {
            whatsapp_message_id: whatsappResponse.data.messages[0].id,
            response_data: whatsappResponse.data
          };
          await supabase
            .from('messages')
            .update({ status: 'sent', metadata: messageMetadata })
            .eq('conversation_id', conversationId)
            .eq('timestamp', msgTimestamp);
        } else {
          const errorMessage = whatsappResponse.error || 'Erro desconhecido';
          logger.error(`Erro ao enviar mensagem para WhatsApp: ${errorMessage}`);
          logger.error(`Detalhes do erro: ${whatsappResponse.error_details}`);
          messageMetadata = { error: errorMessage, error_details: whatsappResponse.error_details };
          await supabase
            .from('messages')
            .update({ status: 'failed', metadata: messageMetadata })
            .eq('conversation_id', conversationId)
            .eq('timestamp', msgTimestamp);
          return res.status(500).json({
            success: false,
            message: 'Erro ao enviar mensagem para o WhatsApp',
            error: errorMessage,
            error_details: whatsappResponse.error_details
          });
        }
      } catch (err) {
        logger.error(`Exceção ao enviar mensagem para WhatsApp: ${err.message}`);
        await supabase
          .from('messages')
          .update({ status: 'failed', metadata: { error: err.message } })
          .eq('conversation_id', conversationId)
          .eq('timestamp', msgTimestamp);
        return res.status(500).json({
          success: false,
          message: 'Erro ao enviar mensagem para o WhatsApp',
          error: err.message
        });
      }
    }
    
    // Formatar para retornar ao cliente
    const formattedMessage = {
      id: data[0].id,
      content: data[0].content,
      sender_id: data[0].sender_id,
      receiver_id: data[0].recipient_id,
      created_at: data[0].timestamp,
      is_read: false,
      role: data[0].role || validRole
    };
    
    logger.info(`Mensagem processada: ${data[0].id}`);
    
    return res.status(201).json({
      success: true,
      message: formattedMessage
    });
  } catch (error) {
    logger.error('Erro ao processar envio de mensagem:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao processar solicitação',
      error: error.message
    });
  }
});

/**
 * @route PATCH /api/messages/:messageId/status
 * @desc Atualizar o status de uma mensagem
 * @access Private
 */
router.patch('/:messageId/status', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    
    if (!status || !['sent', 'delivered', 'read', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido. Deve ser: sent, delivered, read ou failed'
      });
    }
    
    // Verificar se a mensagem existe e pertence ao usuário
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .select('*, contacts!inner(*)')
      .eq('id', messageId)
      .eq('contacts.client_id', userId)
      .single();
    
    if (messageError || !messageData) {
      logger.error(`Mensagem ${messageId} não encontrada ou não pertence ao usuário ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'Mensagem não encontrada'
      });
    }
    
    // Atualizar o status
    const { error: updateError } = await supabase
      .from('messages')
      .update({ status })
      .eq('id', messageId);
    
    if (updateError) {
      logger.error(`Erro ao atualizar status da mensagem: ${updateError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar status da mensagem',
        error: updateError.message
      });
    }
    
    // Se o status for 'read', marcar a mensagem como lida na API do WhatsApp
    if (status === 'read' && messageData.metadata?.whatsapp_message_id) {
      await whatsappService.markMessageAsRead(messageData.metadata.whatsapp_message_id, userId);
    }
    
    logger.info(`Status da mensagem ${messageId} atualizado para ${status}`);
    
    return res.json({
      success: true,
      message: 'Status da mensagem atualizado com sucesso'
    });
  } catch (error) {
    logger.error(`Erro ao atualizar status da mensagem: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao processar solicitação',
      error: error.message
    });
  }
});

module.exports = router; 