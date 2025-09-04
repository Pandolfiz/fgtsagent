const chatService = require('../services/chatService');
const contactService = require('../services/contactService');
const { AppError } = require('../utils/errors');
const config = require('../config');
const fetch = require('node-fetch');
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

// Recebe webhooks do Evolution API (via n8n)
exports.handleWebhook = async (req, res) => {
  try {
    const payload = req.body;
    // Suporta array de eventos do webhook
    if (Array.isArray(payload)) {
      for (const item of payload) {
        const body = item.body || item;
        // Se for atualização de contatos, delegar ao contactService
        if (body.event === 'contacts.update') {
          await contactService.handleContactsUpdate(body.data);
          continue;
        }
        await chatService.handleWebhookEvent(body);
      }
    } else {
      const body = payload.body || payload;
      // Se for atualização de contatos
      if (body.event === 'contacts.update') {
        await contactService.handleContactsUpdate(body.data);
      } else {
        await chatService.handleWebhookEvent(body);
      }
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return res.status(500).json({ error: 'Erro ao processar webhook' });
  }
};

// Endpoint SSE para stream de mensagens em tempo real
exports.streamMessages = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    // Instância selecionada para filtrar as mensagens
    const instanceId = req.query.instance;
    if (!conversationId) {
      throw new AppError('ID da conversa é obrigatório', 400);
    }

    // Configuração SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Função para enviar mensagens ao cliente
    const messageHandler = (message) => {
      // Filtrar por conversa e instância (se fornecida)
      if (message.conversation_id === conversationId &&
          (!instanceId || message.metadata.instanceId === instanceId)) {
        res.write(`data: ${JSON.stringify(message)}\n\n`);
      }
    };

    // Registrar listener de eventos
    chatService.onMessage(messageHandler);

    // Enviar histórico filtrado pela instância
    const history = await chatService.getHistory(conversationId, instanceId);
    res.write(`data: ${JSON.stringify({ type: 'history', messages: history })}\n\n`);

    // Limpar o listener quando a conexão for fechada
    req.on('close', () => {
      chatService.offMessage(messageHandler);
    });
  } catch (error) {
    console.error('Erro no stream de mensagens:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Erro interno no servidor'
    });
  }
};

// Enviar mensagem
exports.sendMessage = async (req, res) => {
  try {
    let { to, message, instanceId, conversationId, role, sender_id } = req.body;
    if (!instanceId && req.query.instance) {
      instanceId = req.query.instance;
    }
    if (!to || !message || !conversationId || !instanceId) {
      throw new AppError('Destinatário, mensagem, ID da conversa e instância são obrigatórios', 400);
    }
    if (role && !['ME', 'AI', 'USER'].includes(role)) {
      console.warn(`Valor de role inválido: ${role}. Usando 'ME' como padrão.`);
      role = 'ME';
    } else if (!role) {
      role = 'ME';
    }
    if (!req.user || !req.user.id) {
      logger.error('Usuário não autenticado ou ID não disponível', { user: req.user });
      throw new AppError('Usuário não autenticado ou ID não disponível', 401);
    }
    console.log(`[DEBUG] Enviando mensagem com role=${role}, to=${to}, conversationId=${conversationId}, user_id=${req.user.id}`);
    const senderId = req.user.id;
    logger.info(`Enviando mensagem como usuário: ${senderId} (${typeof senderId})`);
    // Buscar Nome do Agente via Supabase
    const { data: creds, error } = await supabaseAdmin
      .from('whatsapp_credentials')
      .select('*')
      .eq('id', instanceId);
    if (error) throw error;
    const cred = creds && creds[0];
    if (!cred) {
      throw new AppError('Instância não encontrada', 404);
    }
    const instanceName = cred.instance_name;
    logger.info(`Enviando para n8n: instância=${instanceName}, usuário=${senderId}`);
    
    const n8nUrl = (process.env.N8N_API_URL || (config.n8n && config.n8n.apiUrl) || 'http://localhost:5678') + '/webhook/sendMessageEvolution';
    
    // ✅ Removido timeout para webhooks assíncronos
    // const controller = new AbortController();
    // const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const n8nRes = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ✅ Removido signal e timeout
        body: JSON.stringify({ 
          to, 
          message, 
          instanceId, 
          instanceName,
          role,
          userId: senderId
        })
      });
      
      // ✅ Removido clearTimeout
      
      if (!n8nRes.ok) {
        let errorMsg = `Erro ao enviar mensagem para o n8n (status: ${n8nRes.status})`;
        let responseText = '';
        try {
          responseText = await n8nRes.text();
          errorMsg += `\nResposta do n8n: ${responseText}`;
          try { const errJson = JSON.parse(responseText); errorMsg = errJson.error || errorMsg; } catch {}
        } catch {}
        console.error('[n8n webhook erro]', errorMsg);
        throw new AppError(errorMsg, 500);
      }
    } catch (error) {
      // ✅ Removido clearTimeout e verificação de AbortError
      
      throw error;
    }

    const saved = await chatService.handleOutgoing({
      to,
      content: message,
      conversationId,
      instanceId,
      role: role || 'ME'
    });
    return res.status(200).json({
      success: true,
      message: saved
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Erro ao enviar mensagem'
    });
  }
};

// Obter a última mensagem de uma conversa
exports.getLastMessage = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    // Instância selecionada para filtrar as mensagens
    const instanceId = req.query.instance;
    
    if (!conversationId) {
      throw new AppError('ID da conversa é obrigatório', 400);
    }

    const lastMessage = await chatService.getLastMessage(conversationId, instanceId);
    
    return res.status(200).json({
      success: true,
      message: lastMessage
    });
  } catch (error) {
    console.error('Erro ao buscar última mensagem:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Erro ao buscar última mensagem'
    });
  }
};

// Obter mensagens de uma conversa com paginação
exports.getMessages = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const instanceId = req.query.instance;
    
    if (!conversationId) {
      throw new AppError('ID da conversa é obrigatório', 400);
    }

    logger.info(`[CHAT] Buscando mensagens - conversa: ${conversationId}, página: ${page}, limite: ${limit}`);

    // Buscar mensagens ordenadas por timestamp descendente (mais recentes primeiro)
    // Para paginação de chat: página 1 = mensagens mais recentes
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      logger.error(`Erro ao buscar mensagens: ${error.message}`);
      throw new Error(error.message);
    }

    // ✅ CORREÇÃO: Processar mensagens incluindo o campo status
    const processedMessages = (messages || [])
      .map(msg => ({
        id: msg.id,
        content: msg.content,
        sender_id: msg.sender_id,
        receiver_id: msg.recipient_id,
        created_at: msg.timestamp,
        timestamp: msg.timestamp,
        status: msg.status || 'pending', // ✅ ADICIONADO: Campo status
        is_read: msg.status === 'read',
        role: msg.role || 'USER'
      }));
    
    // Sempre manter mensagens mais recentes primeiro para exibição correta
    // O frontend fará scroll automático para as mensagens mais recentes
    const finalMessages = processedMessages; // Sempre: mais recente → mais antiga

    const hasMore = messages?.length === limit;

    logger.info(`[CHAT] ✅ ${finalMessages.length} mensagens encontradas para ${conversationId} (página ${page})`);
    logger.info(`[CHAT] 📊 Debug paginação:`, {
      page,
      limit,
      messagesLength: messages?.length,
      hasMore,
      conversationId
    });
    
    return res.status(200).json({
      success: true,
      messages: finalMessages,
      pagination: {
        page,
        limit,
        hasMore,
        total: finalMessages.length
      },
      hasMore, // Compatibilidade com frontend
      total: finalMessages.length,
      limit: limit
    });
  } catch (error) {
    logger.error('Erro ao buscar mensagens:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Erro ao buscar mensagens'
    });
  }
}; 