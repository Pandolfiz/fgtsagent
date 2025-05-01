// Rotas para sistema de mensagens
const express = require('express');
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas para campanhas
router.get('/campaigns', messageController.getCampaigns);
router.post('/campaigns', messageController.createCampaign);
router.get('/campaigns/:id', messageController.getCampaign);
router.put('/campaigns/:id', messageController.updateCampaign);
router.delete('/campaigns/:id', messageController.deleteCampaign);
router.post('/campaigns/:id/schedule', messageController.scheduleCampaign);
router.post('/campaigns/:id/cancel', messageController.cancelCampaign);

// Rotas para destinatários de campanhas
router.get('/campaigns/:id/recipients', messageController.getCampaignRecipients);
router.post('/campaigns/:id/recipients', messageController.addCampaignRecipients);
router.delete('/campaigns/:id/recipients/:recipientId', messageController.removeCampaignRecipient);

// Rotas para mensagens diretas
router.get('/direct', messageController.getDirectMessages);
router.post('/direct', messageController.sendDirectMessage);

module.exports = router;