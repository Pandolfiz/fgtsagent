// src/routes/leadRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth, clientContext } = require('../middleware');
const leadController = require('../controllers/leadController');
const adminController = require('../controllers/adminController');

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

// Obter histórico de propostas de um lead
router.get('/:id/proposals', leadController.getProposals);

// Buscar CPF de um lead (rota movida das rotas administrativas)
router.get('/:lead_id/cpf', adminController.getLeadCpfByLeadId);

// Criar novo lead
router.post('/', leadController.create);

// Atualizar lead existente
router.put('/:id', leadController.update);

// Excluir lead
router.delete('/:id', leadController.delete);

module.exports = router; 