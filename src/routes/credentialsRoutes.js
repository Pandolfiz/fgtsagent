/**
 * Rotas para gerenciamento de credenciais genéricas
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const credentialsController = require('../controllers/credentialsController');
const credentialsService = require('../services/credentialsService');
const logger = require('../utils/logger');
const { supabase } = require('../config/supabase');

// Aplicar o middleware de autenticação a todas as rotas
router.use(requireAuth);

// Rota para verificar o status das credenciais do WhatsApp
router.get('/whatsapp-status', async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'ID do usuário não disponível'
      });
    }
    
    logger.info(`Verificando status das credenciais do WhatsApp para o usuário: ${userId}`);
    
    // Tentar obter credenciais
    try {
      const credentials = await credentialsService.getWhatsappCredentials(userId);
      
      // Verificar detalhes das credenciais sem expor o token
      return res.status(200).json({
        success: true,
        message: 'Credenciais do WhatsApp encontradas',
        data: {
          hasAccessToken: !!credentials.accessToken,
          phoneNumberId: credentials.phoneNumberId,
          businessAccountId: credentials.businessAccountId,
          apiVersion: credentials.apiVersion
        }
      });
    } catch (error) {
      logger.error(`Erro ao obter credenciais: ${error.message}`);
      
      // Buscar informações de diagnóstico sem expor dados sensíveis
      const { data: credCount } = await supabase
        .from('whatsapp_credentials')
        .select('id', { count: 'exact' });
      
      const totalCredentials = credCount?.length || 0;
      
      return res.status(404).json({
        success: false,
        error: error.message,
        diagnosticInfo: {
          totalCredentialsInDatabase: totalCredentials,
          userIdUsedForLookup: userId
        }
      });
    }
  } catch (error) {
    logger.error(`Erro ao verificar status das credenciais: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Erro ao verificar status das credenciais'
    });
  }
});

// Rota para listar credenciais de uma organização
router.get('/organizations/:organizationId/credentials', credentialsController.listCredentials);

// Rota para obter detalhes de uma credencial
router.get('/organizations/:organizationId/credentials/:credentialId', credentialsController.getCredential);

// Rota para criar uma nova credencial
router.post('/organizations/:organizationId/credentials', credentialsController.createCredential);

// Rota para atualizar uma credencial
router.put('/organizations/:organizationId/credentials/:credentialId', credentialsController.updateCredential);

// Rota para excluir uma credencial
router.delete('/organizations/:organizationId/credentials/:credentialId', credentialsController.deleteCredential);

// Rota para verificar o status de uma credencial OAuth2
router.get('/organizations/:organizationId/credentials/:credentialId/status', credentialsController.checkOAuth2Status);

module.exports = router; 