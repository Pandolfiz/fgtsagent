/**
 * Rotas para controle de mensagens template da Meta API
 */
const express = require('express');
const router = express.Router();
const metaTemplateController = require('../controllers/metaTemplateController');
const { requireAuth } = require('../middleware/authMiddleware');

// Aplicar middleware de autenticação em todas as rotas
router.use(requireAuth);

/**
 * @route GET /api/meta-template/check-send-status
 * @desc Verifica se uma mensagem pode ser enviada livremente ou se precisa de template
 * @access Private
 * @query {string} conversationId - ID da conversa
 * @query {string} instanceId - ID da instância
 */
router.get('/check-send-status', metaTemplateController.checkSendStatus);

/**
 * @route GET /api/meta-template/approved-templates
 * @desc Busca templates aprovados disponíveis para uma instância
 * @access Private
 * @query {string} instanceId - ID da instância
 */
router.get('/approved-templates', metaTemplateController.getApprovedTemplates);

/**
 * @route GET /api/meta-template/is-meta-api
 * @desc Verifica se uma instância é da Meta API
 * @access Private
 * @query {string} instanceId - ID da instância
 */
router.get('/is-meta-api', metaTemplateController.isMetaAPI);

module.exports = router;
