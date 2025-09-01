/**
 * Controlador para gerenciar templates de mensagens do WhatsApp Business
 */
const whatsappTemplateService = require('../services/whatsappTemplateService');
const credentialsService = require('../services/credentialsService');
const logger = require('../utils/logger');
const { supabaseAdmin } = require('../config/supabase');

class WhatsappTemplateController {
  /**
   * Lista todos os templates de uma conta WhatsApp Business
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async listTemplates(req, res) {
    try {
      const userId = req.user.id;
      const { businessAccountId, status, language, category } = req.query;
      
      logger.info(`[TEMPLATES-CONTROLLER] Listando templates para usuário: ${userId}`);
      
      // Se não foi fornecido businessAccountId, buscar das credenciais do usuário
      let targetBusinessAccountId = businessAccountId;
      
      if (!targetBusinessAccountId) {
        try {
          // Buscar TODAS as credenciais disponíveis para o usuário
          const allCredentials = await credentialsService.getAllWhatsappCredentials(userId);
          logger.info(`[TEMPLATES-CONTROLLER] Credenciais encontradas: ${allCredentials.length}`);
          
          // Filtrar apenas credenciais do tipo 'ads' (Meta API)
          const adsCredentials = allCredentials.filter(cred => cred.connection_type === 'ads');
          
          if (adsCredentials.length === 0) {
            return res.status(400).json({
              success: false,
              error: 'Usuário não possui credenciais da API oficial da Meta',
              details: 'Configure suas credenciais do WhatsApp Business na Meta API primeiro'
            });
          }
          
          if (adsCredentials.length === 1) {
            // Se só tem uma, usar ela automaticamente
            targetBusinessAccountId = adsCredentials[0].wpp_business_account_id;
            logger.info(`[TEMPLATES-CONTROLLER] Usando única credencial disponível: ${targetBusinessAccountId}`);
          } else {
            // Se tem múltiplas, retornar erro pedindo para especificar
            return res.status(400).json({
              success: false,
              error: 'Múltiplas contas WhatsApp Business encontradas',
              details: 'Especifique qual conta usar através do parâmetro businessAccountId',
              availableAccounts: adsCredentials.map(cred => ({
                businessAccountId: cred.wpp_business_account_id,
                phone: cred.phone,
                agentName: cred.agent_name,
                createdAt: cred.created_at
              }))
            });
          }
        } catch (error) {
          logger.error(`[TEMPLATES-CONTROLLER] Erro ao buscar credenciais: ${error.message}`);
          return res.status(404).json({
            success: false,
            error: 'Credenciais do WhatsApp não encontradas'
          });
        }
      }
      
      // Aplicar filtros
      const filters = {};
      if (status) filters.status = status;
      if (language) filters.language = language;
      if (category) filters.category = category;
      
      // Buscar templates salvos no banco
      const result = await whatsappTemplateService.getSavedTemplates(targetBusinessAccountId, filters);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }
      
      logger.info(`[TEMPLATES-CONTROLLER] ✅ Templates encontrados: ${result.total}`);
      
      return res.status(200).json({
        success: true,
        data: result.data,
        total: result.total,
        filters: filters
      });
      
    } catch (error) {
      logger.error(`[TEMPLATES-CONTROLLER] ❌ Erro ao listar templates: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao listar templates'
      });
    }
  }

  /**
   * Sincroniza templates da API da Meta com o banco de dados
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async syncTemplates(req, res) {
    try {
      const userId = req.user.id;
      const { businessAccountId, accessToken } = req.body;
      
      logger.info(`[TEMPLATES-CONTROLLER] 🔄 Sincronizando templates para usuário: ${userId}`);
      
      // Se não foi fornecido businessAccountId, buscar das credenciais do usuário
      let targetBusinessAccountId = businessAccountId;
      let targetAccessToken = accessToken;
      
      logger.info(`[TEMPLATES-CONTROLLER] Parâmetros recebidos: businessAccountId=${businessAccountId}, accessToken=${accessToken ? 'SIM' : 'NÃO'}`);
      
      if (!targetBusinessAccountId || !targetAccessToken) {
        try {
          logger.info(`[TEMPLATES-CONTROLLER] Buscando credenciais do usuário: ${userId}`);
          const credentials = await credentialsService.getWhatsappCredentials(userId);
          logger.info(`[TEMPLATES-CONTROLLER] Credenciais encontradas: ${JSON.stringify({
            connectionType: credentials.connectionType,
            hasBusinessAccountId: !!credentials.businessAccountId,
            hasAccessToken: !!credentials.accessToken
          })}`);
          
          if (credentials.connectionType === 'ads') {
            targetBusinessAccountId = credentials.businessAccountId;
            targetAccessToken = credentials.accessToken;
            logger.info(`[TEMPLATES-CONTROLLER] Usando credenciais das credenciais: businessAccountId=${targetBusinessAccountId}`);
          } else {
            logger.error(`[TEMPLATES-CONTROLLER] Usuário não possui credenciais da API oficial da Meta`);
            return res.status(400).json({
              success: false,
              error: 'Usuário não possui credenciais da API oficial da Meta'
            });
          }
        } catch (error) {
          logger.error(`[TEMPLATES-CONTROLLER] Erro ao buscar credenciais: ${error.message}`);
          return res.status(404).json({
            success: false,
            error: 'Credenciais do WhatsApp não encontradas'
          });
        }
      }
      
      logger.info(`[TEMPLATES-CONTROLLER] Parâmetros finais: businessAccountId=${targetBusinessAccountId}, accessToken=${targetAccessToken ? 'SIM' : 'NÃO'}`);
      
      // Sincronizar templates
      const result = await whatsappTemplateService.syncTemplates(targetBusinessAccountId, targetAccessToken);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error,
          details: result.details
        });
      }
      
      logger.info(`[TEMPLATES-CONTROLLER] ✅ Sincronização concluída: ${result.savedTemplates} templates`);
      
      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          apiTemplates: result.apiTemplates,
          savedTemplates: result.savedTemplates
        }
      });
      
    } catch (error) {
      logger.error(`[TEMPLATES-CONTROLLER] ❌ Erro ao sincronizar templates: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao sincronizar templates'
      });
    }
  }

  /**
   * Busca estatísticas dos templates
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getTemplateStats(req, res) {
    try {
      const userId = req.user.id;
      const { businessAccountId } = req.query;
      
      logger.info(`[TEMPLATES-CONTROLLER] 📊 Buscando estatísticas para usuário: ${userId}`);
      
      // Se não foi fornecido businessAccountId, buscar das credenciais do usuário
      let targetBusinessAccountId = businessAccountId;
      
      if (!targetBusinessAccountId) {
        try {
          const credentials = await credentialsService.getWhatsappCredentials(userId);
          if (credentials.connectionType === 'ads') {
            targetBusinessAccountId = credentials.businessAccountId;
          } else {
            return res.status(400).json({
              success: false,
              error: 'Usuário não possui credenciais da API oficial da Meta'
            });
          }
        } catch (error) {
          logger.error(`[TEMPLATES-CONTROLLER] Erro ao buscar credenciais: ${error.message}`);
          return res.status(404).json({
            success: false,
            error: 'Credenciais do WhatsApp não encontradas'
          });
        }
      }
      
      // Buscar estatísticas
      const result = await whatsappTemplateService.getTemplateStats(targetBusinessAccountId);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }
      
      logger.info(`[TEMPLATES-CONTROLLER] ✅ Estatísticas calculadas: ${result.data.total} templates`);
      
      return res.status(200).json({
        success: true,
        data: result.data
      });
      
    } catch (error) {
      logger.error(`[TEMPLATES-CONTROLLER] ❌ Erro ao buscar estatísticas: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao buscar estatísticas'
      });
    }
  }

  /**
   * Criar um novo template de mensagem
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async createTemplate(req, res) {
    try {
      console.log('🔄 Criando novo template de mensagem...');
      
      const { businessAccountId, accessToken, templateData } = req.body;

      // Validar dados obrigatórios
      if (!businessAccountId || !templateData) {
        return res.status(400).json({
          success: false,
          error: 'businessAccountId e templateData são obrigatórios'
        });
      }

      // Se não forneceu accessToken, buscar das credenciais do usuário
      let finalAccessToken = accessToken;
      if (!finalAccessToken) {
        try {
          // Buscar credenciais do usuário logado
          const { data: credentials, error: credentialsError } = await supabaseAdmin
            .from('whatsapp_credentials')
            .select('wpp_access_token')
            .eq('wpp_business_account_id', businessAccountId)
            .eq('client_id', req.user.id)
            .single();

          if (credentialsError || !credentials) {
            return res.status(404).json({
              success: false,
              error: 'Credenciais WhatsApp não encontradas para esta conta'
            });
          }

          finalAccessToken = credentials.wpp_access_token;
        } catch (error) {
          console.error('❌ Erro ao buscar credenciais:', error);
          return res.status(500).json({
            success: false,
            error: 'Erro ao buscar credenciais WhatsApp'
          });
        }
      }

      // Validar componentes do template
      const validation = whatsappTemplateService.validateTemplateComponents(templateData.components);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Template inválido',
          validationErrors: validation.errors,
          validationWarnings: validation.warnings
        });
      }

      // Criar template na Meta API
      const result = await whatsappTemplateService.createMessageTemplate(
        businessAccountId,
        finalAccessToken,
        templateData
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
          details: result.details,
          code: result.code
        });
      }

      console.log('✅ Template criado com sucesso:', result.data.templateId);
      
      res.json({
        success: true,
        message: 'Template criado com sucesso',
        data: result.data
      });

    } catch (error) {
      console.error('❌ Erro ao criar template:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno ao criar template',
        details: error.message
      });
    }
  }

  /**
   * Lista todas as contas WhatsApp Business disponíveis para o usuário
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async listAvailableAccounts(req, res) {
    try {
      const userId = req.user.id;
      
      logger.info(`[TEMPLATES-CONTROLLER] 📋 Listando contas disponíveis para usuário: ${userId}`);
      
      try {
        // Buscar TODAS as credenciais disponíveis para o usuário
        const allCredentials = await credentialsService.getAllWhatsappCredentials(userId);
        logger.info(`[TEMPLATES-CONTROLLER] Total de credenciais encontradas: ${allCredentials.length}`);
        
        // Filtrar apenas credenciais do tipo 'ads' (Meta API)
        const adsCredentials = allCredentials.filter(cred => cred.connection_type === 'ads');
        
        if (adsCredentials.length === 0) {
          return res.status(200).json({
            success: true,
            data: [],
            message: 'Nenhuma conta WhatsApp Business configurada',
            details: 'Configure suas credenciais do WhatsApp Business na Meta API primeiro'
          });
        }
        
        // Formatar dados das contas
        const accounts = adsCredentials.map(cred => ({
          businessAccountId: cred.wpp_business_account_id,
          phone: cred.phone,
          agentName: cred.agent_name,
          status: cred.status,
          connectionType: cred.connection_type,
          createdAt: cred.created_at,
          updatedAt: cred.updated_at,
          // Verificar se tem dados da Meta API
          hasMetaData: !!(cred.wpp_number_id && cred.wpp_access_token),
          metaStatus: cred.metadata?.code_verification_status || 'NÃO_VERIFICADO'
        }));
        
        logger.info(`[TEMPLATES-CONTROLLER] ✅ Contas WhatsApp Business encontradas: ${accounts.length}`);
        
        return res.status(200).json({
          success: true,
          data: accounts,
          total: accounts.length,
          message: `${accounts.length} conta(s) WhatsApp Business encontrada(s)`
        });
        
      } catch (error) {
        logger.error(`[TEMPLATES-CONTROLLER] Erro ao buscar credenciais: ${error.message}`);
        return res.status(500).json({
          success: false,
          error: 'Erro ao buscar contas disponíveis',
          details: error.message
        });
      }
      
    } catch (error) {
      logger.error(`[TEMPLATES-CONTROLLER] ❌ Erro ao listar contas: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Erro interno ao listar contas'
      });
    }
  }
}

module.exports = new WhatsappTemplateController();
