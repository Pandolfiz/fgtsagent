const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route GET /api/messages/:conversationId
 * @desc Obter mensagens de uma conversa específica
 * @access Private
 */
router.get('/:conversationId', async (req, res) => {
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
router.post('/', async (req, res) => {
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
      status: 'sent',
      metadata: {},
      client_id: userId,
      contact: contactData.phone,
      role: validRole
    };
    
    logger.info(`Enviando nova mensagem para conversa ${conversationId}`);
    
    const { data, error } = await supabase
      .from('messages')
      .insert(newMsg)
      .select();
    
    if (error) {
      logger.error(`Erro ao enviar mensagem: ${error.message}`, { error });
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar mensagem',
        error: error.message
      });
    }
    
    // Formatar para retornar ao cliente
    const formattedMessage = {
      id: data[0].id,
      content: data[0].content,
      sender_id: data[0].sender_id,
      receiver_id: data[0].recipient_id,
      created_at: data[0].timestamp,
      is_read: data[0].status === 'read',
      role: data[0].role || validRole
    };
    
    logger.info(`Mensagem enviada com sucesso: ${data[0].id}`);
    
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

module.exports = router; 