// src/routes/leadRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth, clientContext } = require('../middleware');
const leadController = require('../controllers/leadController');

// Autenticação e contexto de cliente
router.use(requireAuth);
router.use(clientContext);

// Listar leads do cliente
router.get('/', leadController.list);

// Listar leads completos com dados de balance e proposals
router.get('/complete', leadController.listComplete);

// Repetir consulta para um lead
router.post('/:id/repeat-query', leadController.repeatQuery);

// Obter lead por ID
router.get('/:id', leadController.getById);

// Criar novo lead
router.post('/', leadController.create);

// Atualizar lead existente
router.put('/:id', leadController.update);

// Excluir lead
router.delete('/:id', leadController.delete);

module.exports = router; 