const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

/**
 * Middleware de log para debug de webhooks
 */
router.use((req, res, next) => {
  console.log('[WebhookRoute] Chegou requisição:', req.method, req.originalUrl);
  console.log('[WebhookRoute] Headers:', req.headers);
  next();
});

/**
 * Endpoint para receber webhooks da Evolution API.
 * Valida o header 'apikey' no controller.
 */
router.post('/', chatController.handleWebhook);

module.exports = router; 