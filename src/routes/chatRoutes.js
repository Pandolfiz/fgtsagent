const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

// Endpoint para receber webhooks da Evolution API
router.post('/webhook', chatController.handleWebhook);

// Histórico e stream de mensagens por conversa
router.get('/stream/:conversationId', requireAuth, chatController.streamMessages);

// Obter a última mensagem de uma conversa
router.get('/messages/:conversationId/last', requireAuth, chatController.getLastMessage);

// Obter mensagens de uma conversa com paginação
router.get('/messages/:conversationId', requireAuth, chatController.getMessages);

// Enviar nova mensagem via Evolution API
router.post('/send', requireAuth, chatController.sendMessage);

module.exports = router; 