const express = require('express');
const router = express.Router();
const { requireAuth, clientContext } = require('../middleware');
const clientController = require('../controllers/clientController');

// Aplicar middleware de autenticação a todas as rotas de cliente
router.use(requireAuth);

// Aplicar middleware para extrair client_id
router.use(clientContext);

// Listar clientes
router.get('/', clientController.list);

// Obter cliente por ID
router.get('/:id', clientController.getById);

// Criar novo cliente
router.post('/', clientController.create);

// Atualizar cliente existente
router.put('/:id', clientController.update);

// Excluir cliente
router.delete('/:id', clientController.delete);

module.exports = router; 