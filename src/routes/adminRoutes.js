const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

// Rotas para administração do sistema
router.use(requireAuth);
router.use(requireAdmin);

// Rotas para gerenciamento do sistema
router.get('/health', adminController.getSystemHealth);
router.post('/fix-policies', adminController.fixDatabasePolicies);

// Rota de debug/admin para buscar CPF do lead
router.get('/leads/:lead_id/cpf', adminController.getLeadCpfByLeadId);

module.exports = router; 