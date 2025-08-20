const express = require('express');
const router = express.Router();
const { requireAuth, clientContext } = require('../middleware');
const evolutionCredentialController = require('../controllers/evolutionCredentialController');
const logger = require('../utils/logger');

// Autenticação e contexto de cliente
router.use(requireAuth);
router.use(clientContext);

// Listar credenciais EvolutionAPI
router.get('/', whatsappCredentialController.list);

// Obter credencial por ID
router.get('/:id', evolutionCredentialController.getById);

// Criar nova credencial
router.post('/', evolutionCredentialController.create);

// Atualizar credencial existente
router.put('/:id', evolutionCredentialController.update);

// Excluir credencial
router.delete('/:id', evolutionCredentialController.delete);

// Configurar instância na Evolution API e conectar WhatsApp Business
router.post('/:id/setup', evolutionCredentialController.setupInstance);

// Reiniciar instância na Evolution API
router.post('/:id/restart', evolutionCredentialController.restartInstance);

// Adicionar rota para obter QR Code de instância
router.get('/:id/qrcode', evolutionCredentialController.fetchQrCode);

// Webhook para receber mensagens enviadas do n8n
router.post('/webhook/receivedWhatsApp', requireAuth, async (req, res) => {
  try {
    // Removido log de req.body para evitar vazamento de dados sensíveis
  logger.info('[Webhook] Mensagem recebida do n8n', { 
    type: req.body?.type,
    instanceName: req.body?.instanceName,
    event: req.body?.event,
    timestamp: new Date().toISOString()
  });
    logger.info(`[Webhook WhatsApp] Payload recebido: ${JSON.stringify(req.body)}`);
    
    const userId = req.user?.id || req.body?.userId;
    
    if (!userId) {
      logger.error('[Webhook WhatsApp] ID do usuário não disponível');
      return res.status(400).json({
        success: false,
        error: 'ID do usuário obrigatório'
      });
    }
    
    logger.info(`[Webhook WhatsApp] Processando mensagem para usuário: ${userId}`);
    
    // Processar mensagem...
    
    return res.status(200).json({
      success: true,
      message: 'Mensagem processada com sucesso'
    });
  } catch (error) {
    logger.error(`[Webhook WhatsApp] Erro: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 