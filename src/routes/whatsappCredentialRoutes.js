const express = require('express');
const router = express.Router();
const { requireAuth, clientContext } = require('../middleware');
const whatsappCredentialController = require('../controllers/whatsappCredentialController');
const logger = require('../utils/logger');

// Autenticação e contexto de cliente
router.use(requireAuth);
router.use(clientContext);

// Listar credenciais WhatsApp
router.get('/', whatsappCredentialController.list);

// Criar nova credencial
router.post('/', whatsappCredentialController.create);

// Verificar status de todos os números do cliente
router.get('/check-all-status', whatsappCredentialController.checkAllPhoneNumbersStatus);

// Rotas para gerenciamento de números na API oficial da Meta
router.post('/add-phone-number', whatsappCredentialController.addPhoneNumber);
router.post('/check-phone-availability', whatsappCredentialController.checkPhoneNumberAvailability);
router.post('/list-phone-numbers', whatsappCredentialController.listPhoneNumbers);
router.post('/remove-phone-number', whatsappCredentialController.removePhoneNumber);

// Rota para criar conta WhatsApp na API oficial da Meta (fluxo automatizado)
router.post('/create-whatsapp-account', whatsappCredentialController.createWhatsAppAccount);

// Rotas para verificação de números WhatsApp
router.post('/verify-whatsapp-code', whatsappCredentialController.verifyWhatsAppCode);
router.post('/check-verification-status', whatsappCredentialController.checkVerificationStatus);
router.post('/request-verification-code', whatsappCredentialController.requestVerificationCode);

// Rota para verificar status do rate limiting de SMS
router.get('/sms-rate-limit/:phoneNumberId', whatsappCredentialController.getSmsRateLimitStatus);

// Obter credencial por ID
router.get('/:id', whatsappCredentialController.getById);

// Atualizar credencial existente
router.put('/:id', whatsappCredentialController.update);

// Excluir credencial
router.delete('/:id', whatsappCredentialController.delete);

// Configurar instância na API e conectar WhatsApp Business
router.post('/:id/setup', whatsappCredentialController.setupInstance);

// Reiniciar instância na API
router.post('/:id/restart', whatsappCredentialController.restartInstance);

// Adicionar rota para obter QR Code de instância
router.get('/:id/qrcode', whatsappCredentialController.fetchQrCode);

// Verificar status de número WhatsApp via API da Meta
router.get('/:id/check-status', whatsappCredentialController.checkPhoneNumberStatus);
router.get('/:id/check-evolution-status', whatsappCredentialController.checkEvolutionStatus);

// Webhook para receber mensagens enviadas do n8n
router.post('/webhook/receivedWhatsApp', async (req, res) => {
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

// Rota para processar autenticação da Meta API
router.post('/facebook/auth', requireAuth, (req, res) => whatsappCredentialController.processFacebookAuth(req, res));



module.exports = router; 