const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

// Endpoint para receber webhooks da Evolution API
router.post('/webhook', chatController.handleWebhook);

// Histórico e stream de mensagens por conversa
router.get('/stream/:conversationId', requireAuth, chatController.streamMessages);

// Enviar nova mensagem via Evolution API
router.post('/send', requireAuth, chatController.sendMessage);

module.exports = router; 