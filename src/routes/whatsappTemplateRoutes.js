/**
 * Rotas para gerenciar templates de mensagens do WhatsApp Business
 */
const express = require('express');
const router = express.Router();
const whatsappTemplateController = require('../controllers/whatsappTemplateController');
const { requireAuth } = require('../middleware/authMiddleware');
const { sanitizeInput } = require('../middleware/securityMiddleware');

// Aplicar middleware de autenticação em todas as rotas
router.use(requireAuth);
router.use(sanitizeInput);

/**
 * @route GET /api/whatsapp-templates
 * @desc Lista todos os templates de uma conta WhatsApp Business
 * @access Private
 */
router.get('/', whatsappTemplateController.listTemplates);

/**
 * @route GET /api/whatsapp-templates/accounts
 * @desc Lista todas as contas WhatsApp Business disponíveis para o usuário
 * @access Private
 */
router.get('/accounts', whatsappTemplateController.listAvailableAccounts);

/**
 * @route GET /api/whatsapp-templates/stats
 * @desc Busca estatísticas dos templates
 * @access Private
 */
router.get('/stats', whatsappTemplateController.getTemplateStats);

/**
 * @route POST /api/whatsapp-templates/create
 * @desc Cria um novo template de mensagem
 * @access Private
 */
router.post('/create', whatsappTemplateController.createTemplate);

/**
 * @route POST /api/whatsapp-templates/sync
 * @desc Sincroniza templates da API da Meta com o banco de dados
 * @access Private
 */
router.post('/sync', whatsappTemplateController.syncTemplates);

module.exports = router;
