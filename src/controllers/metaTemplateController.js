/**
 * Controlador para gerenciar controle de mensagens template da Meta API
 */
const metaTemplateControlService = require('../services/metaTemplateControlService');
const logger = require('../utils/logger');

class MetaTemplateController {
  /**
   * Verifica se uma mensagem pode ser enviada livremente ou se precisa de template
   * GET /api/meta-template/check-send-status
   */
  async checkSendStatus(req, res) {
    try {
      const { conversationId, instanceId } = req.query;

      if (!conversationId || !instanceId) {
        return res.status(400).json({
          success: false,
          message: 'conversationId e instanceId são obrigatórios'
        });
      }

      logger.info(`[META_TEMPLATE_CTRL] Verificando status de envio - conversa: ${conversationId}, instância: ${instanceId}`);

      const status = await metaTemplateControlService.checkMessageSendStatus(conversationId, instanceId);

      return res.status(200).json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error(`[META_TEMPLATE_CTRL] Erro ao verificar status de envio: ${error.message}`);
      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Erro interno no servidor'
      });
    }
  }

  /**
   * Busca templates aprovados disponíveis para uma instância
   * GET /api/meta-template/approved-templates
   */
  async getApprovedTemplates(req, res) {
    try {
      const { instanceId } = req.query;

      if (!instanceId) {
        return res.status(400).json({
          success: false,
          message: 'instanceId é obrigatório'
        });
      }

      logger.info(`[META_TEMPLATE_CTRL] Buscando templates aprovados para instância: ${instanceId}`);

      const templates = await metaTemplateControlService.getApprovedTemplates(instanceId);

      return res.status(200).json({
        success: true,
        data: {
          templates,
          total: templates.length
        }
      });

    } catch (error) {
      logger.error(`[META_TEMPLATE_CTRL] Erro ao buscar templates aprovados: ${error.message}`);
      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Erro interno no servidor'
      });
    }
  }

  /**
   * Verifica se uma instância é da Meta API
   * GET /api/meta-template/is-meta-api
   */
  async isMetaAPI(req, res) {
    try {
      const { instanceId } = req.query;

      if (!instanceId) {
        return res.status(400).json({
          success: false,
          message: 'instanceId é obrigatório'
        });
      }

      logger.info(`[META_TEMPLATE_CTRL] Verificando se instância é Meta API: ${instanceId}`);

      const isMetaAPI = await metaTemplateControlService.isMetaAPIInstance(instanceId);

      return res.status(200).json({
        success: true,
        data: {
          isMetaAPI,
          instanceId
        }
      });

    } catch (error) {
      logger.error(`[META_TEMPLATE_CTRL] Erro ao verificar se é Meta API: ${error.message}`);
      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Erro interno no servidor'
      });
    }
  }
}

module.exports = new MetaTemplateController();
