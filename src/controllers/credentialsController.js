/**
 * Controlador para gerenciar credenciais genéricas
 */
const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');
const credentialsService = require('../services/credentialsService');

class CredentialsController {
  /**
   * Lista todas as credenciais da organização
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async listCredentials(req, res) {
    try {
      const { organizationId } = req.params;
      const { type } = req.query;
      
      // Verificar permissões
      const userOrgs = req.user?.app_metadata?.organizations || [];
      if (!userOrgs.includes(organizationId)) {
        logger.warn(`Usuário ${req.user?.id} tentou acessar credenciais da organização ${organizationId} sem permissão`);
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para acessar esta organização'
        });
      }
      
      // Buscar credenciais
      const credentials = await credentialsService.listOrganizationCredentials(organizationId, type);
      
      // Retornar apenas dados seguros (sem tokens)
      const safeCredentials = credentials.map(cred => {
        const { data, ...safeCred } = cred;
        return {
          ...safeCred,
          hasAccessToken: !!data?.access_token,
          hasRefreshToken: !!data?.refresh_token,
          expiresAt: data?.expiresAt,
          scope: data?.scope
        };
      });
      
      return res.status(200).json({
        success: true,
        data: safeCredentials
      });
    } catch (error) {
      logger.error(`Erro ao listar credenciais: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Obtém detalhes de uma credencial específica
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async getCredential(req, res) {
    try {
      const { organizationId, credentialId } = req.params;
      
      // Verificar permissões
      const userOrgs = req.user?.app_metadata?.organizations || [];
      if (!userOrgs.includes(organizationId)) {
        logger.warn(`Usuário ${req.user?.id} tentou acessar credencial ${credentialId} da organização ${organizationId} sem permissão`);
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para acessar esta organização'
        });
      }
      
      // Buscar credencial
      const credential = await credentialsService.getCredentialById(credentialId, organizationId);
      
      if (!credential) {
        return res.status(404).json({
          success: false,
          message: 'Credencial não encontrada'
        });
      }
      
      // Retornar apenas dados seguros (sem tokens)
      const { data, ...safeCredential } = credential;
      const result = {
        ...safeCredential,
        hasAccessToken: !!data?.access_token,
        hasRefreshToken: !!data?.refresh_token,
        expiresAt: data?.expiresAt,
        scope: data?.scope
      };
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`Erro ao buscar credencial: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Cria uma nova credencial
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async createCredential(req, res) {
    try {
      const { organizationId } = req.params;
      const { name, type, data } = req.body;
      
      // Verificar permissões
      const userOrgs = req.user?.app_metadata?.organizations || [];
      if (!userOrgs.includes(organizationId)) {
        logger.warn(`Usuário ${req.user?.id} tentou criar credencial na organização ${organizationId} sem permissão`);
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para acessar esta organização'
        });
      }
      
      // Validar dados
      if (!name || !type) {
        return res.status(400).json({
          success: false,
          message: 'Nome e tipo são obrigatórios'
        });
      }
      
      // Preparar dados da credencial
      const credentialData = {
        name,
        type,
        organization_id: organizationId,
        data: data || {},
        created_by: req.user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Salvar credencial
      const credential = await credentialsService.saveCredentialAsServiceRole(credentialData);
      
      // Retornar apenas dados seguros
      const { data: credData, ...safeCredential } = credential;
      
      return res.status(201).json({
        success: true,
        data: safeCredential,
        message: 'Credencial criada com sucesso'
      });
    } catch (error) {
      logger.error(`Erro ao criar credencial: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Atualiza uma credencial existente
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async updateCredential(req, res) {
    try {
      const { organizationId, credentialId } = req.params;
      const updates = req.body;
      
      // Verificar permissões
      const userOrgs = req.user?.app_metadata?.organizations || [];
      if (!userOrgs.includes(organizationId)) {
        logger.warn(`Usuário ${req.user?.id} tentou atualizar credencial ${credentialId} da organização ${organizationId} sem permissão`);
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para acessar esta organização'
        });
      }
      
      // Verificar se a credencial existe
      const existingCredential = await credentialsService.getCredentialById(credentialId, organizationId);
      
      if (!existingCredential) {
        return res.status(404).json({
          success: false,
          message: 'Credencial não encontrada'
        });
      }
      
      // Atualizar a credencial
      const updatedCredential = await credentialsService.updateCredential(credentialId, organizationId, updates);
      
      if (!updatedCredential) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao atualizar credencial'
        });
      }
      
      // Retornar apenas dados seguros
      const { data: credData, ...safeCredential } = updatedCredential;
      
      return res.status(200).json({
        success: true,
        data: safeCredential,
        message: 'Credencial atualizada com sucesso'
      });
    } catch (error) {
      logger.error(`Erro ao atualizar credencial: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Exclui uma credencial
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async deleteCredential(req, res) {
    try {
      const { organizationId, credentialId } = req.params;
      
      // Verificar permissões
      const userOrgs = req.user?.app_metadata?.organizations || [];
      if (!userOrgs.includes(organizationId)) {
        logger.warn(`Usuário ${req.user?.id} tentou excluir credencial ${credentialId} da organização ${organizationId} sem permissão`);
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para acessar esta organização'
        });
      }
      
      // Verificar se a credencial existe
      const existingCredential = await credentialsService.getCredentialById(credentialId, organizationId);
      
      if (!existingCredential) {
        return res.status(404).json({
          success: false,
          message: 'Credencial não encontrada'
        });
      }
      
      // Excluir a credencial
      const success = await credentialsService.deleteCredential(credentialId, organizationId);
      
      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao excluir credencial'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Credencial excluída com sucesso'
      });
    } catch (error) {
      logger.error(`Erro ao excluir credencial: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Verifica o status de uma credencial OAuth2
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async checkOAuth2Status(req, res) {
    try {
      const { organizationId, credentialId } = req.params;
      
      // Verificar permissões
      const userOrgs = req.user?.app_metadata?.organizations || [];
      if (!userOrgs.includes(organizationId)) {
        logger.warn(`Usuário ${req.user?.id} tentou verificar status da credencial ${credentialId} sem permissão`);
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para acessar esta organização'
        });
      }
      
      // Buscar credencial
      const credential = await credentialsService.getCredentialById(credentialId, organizationId);
      
      if (!credential) {
        return res.status(404).json({
          success: false,
          message: 'Credencial não encontrada'
        });
      }
      
      // Verificar se é uma credencial OAuth2
      if (!credential.data?.access_token) {
        return res.status(400).json({
          success: false,
          message: 'Esta não é uma credencial OAuth2 válida'
        });
      }
      
      // Verificar se o token expirou
      const expiresAt = credential.data?.expiresAt || 0;
      const isExpired = Date.now() > expiresAt;
      
      // Verificar se tem refresh token
      const hasRefreshToken = !!credential.data?.refresh_token;
      
      return res.status(200).json({
        success: true,
        data: {
          isValid: !isExpired,
          expiresAt,
          hasRefreshToken,
          type: credential.type,
          scope: credential.data?.scope
        }
      });
    } catch (error) {
      logger.error(`Erro ao verificar status da credencial: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new CredentialsController(); 