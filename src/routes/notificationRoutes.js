const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

/**
 * Rota para obter status do serviço de notificações
 */
router.get('/status', async (req, res) => {
  try {
    const status = notificationService.getStatus();
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Erro ao obter status do serviço de notificações: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * Rota para reiniciar o serviço de notificações
 */
router.post('/restart', async (req, res) => {
  try {
    logger.info('Reiniciando serviço de notificações...');
    
    // Parar o serviço
    await notificationService.stop();
    
    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Reiniciar o serviço
    await notificationService.start();
    
    const status = notificationService.getStatus();
    
    res.json({
      success: true,
      message: 'Serviço de notificações reiniciado com sucesso',
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Erro ao reiniciar serviço de notificações: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao reiniciar serviço de notificações',
      error: error.message
    });
  }
});

/**
 * Rota para parar o serviço de notificações
 */
router.post('/stop', async (req, res) => {
  try {
    await notificationService.stop();
    
    res.json({
      success: true,
      message: 'Serviço de notificações parado com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Erro ao parar serviço de notificações: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao parar serviço de notificações',
      error: error.message
    });
  }
});

/**
 * Rota para iniciar o serviço de notificações
 */
router.post('/start', async (req, res) => {
  try {
    await notificationService.start();
    
    const status = notificationService.getStatus();
    
    res.json({
      success: true,
      message: 'Serviço de notificações iniciado com sucesso',
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Erro ao iniciar serviço de notificações: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao iniciar serviço de notificações',
      error: error.message
    });
  }
});

module.exports = router;
