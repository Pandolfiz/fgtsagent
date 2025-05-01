const chatService = require('../services/chatService');
const contactService = require('../services/contactService');
const { AppError } = require('../utils/errors');
const config = require('../config');
const fetch = require('node-fetch');
const EvolutionCredential = require('../models/evolutionCredential');

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
    // Extrair dados do body e fallback instanceId da query se necessário
    let { to, message, instanceId, conversationId } = req.body;
    if (!instanceId && req.query.instance) {
      instanceId = req.query.instance;
    }
    if (!to || !message || !conversationId || !instanceId) {
      throw new AppError('Destinatário, mensagem, ID da conversa e instância são obrigatórios', 400);
    }
    const senderId = req.user.id;
    // Buscar Nome do Agente
    const cred = await EvolutionCredential.findById(instanceId);
    if (!cred) {
      throw new AppError('Instância não encontrada', 404);
    }
    // Enviar somente o nome da instância, sem prefixo de usuário
    const instanceName = cred.instance_name;
    // Enviar para o n8n
    const n8nUrl = (process.env.N8N_API_URL || (config.n8n && config.n8n.apiUrl) || 'http://localhost:5678') + '/webhook/sendMessageEvolution';
    const n8nRes = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message, instanceId, instanceName })
    });
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
    const saved = await chatService.handleOutgoing({
      to,
      content: message,
      conversationId,
      senderId,
      instanceId
    });
    return res.status(200).json(saved);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Erro ao enviar mensagem'
    });
  }
}; 