const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { requireAuth } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');
const whatsappService = require('../services/whatsappService');
const { optimizedMessagesQuery, optimizedSelect } = require('../utils/supabaseOptimized');
const { validate, schemas } = require('../middleware/validationMiddleware');
const { sanitizeInput, validateCSRF } = require('../middleware/securityMiddleware');

// console.log('DEBUG: Arquivo src/routes/messages.js carregado');

/**
 * @route GET /api/messages/:conversationId
 * @desc Obter mensagens de uma conversa específica (OTIMIZADO)
 * @access Private
 */
router.get('/:conversationId', 
  requireAuth, 
  sanitizeInput,
  validate(schemas.getMessages, 'query'),
  async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Limite padrão de 20 mensagens
    const offset = (page - 1) * limit;
    
    logger.info(`[MESSAGES] Página ${page} (${limit} mensagens) para conversa: ${conversationId}, usuário: ${userId}`);
    
    // Verificar se o usuário tem acesso a esta conversa (com cache)
    logger.info(`[MESSAGES-DEBUG] Iniciando verificação para conversa: ${conversationId}, usuário: ${userId}`);
    
    const { data: contactData, error: contactError } = await optimizedSelect(
      supabase,
      'contacts',
      'remote_jid, client_id',
      { eq: { remote_jid: conversationId, client_id: userId } },
      3000, // 3s timeout
      true // usar cache
    );
    
    logger.info(`[MESSAGES-DEBUG] Resultado optimizedSelect:`, {
      contactError: contactError?.message,
      contactData: contactData,
      contactDataLength: contactData?.data?.length,
      hasData: !!contactData?.data,
      conversationId,
      userId
    });
    
    if (contactError || !contactData || contactData.length === 0) {
      logger.error(`[MESSAGES-DEBUG] Acesso negado - Usuário ${userId} não tem acesso à conversa ${conversationId}`, {
        contactError: contactError?.message,
        contactData: contactData,
        contactDataLength: contactData?.length,
        condition: {
          hasError: !!contactError,
          noData: !contactData,
          emptyData: contactData?.length === 0
        }
      });
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta conversa'
      });
    }
    
    logger.info(`[MESSAGES-DEBUG] Acesso permitido - contato encontrado`);
    
    // Buscar mensagens com paginação
    // Para página 1: buscar as mais recentes (desc)
    // Para páginas seguintes: buscar mensagens mais antigas (desc com offset)
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (messagesError) {
      logger.error(`Erro ao buscar mensagens: ${messagesError.message}`, { error: messagesError });
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar mensagens',
        error: messagesError.message
      });
    }
    
    logger.info(`[MESSAGES] ✅ Página ${page}: ${messagesData?.length || 0} mensagens encontradas`);
    
    // Formatar as mensagens
    const formattedMessages = messagesData
      .map(msg => ({
        id: msg.id,
        content: msg.content,
        sender_id: msg.sender_id,
        receiver_id: msg.recipient_id,
        created_at: msg.timestamp,
        timestamp: msg.timestamp, // Para compatibilidade
        is_read: msg.status === 'read',
        role: msg.role || 'USER'
      }))
      // Para página 1: inverter para ordem cronológica (antigas para recentes)
      // Para páginas seguintes: manter ordem desc (mais recentes das antigas primeiro)
      .sort((a, b) => page === 1 ? 
        new Date(a.timestamp) - new Date(b.timestamp) : // Página 1: cronológica
        new Date(b.timestamp) - new Date(a.timestamp)   // Outras páginas: reversa
      );
    
    const hasMore = messagesData?.length === limit;
    
    return res.json({
      success: true,
      messages: formattedMessages,
      pagination: {
        page,
        limit,
        hasMore,
        total: formattedMessages.length
      },
      hasMore, // Compatibilidade com frontend
      total: formattedMessages.length,
      limit: limit
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
router.post('/', 
  requireAuth, 
  sanitizeInput, 
  validateCSRF, // Reabilitado com verificação de origem
  validate(schemas.sendMessage, 'body'),
  async (req, res) => {
  // console.log('[HANDLER LOG] Entrou no handler POST /api/messages', { body: req.body });
  try {
    const userId = req.user.id;
    const { conversationId, content, recipientId, role } = req.body;
    
    if (!conversationId || !content) {
      return res.status(400).json({
        success: false,
        message: 'ID da conversa e conteúdo são obrigatórios'
      });
    }
    
    logger.info(`DEBUG: Role recebido do frontend: ${role}`);
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

    // Log após inserir a mensagem no banco
    logger.info('DEBUG: Inserindo mensagem no banco', newMsg);
    logger.info('DEBUG: Antes do insert no banco');
    // Inserir a mensagem no banco de dados
    const { data, error } = await supabase
      .from('messages')
      .insert(newMsg)
      .select();
    logger.info('DEBUG: Mensagem inserida no banco, retorno:', data);
    
    if (error) {
      logger.error(`Erro ao inserir mensagem no banco: ${error.message}`, { error });
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar mensagem',
        error: error.message
      });
    }

    // Log antes do bloco de envio WhatsApp
    logger.info(`DEBUG: Antes do bloco de envio WhatsApp. validRole=${validRole}`);
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

        // Obter instanceId do contato para determinar qual API usar
        let instanceId = null;
        if (contactData.instance_id) {
          instanceId = contactData.instance_id;
          logger.info(`InstanceId obtido do contato: ${instanceId}`);
        } else {
          logger.warn('InstanceId não encontrado no contato, usando fallback');
        }

        logger.info(`Tentando enviar mensagem via WhatsApp para ${formattedPhone}`);
        logger.info(`Payload para WhatsApp: phone=${formattedPhone}, content=${content}, clientId=${clientId}, instanceId=${instanceId}`);
        const whatsappResponse = await whatsappService.sendTextMessage(formattedPhone, content, clientId, instanceId);
        logger.info(`Resposta da API WhatsApp: ${JSON.stringify(whatsappResponse)}`);
  

        if (whatsappResponse.success) {
          logger.info(`Mensagem enviada com sucesso. ID: ${whatsappResponse.data.messages[0].id}`);
          messageMetadata = {
            whatsapp_message_id: whatsappResponse.data.messages[0].id,
            response_data: whatsappResponse.data
          };
          // Atualizar status para sent
          await supabase
            .from('messages')
            .update({ status: 'sent', metadata: messageMetadata })
            .eq('conversation_id', conversationId)
            .eq('timestamp', msgTimestamp);
        } else {
          const errorMessage = whatsappResponse.error || 'Erro desconhecido';
          logger.error(`Erro ao enviar mensagem para WhatsApp: ${errorMessage}`);
          logger.error(`Detalhes do erro: ${whatsappResponse.error_details}`);
          
          // Verificar se é erro de conectividade (Evolution API offline)
          if (whatsappResponse.should_retry && whatsappResponse.status === 'pending') {
            logger.info('Evolution API offline. Mantendo mensagem como pending para reenvio posterior.');
            messageMetadata = { 
              error: errorMessage, 
              error_details: whatsappResponse.error_details,
              should_retry: true,
              retry_count: 0
            };
            await supabase
              .from('messages')
              .update({ status: 'pending', metadata: messageMetadata })
              .eq('conversation_id', conversationId)
              .eq('timestamp', msgTimestamp);
            
            // Retornar sucesso parcial (mensagem salva, mas não enviada)
            return res.status(202).json({
              success: false,
              message: {
                id: data[0].id,
                content: data[0].content,
                sender_id: data[0].sender_id,
                receiver_id: data[0].recipient_id,
                created_at: data[0].timestamp,
                is_read: false,
                role: data[0].role || validRole,
                status: 'pending'
              },
              feedback: 'Mensagem salva. Será enviada quando a Evolution API estiver online.',
              warning: 'Evolution API temporariamente indisponível'
            });
          } else {
            // Erro definitivo
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
    } else {
      logger.info(`DEBUG: Bloco de envio WhatsApp NÃO executado. validRole=${validRole}`);
    }
    
    // Formatar para retornar ao cliente
    const formattedMessage = {
      id: data[0].id,
      content: data[0].content,
      sender_id: data[0].sender_id,
      receiver_id: data[0].recipient_id,
      created_at: data[0].timestamp,
      is_read: false,
      role: data[0].role || validRole,
      status: data[0].status || 'pending'
    };

    logger.info(`Mensagem processada: ${data[0].id}`);

    // Verificar status final para feedback
    let feedbackMsg = '';
    let httpStatus = 201;
    if (formattedMessage.status === 'sent') {
      feedbackMsg = 'Mensagem enviada com sucesso.';
      httpStatus = 201;
    } else if (formattedMessage.status === 'failed') {
      feedbackMsg = 'Mensagem não pôde ser enviada. Tente novamente ou contate o suporte.';
      httpStatus = 202;
    } else {
      feedbackMsg = 'Mensagem recebida, mas ainda não foi enviada. O sistema tentará reenviar automaticamente.';
      httpStatus = 202;
    }

    return res.status(httpStatus).json({
      success: formattedMessage.status === 'sent',
      message: formattedMessage,
      feedback: feedbackMsg
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

/**
 * @route GET /api/messages/:conversationId/status-updates
 * @desc Buscar atualizações de status das mensagens de uma conversa
 * @access Private
 */
router.get('/:conversationId/status-updates', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message_ids } = req.query; // IDs das mensagens para verificar
    const userId = req.user.id;

    // Se message_ids for fornecido, buscar apenas essas mensagens
    if (message_ids) {
      const messageIdArray = message_ids.split(',');
      
      const { data: statusUpdates, error } = await supabase
        .from('messages')
        .select(`
          id,
          status,
          metadata,
          timestamp
        `)
        .eq('conversation_id', conversationId)
        .eq('client_id', userId)
        .in('id', messageIdArray);

      if (error) {
        logger.error(`Erro ao buscar atualizações de status: ${error.message}`);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar atualizações de status',
          error: error.message
        });
      }

      return res.json({
        success: true,
        updates: statusUpdates || [],
        current_time: new Date().toISOString()
      });
    }

    // Se não fornecido message_ids, buscar todas as mensagens da conversa
    const { data: statusUpdates, error } = await supabase
      .from('messages')
      .select(`
        id,
        status,
        metadata,
        timestamp
      `)
      .eq('conversation_id', conversationId)
      .eq('client_id', userId)
      .order('timestamp', { ascending: false })
      .limit(50); // Limitar para performance

    if (error) {
      logger.error(`Erro ao buscar atualizações de status: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar atualizações de status',
        error: error.message
      });
    }

    return res.json({
      success: true,
      updates: statusUpdates || [],
      current_time: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Erro ao buscar atualizações de status: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao processar solicitação',
      error: error.message
    });
  }
});

module.exports = router; 