const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// Rota pública para criar feedback (usuários autenticados e não autenticados)
router.post('/', feedbackController.createFeedback);

// Rotas administrativas (requerem autenticação e permissão de admin)
router.get('/admin', requireAuth, requireAdmin, feedbackController.listFeedbacks);
router.get('/admin/stats', requireAuth, requireAdmin, feedbackController.getFeedbackStats);
router.put('/admin/:id', requireAuth, requireAdmin, feedbackController.updateFeedbackStatus);

module.exports = router;
