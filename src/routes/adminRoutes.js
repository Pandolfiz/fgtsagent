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

module.exports = router; 