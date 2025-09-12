const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * @route POST /api/lgpd/save-consent
 * @desc Salvar consentimento LGPD do usuário
 * @access Public
 */
router.post('/save-consent', async (req, res) => {
  try {
    const { consent, date, version } = req.body;
    
    if (!consent) {
      return res.status(400).json({
        success: false,
        message: 'Dados de consentimento são obrigatórios'
      });
    }

    // ✅ SOLUÇÃO: Configurações específicas para cookies LGPD
    const lgpdCookieOptions = {
      httpOnly: true, // ✅ Segurança: LGPD deve ser httpOnly
      secure: process.env.NODE_ENV === 'production',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 ano
      sameSite: 'lax',
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.fgtsagent.com.br' : undefined
    };

    // Salvar consentimento em cookie httpOnly
    const consentData = {
      consent,
      date: date || new Date().toISOString(),
      version: version || '1.0',
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    };

    res.cookie('lgpd_consent_server', JSON.stringify(consentData), lgpdCookieOptions);
    
    logger.info(`Consentimento LGPD salvo para IP: ${req.ip}`);
    
    return res.status(200).json({
      success: true,
      message: 'Consentimento LGPD salvo com sucesso',
      data: {
        consent,
        date: consentData.date,
        version: consentData.version
      }
    });
  } catch (error) {
    logger.error('Erro ao salvar consentimento LGPD:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/lgpd/get-consent
 * @desc Recuperar consentimento LGPD do usuário
 * @access Public
 */
router.get('/get-consent', async (req, res) => {
  try {
    // Tentar carregar do cookie httpOnly
    const serverConsent = req.cookies.lgpd_consent_server;
    
    if (serverConsent) {
      try {
        const consentData = JSON.parse(serverConsent);
        logger.info(`Consentimento LGPD recuperado do servidor para IP: ${req.ip}`);
        
        return res.status(200).json({
          success: true,
          data: consentData
        });
      } catch (parseError) {
        logger.warn('Erro ao fazer parse do consentimento do servidor:', parseError);
      }
    }

    // Se não encontrou no servidor, retornar vazio
    return res.status(404).json({
      success: false,
      message: 'Nenhum consentimento LGPD encontrado'
    });
  } catch (error) {
    logger.error('Erro ao recuperar consentimento LGPD:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * @route DELETE /api/lgpd/revoke-consent
 * @desc Revogar consentimento LGPD do usuário
 * @access Public
 */
router.delete('/revoke-consent', async (req, res) => {
  try {
    // Limpar cookie do servidor
    res.clearCookie('lgpd_consent_server', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    logger.info(`Consentimento LGPD revogado para IP: ${req.ip}`);
    
    return res.status(200).json({
      success: true,
      message: 'Consentimento LGPD revogado com sucesso'
    });
  } catch (error) {
    logger.error('Erro ao revogar consentimento LGPD:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * @route GET /api/lgpd/status
 * @desc Verificar status do consentimento LGPD
 * @access Public
 */
router.get('/status', async (req, res) => {
  try {
    const serverConsent = req.cookies.lgpd_consent_server;
    const clientConsent = req.cookies.lgpd_consent;
    
    let status = {
      hasServerConsent: !!serverConsent,
      hasClientConsent: !!clientConsent,
      isConsistent: false,
      consent: null
    };
    
    if (serverConsent) {
      try {
        const consentData = JSON.parse(serverConsent);
        status.consent = consentData.consent;
        status.isConsistent = true;
      } catch (error) {
        logger.warn('Erro ao fazer parse do status do consentimento:', error);
      }
    }
    
    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Erro ao verificar status LGPD:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
