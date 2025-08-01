const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

/**
 * POST /api/webhook/balance-query
 * Endpoint para enviar webhook de consulta de saldo
 */
router.post('/balance-query', requireAuth, async (req, res) => {
  try {
    const payload = req.body;
    const userId = req.user.id;
    
    logger.info('[Webhook] Consulta de saldo solicitada', {
      userId,
      payloadLength: Array.isArray(payload) ? payload.length : 0,
      payload: payload
    });
    
    // Validar se o payload é um array
    if (!Array.isArray(payload)) {
      return res.status(400).json({
        success: false,
        message: 'Payload deve ser um array'
      });
    }
    
    // Validar se há pelo menos um item no array
    if (payload.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Payload não pode estar vazio'
      });
    }
    
    // Validar campos obrigatórios do primeiro item
    const firstItem = payload[0];
    const requiredFields = ['cpf', 'provider', 'nome', 'grant_type', 'username', 'password', 'audience', 'scope', 'client_id', 'user_id'];
    
    for (const field of requiredFields) {
      if (!firstItem[field]) {
        return res.status(400).json({
          success: false,
          message: `Campo obrigatório ausente: ${field}`
        });
      }
    }
    
    // Aqui você pode adicionar lógica para processar o webhook
    // Por exemplo, enviar para um serviço externo, salvar no banco, etc.
    
    logger.info('[Webhook] Payload validado com sucesso', {
      userId,
      cpf: firstItem.cpf,
      provider: firstItem.provider,
      nome: firstItem.nome
    });
    
    // Por enquanto, apenas retornar sucesso
    // Você pode implementar a lógica específica aqui
    return res.json({
      success: true,
      message: 'Webhook processado com sucesso',
      data: {
        processed: payload.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('[Webhook] Erro ao processar webhook de consulta de saldo:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router; 