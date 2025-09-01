/**
 * Serviço para gerenciar templates de mensagens do WhatsApp Business
 * via API oficial da Meta
 */
const axios = require('axios');
const { supabase, supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const whatsappConfig = require('../config/whatsapp');

class WhatsappTemplateService {
  /**
   * Busca todos os templates de mensagens de uma conta WhatsApp Business
   * @param {string} businessAccountId - ID da conta de negócios
   * @param {string} accessToken - Token de acesso da Meta
   * @returns {Promise<Object>} - Resultado da busca
   */
  async fetchMessageTemplates(businessAccountId, accessToken) {
    try {
      logger.info(`[TEMPLATES] Buscando templates para conta: ${businessAccountId}`);
      
      if (!businessAccountId || !accessToken) {
        throw new Error('businessAccountId e accessToken são obrigatórios');
      }

      // Endpoint da API da Meta para buscar templates
      const url = `https://graph.facebook.com/v${process.env.WHATSAPP_API_VERSION || '18.0'}/${businessAccountId}/message_templates`;
      const params = {
        fields: 'id,name,language,category,status,components,quality_rating,created_time,updated_time'
      };

      logger.info(`[TEMPLATES] Fazendo requisição para: ${url}`);
      
      const response = await axios.get(url, {
        params,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      logger.info(`[TEMPLATES] ✅ Resposta recebida da Meta API`);
      
      // Verificar se a resposta tem a estrutura esperada
      if (!response.data.data) {
        logger.warn(`[TEMPLATES] ⚠️ Resposta não tem estrutura 'data' esperada`);
        
        // Tentar encontrar templates em outras estruturas possíveis
        const templates = response.data.templates || response.data.message_templates || response.data || [];
        return {
          success: true,
          data: Array.isArray(templates) ? templates : [],
          total: Array.isArray(templates) ? templates.length : 0
        };
      }
      
      return {
        success: true,
        data: response.data.data || [],
        total: response.data.data?.length || 0
      };

    } catch (error) {
      logger.error(`[TEMPLATES] ❌ Erro ao buscar templates: ${error.message}`);
      
      if (error.response) {
        logger.error(`[TEMPLATES] Status: ${error.response.status}`);
        logger.error(`[TEMPLATES] Resposta: ${JSON.stringify(error.response.data)}`);
        
        // Tratar erros específicos da API da Meta
        if (error.response.status === 400) {
          const errorMessage = error.response.data?.error?.message || 'Erro de validação';
          return {
            success: false,
            error: 'Parâmetros inválidos para busca de templates',
            details: errorMessage
          };
        } else if (error.response.status === 401) {
          return {
            success: false,
            error: 'Token de acesso inválido ou expirado',
            details: 'Verifique se o token da Meta ainda é válido e tem as permissões necessárias'
          };
        } else if (error.response.status === 403) {
          return {
            success: false,
            error: 'Sem permissão para acessar templates',
            details: 'Verifique se a conta tem permissões para WhatsApp Business API e se o token tem os escopos necessários'
          };
        } else if (error.response.status === 404) {
          return {
            success: false,
            error: 'Conta WhatsApp Business não encontrada',
            details: 'Verifique se o businessAccountId está correto e se a conta existe'
          };
        } else if (error.response.status === 500) {
          return {
            success: false,
            error: 'Erro interno da API da Meta',
            details: 'Tente novamente mais tarde ou entre em contato com o suporte da Meta'
          };
        }
      }
      
      return {
        success: false,
        error: `Erro ao buscar templates: ${error.message}`,
        details: error.code || 'Erro desconhecido'
      };
    }
  }

  /**
   * Salva templates no banco de dados
   * @param {string} businessAccountId - ID da conta de negócios
   * @param {Array} templates - Lista de templates da API
   * @returns {Promise<Object>} - Resultado da operação
   */
  async saveTemplates(businessAccountId, templates) {
    try {
      logger.info(`[TEMPLATES] Salvando ${templates.length} templates para conta: ${businessAccountId}`);
      
      if (!templates || templates.length === 0) {
        return {
          success: true,
          message: 'Nenhum template para salvar',
          saved: 0
        };
      }

      // Preparar dados para inserção
      const templatesToInsert = templates.map(template => ({
        wpp_business_account_id: businessAccountId,
        template_id: template.id || template.template_id,
        template_name: template.name || template.template_name,
        template_language: template.language || template.template_language,
        template_category: template.category || template.template_category,
        template_status: template.status || template.template_status,
        template_components: template.components || template.template_components,
        template_quality_rating: template.quality_rating || template.template_quality_rating,
        template_created_at: template.created_time ? new Date(template.created_time) : (template.template_created_at ? new Date(template.template_created_at) : new Date()),
        template_updated_at: template.updated_time ? new Date(template.updated_time) : (template.template_updated_at ? new Date(template.template_updated_at) : new Date())
      }));

      // Usar upsert para atualizar templates existentes
      const { data, error } = await supabaseAdmin
        .from('whatsapp_message_templates')
        .upsert(templatesToInsert, {
          onConflict: 'wpp_business_account_id,template_id',
          ignoreDuplicates: false
        });

      if (error) {
        logger.error(`[TEMPLATES] ❌ Erro ao salvar templates: ${error.message}`);
        throw new Error(`Falha ao salvar templates: ${error.message}`);
      }

      logger.info(`[TEMPLATES] ✅ Templates salvos com sucesso: ${data?.length || 0}`);
      
      return {
        success: true,
        message: `${data?.length || 0} templates salvos/atualizados`,
        saved: data?.length || 0
      };

    } catch (error) {
      logger.error(`[TEMPLATES] ❌ Erro ao salvar templates: ${error.message}`);
      return {
        success: false,
        error: `Erro ao salvar templates: ${error.message}`
      };
    }
  }

  /**
   * Busca templates salvos no banco de dados
   * @param {string} businessAccountId - ID da conta de negócios
   * @param {Object} filters - Filtros opcionais
   * @returns {Promise<Object>} - Resultado da busca
   */
  async getSavedTemplates(businessAccountId, filters = {}) {
    try {
      logger.info(`[TEMPLATES] Buscando templates salvos para conta: ${businessAccountId}`);
      
      let query = supabaseAdmin
        .from('whatsapp_message_templates')
        .select('*')
        .eq('wpp_business_account_id', businessAccountId);

      // Aplicar filtros se fornecidos
      if (filters.status) {
        query = query.eq('template_status', filters.status);
      }
      
      if (filters.language) {
        query = query.eq('template_language', filters.language);
      }
      
      if (filters.category) {
        query = query.eq('template_category', filters.category);
      }

      // Ordenar por nome e data de criação
      query = query.order('template_name', { ascending: true });

      const { data, error } = await query;

      if (error) {
        logger.error(`[TEMPLATES] ❌ Erro ao buscar templates salvos: ${error.message}`);
        throw new Error(`Falha ao buscar templates: ${error.message}`);
      }

      logger.info(`[TEMPLATES] ✅ Templates encontrados no banco: ${data?.length || 0}`);
      
      return {
        success: true,
        data: data || [],
        total: data?.length || 0
      };

    } catch (error) {
      logger.error(`[TEMPLATES] ❌ Erro ao buscar templates salvos: ${error.message}`);
      return {
        success: false,
        error: `Erro ao buscar templates salvos: ${error.message}`
      };
    }
  }

  /**
   * Sincroniza templates da API da Meta com o banco de dados
   * @param {string} businessAccountId - ID da conta de negócios
   * @param {string} accessToken - Token de acesso da Meta
   * @returns {Promise<Object>} - Resultado da sincronização
   */
  async syncTemplates(businessAccountId, accessToken) {
    try {
      logger.info(`[TEMPLATES] 🔄 Iniciando sincronização de templates para conta: ${businessAccountId}`);
      
      // 1. Buscar templates da API da Meta
      const apiResult = await this.fetchMessageTemplates(businessAccountId, accessToken);
      
      if (!apiResult.success) {
        return apiResult;
      }

      // 2. Salvar templates no banco
      const saveResult = await this.saveTemplates(businessAccountId, apiResult.data);
      
      if (!saveResult.success) {
        return saveResult;
      }

      logger.info(`[TEMPLATES] ✅ Sincronização concluída: ${saveResult.saved} templates processados`);
      
      return {
        success: true,
        message: 'Sincronização de templates concluída com sucesso',
        apiTemplates: apiResult.total,
        savedTemplates: saveResult.saved
      };

    } catch (error) {
      logger.error(`[TEMPLATES] ❌ Erro na sincronização: ${error.message}`);
      return {
        success: false,
        error: `Erro na sincronização: ${error.message}`
      };
    }
  }

  /**
   * Busca estatísticas dos templates
   * @param {string} businessAccountId - ID da conta de negócios
   * @returns {Promise<Object>} - Estatísticas dos templates
   */
  async getTemplateStats(businessAccountId) {
    try {
      logger.info(`[TEMPLATES] 📊 Buscando estatísticas para conta: ${businessAccountId}`);
      
      const { data, error } = await supabaseAdmin
        .from('whatsapp_message_templates')
        .select('template_status, template_category, template_language')
        .eq('wpp_business_account_id', businessAccountId);

      if (error) {
        logger.error(`[TEMPLATES] ❌ Erro ao buscar estatísticas: ${error.message}`);
        throw new Error(`Falha ao buscar estatísticas: ${error.message}`);
      }

      // Calcular estatísticas
      const stats = {
        total: data?.length || 0,
        byStatus: {},
        byCategory: {},
        byLanguage: {}
      };

      data?.forEach(template => {
        // Por status
        stats.byStatus[template.template_status] = (stats.byStatus[template.template_status] || 0) + 1;
        
        // Por categoria
        if (template.template_category) {
          stats.byCategory[template.template_category] = (stats.byCategory[template.template_category] || 0) + 1;
        }
        
        // Por idioma
        if (template.template_language) {
          stats.byLanguage[template.template_language] = (stats.byLanguage[template.template_language] || 0) + 1;
        }
      });

      logger.info(`[TEMPLATES] ✅ Estatísticas calculadas: ${stats.total} templates`);
      
      return {
        success: true,
        data: stats
      };

    } catch (error) {
      logger.error(`[TEMPLATES] ❌ Erro ao buscar estatísticas: ${error.message}`);
      return {
        success: false,
        error: `Erro ao buscar estatísticas: ${error.message}`
      };
    }
  }

  /**
   * Criar um novo template de mensagem na Meta API
   * @param {string} businessAccountId - ID da conta WhatsApp Business
   * @param {string} accessToken - Token de acesso da Meta
   * @param {Object} templateData - Dados do template
   * @returns {Promise<Object>} Resultado da criação
   */
  async createMessageTemplate(businessAccountId, accessToken, templateData) {
    try {
      logger.info(`[TEMPLATES] 🔄 Criando template na Meta API...`, {
        businessAccountId,
        templateName: templateData.name,
        category: templateData.category,
        language: templateData.language
      });

      // Validar dados obrigatórios
      if (!templateData.name || !templateData.category || !templateData.language || !templateData.components) {
        throw new Error('Dados obrigatórios do template não fornecidos');
      }

      // Validar categoria
      const validCategories = ['AUTHENTICATION', 'MARKETING', 'UTILITY'];
      if (!validCategories.includes(templateData.category)) {
        throw new Error(`Categoria inválida. Use uma das seguintes: ${validCategories.join(', ')}`);
      }

      // Validar componentes
      if (!Array.isArray(templateData.components) || templateData.components.length === 0) {
        throw new Error('Template deve ter pelo menos um componente');
      }

      // Validar componente BODY obrigatório
      const hasBodyComponent = templateData.components.some(comp => comp.type === 'BODY');
      if (!hasBodyComponent) {
        throw new Error('Template deve ter um componente BODY');
      }

      // Preparar payload para a Meta API
      const payload = {
        name: templateData.name,
        category: templateData.category,
        language: templateData.language,
        components: templateData.components
      };

      // Adicionar parâmetros opcionais
      if (templateData.parameter_format) {
        payload.parameter_format = templateData.parameter_format;
      }

      if (templateData.message_send_ttl_seconds) {
        payload.message_send_ttl_seconds = templateData.message_send_ttl_seconds;
      }

      // Fazer requisição para a Meta API
      const response = await axios.post(
        `https://graph.facebook.com/v${process.env.WHATSAPP_API_VERSION || '18.0'}/${businessAccountId}/message_templates`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`[TEMPLATES] ✅ Template criado com sucesso na Meta API:`, response.data);

      // Salvar template no banco de dados
      const templateToSave = {
        template_id: response.data.id,
        template_name: templateData.name,
        template_language: templateData.language,
        template_category: templateData.category,
        template_status: response.data.status,
        template_components: templateData.components,
        wpp_business_account_id: businessAccountId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const saveResult = await this.saveTemplates(businessAccountId, [templateToSave]);

      return {
        success: true,
        message: 'Template criado com sucesso',
        data: {
          metaResponse: response.data,
          savedToDatabase: saveResult.success,
          templateId: response.data.id,
          status: response.data.status,
          category: response.data.category
        }
      };

    } catch (error) {
      logger.error(`[TEMPLATES] ❌ Erro ao criar template na Meta API:`, error);

      // Tratar erros específicos da Meta API
      if (error.response) {
        const metaError = error.response.data;
        
        if (metaError.error && metaError.error.code) {
          switch (metaError.error.code) {
            case 100:
              return {
                success: false,
                error: 'Parâmetro obrigatório não fornecido',
                details: metaError.error.message,
                code: metaError.error.code
              };
            case 190:
              return {
                success: false,
                error: 'Token de acesso inválido ou expirado',
                details: metaError.error.message,
                code: metaError.error.code
              };
            case 131:
              return {
                success: false,
                error: 'Limite de templates atingido',
                details: metaError.error.message,
                code: metaError.error.code
              };
            case 132:
              return {
                success: false,
                error: 'Nome do template já existe',
                details: metaError.error.message,
                code: metaError.error.code
              };
            default:
              return {
                success: false,
                error: 'Erro da Meta API',
                details: metaError.error.message,
                code: metaError.error.code
              };
          }
        }
      }

      return {
        success: false,
        error: 'Erro ao criar template',
        details: error.message
      };
    }
  }

  /**
   * Validar estrutura de componentes do template
   * @param {Array} components - Componentes do template
   * @returns {Object} Resultado da validação
   */
  validateTemplateComponents(components) {
    const errors = [];
    const warnings = [];

    // Validar tipos de componentes
    const validComponentTypes = ['HEADER', 'BODY', 'FOOTER', 'BUTTONS'];
    
    components.forEach((component, index) => {
      if (!validComponentTypes.includes(component.type)) {
        errors.push(`Componente ${index + 1}: Tipo inválido '${component.type}'`);
      }

      // Validar componente BODY
      if (component.type === 'BODY') {
        if (!component.text) {
          errors.push(`Componente BODY ${index + 1}: Texto obrigatório`);
        }
        
        // Validar parâmetros no texto
        const paramMatches = component.text.match(/\{\{(\d+)\}\}/g);
        if (paramMatches) {
          const paramNumbers = paramMatches.map(match => parseInt(match.match(/\d+/)[0]));
          const expectedNumbers = Array.from({length: Math.max(...paramNumbers)}, (_, i) => i + 1);
          
          if (!paramNumbers.every(num => expectedNumbers.includes(num))) {
            warnings.push(`Componente BODY ${index + 1}: Parâmetros não sequenciais detectados`);
          }
        }
      }

      // Validar componente HEADER
      if (component.type === 'HEADER') {
        if (!component.format) {
          errors.push(`Componente HEADER ${index + 1}: Formato obrigatório`);
        }
        
        if (component.format === 'TEXT' && !component.text) {
          errors.push(`Componente HEADER ${index + 1}: Texto obrigatório para formato TEXT`);
        }
      }

      // Validar componente BUTTONS
      if (component.type === 'BUTTONS') {
        if (!component.buttons || !Array.isArray(component.buttons)) {
          errors.push(`Componente BUTTONS ${index + 1}: Array de botões obrigatório`);
        } else {
          component.buttons.forEach((button, btnIndex) => {
            if (!button.type || !button.text) {
              errors.push(`Botão ${btnIndex + 1} do componente ${index + 1}: Tipo e texto obrigatórios`);
            }
            
            // Validar tipos de botão
            const validButtonTypes = ['QUICK_REPLY', 'URL', 'PHONE_NUMBER', 'OTP', 'MPM', 'CATALOG', 'FLOW', 'VOICE_CALL', 'APP'];
            if (!validButtonTypes.includes(button.type)) {
              errors.push(`Botão ${btnIndex + 1} do componente ${index + 1}: Tipo inválido '${button.type}'`);
            }
          });
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = new WhatsappTemplateService();
