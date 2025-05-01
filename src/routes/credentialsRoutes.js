/**
 * Rotas para gerenciamento de credenciais genéricas
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const credentialsController = require('../controllers/credentialsController');
const { supabase } = require('../config/supabase');

// Aplicar o middleware de autenticação a todas as rotas
router.use(requireAuth);

// Rota para listar credenciais de uma organização
router.get('/organizations/:organizationId/credentials', credentialsController.listCredentials);

// Rota para obter detalhes de uma credencial
router.get('/organizations/:organizationId/credentials/:credentialId', credentialsController.getCredential);

// Rota para criar uma nova credencial
router.post('/organizations/:organizationId/credentials', credentialsController.createCredential);

// Rota para atualizar uma credencial
router.put('/organizations/:organizationId/credentials/:credentialId', credentialsController.updateCredential);

// Rota para excluir uma credencial
router.delete('/organizations/:organizationId/credentials/:credentialId', credentialsController.deleteCredential);

// Rota para verificar o status de uma credencial OAuth2
router.get('/organizations/:organizationId/credentials/:credentialId/status', credentialsController.checkOAuth2Status);

module.exports = router; 