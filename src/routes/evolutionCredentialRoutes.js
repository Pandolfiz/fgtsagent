const express = require('express');
const router = express.Router();
const { requireAuth, clientContext } = require('../middleware');
const evolutionCredentialController = require('../controllers/evolutionCredentialController');

// Autenticação e contexto de cliente
router.use(requireAuth);
router.use(clientContext);

// Listar credenciais EvolutionAPI
router.get('/', evolutionCredentialController.list);

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

module.exports = router; 