const express = require('express');
const router = express.Router();
const { requireAuth, clientContext } = require('../middleware');
const knowledgeBaseController = require('../controllers/knowledgeBaseController');

// Autenticação e contexto de cliente
router.use(requireAuth);
router.use(clientContext);

// Listar entradas da base de conhecimento
router.get('/', knowledgeBaseController.list);

// Obter entrada por ID
router.get('/:id', knowledgeBaseController.getById);

// Criar nova entrada
router.post('/', knowledgeBaseController.create);

// Atualizar entrada existente
router.put('/:id', knowledgeBaseController.update);

// Excluir entrada
router.delete('/:id', knowledgeBaseController.delete);

module.exports = router; 