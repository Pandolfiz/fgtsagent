const express = require('express');
const router = express.Router();
const adsController = require('../controllers/adsController');
const { requireAuth } = require('../middleware/authMiddleware');

// Aplicar middleware de autenticação em todas as rotas
router.use(requireAuth);

// GET /api/ads/ranking - Ranking de anúncios por cliques gerados
router.get('/ranking', adsController.getAdsRanking);

// GET /api/ads/:adsId/details - Detalhes de um anúncio específico
router.get('/:adsId/details', adsController.getAdDetails);

// GET /api/ads/campaigns/stats - Estatísticas de campanhas
router.get('/campaigns/stats', adsController.getCampaignStats);

// GET /api/ads/chart-data - Dados para gráficos temporais
router.get('/chart-data', adsController.getChartData);

module.exports = router;
