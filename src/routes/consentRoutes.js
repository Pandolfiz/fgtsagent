const express = require('express');
const router = express.Router();
const consentService = require('../services/consentService');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * POST /api/consent/log
 * Registrar consentimento de um usuário
 */
router.post('/log', requireAuth, async (req, res) => {
  try {
    const { consentType, granted, consentVersion, consentText } = req.body;
    const userId = req.user.id;
    
    if (!consentType || typeof granted !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'consentType e granted são obrigatórios'
      });
    }

    const options = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      consentVersion: consentVersion || '1.0',
      consentText
    };

    const logId = await consentService.logConsent(userId, consentType, granted, options);

    res.status(200).json({
      success: true,
      message: 'Consentimento registrado com sucesso',
      data: { logId }
    });
  } catch (error) {
    logger.error('Erro ao registrar consentimento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao registrar consentimento'
    });
  }
});

/**
 * POST /api/consent/cookies
 * Registrar consentimento de cookies
 */
router.post('/cookies', requireAuth, async (req, res) => {
  try {
    const { cookieConsent } = req.body;
    const userId = req.user.id;
    
    if (!cookieConsent || typeof cookieConsent !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'cookieConsent é obrigatório'
      });
    }

    const options = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const results = await consentService.logCookieConsent(userId, cookieConsent, options);

    res.status(200).json({
      success: true,
      message: 'Consentimento de cookies registrado com sucesso',
      data: { results }
    });
  } catch (error) {
    logger.error('Erro ao registrar consentimento de cookies:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao registrar consentimento de cookies'
    });
  }
});

/**
 * POST /api/consent/signup
 * Registrar múltiplos consentimentos do cadastro
 */
router.post('/signup', async (req, res) => {
  try {
    const { userId, consents } = req.body;
    
    if (!userId || !consents || typeof consents !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'userId e consents são obrigatórios'
      });
    }

    const options = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      consentVersion: '1.0'
    };

    const results = await consentService.logMultipleConsents(userId, consents, options);

    res.status(200).json({
      success: true,
      message: 'Consentimentos registrados com sucesso',
      data: { results }
    });
  } catch (error) {
    logger.error('Erro ao registrar consentimentos do cadastro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao registrar consentimentos'
    });
  }
});

/**
 * GET /api/consent/history
 * Obter histórico de consentimentos do usuário
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await consentService.getUserConsentHistory(userId);

    res.status(200).json({
      success: true,
      data: { history }
    });
  } catch (error) {
    logger.error('Erro ao obter histórico de consentimentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao obter histórico'
    });
  }
});

/**
 * GET /api/consent/current/:type
 * Verificar consentimento atual de um tipo específico
 */
router.get('/current/:type', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const consentType = req.params.type;
    
    const hasConsent = await consentService.getCurrentConsent(userId, consentType);

    res.status(200).json({
      success: true,
      data: { 
        consentType,
        granted: hasConsent 
      }
    });
  } catch (error) {
    logger.error('Erro ao verificar consentimento atual:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao verificar consentimento'
    });
  }
});

/**
 * GET /api/consent/required
 * Verificar se usuário tem todos os consentimentos obrigatórios
 */
router.get('/required', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const hasRequired = await consentService.hasRequiredConsents(userId);

    res.status(200).json({
      success: true,
      data: { hasRequired }
    });
  } catch (error) {
    logger.error('Erro ao verificar consentimentos obrigatórios:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao verificar consentimentos obrigatórios'
    });
  }
});

/**
 * POST /api/consent/revoke/:type
 * Revogar consentimento
 */
router.post('/revoke/:type', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const consentType = req.params.type;
    
    const options = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const logId = await consentService.revokeConsent(userId, consentType, options);

    res.status(200).json({
      success: true,
      message: 'Consentimento revogado com sucesso',
      data: { logId }
    });
  } catch (error) {
    logger.error('Erro ao revogar consentimento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao revogar consentimento'
    });
  }
});

/**
 * GET /api/consent/statistics
 * Obter estatísticas de consentimentos (apenas administradores)
 */
router.get('/statistics', requireAuth, async (req, res) => {
  try {
    // Verificar se é administrador
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem acessar estatísticas.'
      });
    }

    const statistics = await consentService.getConsentStatistics();

    res.status(200).json({
      success: true,
      data: { statistics }
    });
  } catch (error) {
    logger.error('Erro ao obter estatísticas de consentimentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao obter estatísticas'
    });
  }
});

module.exports = router; 
const router = express.Router();
const consentService = require('../services/consentService');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * POST /api/consent/log
 * Registrar consentimento de um usuário
 */
router.post('/log', requireAuth, async (req, res) => {
  try {
    const { consentType, granted, consentVersion, consentText } = req.body;
    const userId = req.user.id;
    
    if (!consentType || typeof granted !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'consentType e granted são obrigatórios'
      });
    }

    const options = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      consentVersion: consentVersion || '1.0',
      consentText
    };

    const logId = await consentService.logConsent(userId, consentType, granted, options);

    res.status(200).json({
      success: true,
      message: 'Consentimento registrado com sucesso',
      data: { logId }
    });
  } catch (error) {
    logger.error('Erro ao registrar consentimento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao registrar consentimento'
    });
  }
});

/**
 * POST /api/consent/cookies
 * Registrar consentimento de cookies
 */
router.post('/cookies', requireAuth, async (req, res) => {
  try {
    const { cookieConsent } = req.body;
    const userId = req.user.id;
    
    if (!cookieConsent || typeof cookieConsent !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'cookieConsent é obrigatório'
      });
    }

    const options = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const results = await consentService.logCookieConsent(userId, cookieConsent, options);

    res.status(200).json({
      success: true,
      message: 'Consentimento de cookies registrado com sucesso',
      data: { results }
    });
  } catch (error) {
    logger.error('Erro ao registrar consentimento de cookies:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao registrar consentimento de cookies'
    });
  }
});

/**
 * POST /api/consent/signup
 * Registrar múltiplos consentimentos do cadastro
 */
router.post('/signup', async (req, res) => {
  try {
    const { userId, consents } = req.body;
    
    if (!userId || !consents || typeof consents !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'userId e consents são obrigatórios'
      });
    }

    const options = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      consentVersion: '1.0'
    };

    const results = await consentService.logMultipleConsents(userId, consents, options);

    res.status(200).json({
      success: true,
      message: 'Consentimentos registrados com sucesso',
      data: { results }
    });
  } catch (error) {
    logger.error('Erro ao registrar consentimentos do cadastro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao registrar consentimentos'
    });
  }
});

/**
 * GET /api/consent/history
 * Obter histórico de consentimentos do usuário
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await consentService.getUserConsentHistory(userId);

    res.status(200).json({
      success: true,
      data: { history }
    });
  } catch (error) {
    logger.error('Erro ao obter histórico de consentimentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao obter histórico'
    });
  }
});

/**
 * GET /api/consent/current/:type
 * Verificar consentimento atual de um tipo específico
 */
router.get('/current/:type', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const consentType = req.params.type;
    
    const hasConsent = await consentService.getCurrentConsent(userId, consentType);

    res.status(200).json({
      success: true,
      data: { 
        consentType,
        granted: hasConsent 
      }
    });
  } catch (error) {
    logger.error('Erro ao verificar consentimento atual:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao verificar consentimento'
    });
  }
});

/**
 * GET /api/consent/required
 * Verificar se usuário tem todos os consentimentos obrigatórios
 */
router.get('/required', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const hasRequired = await consentService.hasRequiredConsents(userId);

    res.status(200).json({
      success: true,
      data: { hasRequired }
    });
  } catch (error) {
    logger.error('Erro ao verificar consentimentos obrigatórios:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao verificar consentimentos obrigatórios'
    });
  }
});

/**
 * POST /api/consent/revoke/:type
 * Revogar consentimento
 */
router.post('/revoke/:type', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const consentType = req.params.type;
    
    const options = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const logId = await consentService.revokeConsent(userId, consentType, options);

    res.status(200).json({
      success: true,
      message: 'Consentimento revogado com sucesso',
      data: { logId }
    });
  } catch (error) {
    logger.error('Erro ao revogar consentimento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao revogar consentimento'
    });
  }
});

/**
 * GET /api/consent/statistics
 * Obter estatísticas de consentimentos (apenas administradores)
 */
router.get('/statistics', requireAuth, async (req, res) => {
  try {
    // Verificar se é administrador
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem acessar estatísticas.'
      });
    }

    const statistics = await consentService.getConsentStatistics();

    res.status(200).json({
      success: true,
      data: { statistics }
    });
  } catch (error) {
    logger.error('Erro ao obter estatísticas de consentimentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao obter estatísticas'
    });
  }
});

module.exports = router; 