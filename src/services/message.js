// Serviço para mensagens
const { supabaseAdmin } = require('./database');
const n8nIntegration = require('./n8nIntegration');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

class MessageService {
  async getCampaignsByOrganization(organizationId, status, userId) {
    try {
      // Verificar acesso à organização
      await this._verifyOrganizationAccess(organizationId, userId);
      
      let query = supabaseAdmin
        .from('message_campaigns')
        .select(`
          id,
          name,
          description,
          agent_id,
          message_template,
          variables,
          scheduled_at,
          status,
          created_at,
          updated_at
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw new AppError(error.message, 400);
      
      return data.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        agentId: campaign.agent_id,
        messageTemplate: campaign.message_template,
        variables: campaign.variables,
        scheduledAt: campaign.scheduled_at,
        status: campaign.status,
        createdAt: campaign.created_at,
        updatedAt: campaign.updated_at
      }));
    } catch (error) {
      logger.error(`Erro ao buscar campanhas: ${error.message}`);
      throw error;
    }
  }
  
  async createCampaign(data) {
    try {
      const {
        name,
        description,
        organizationId,
        agentId,
        messageTemplate,
        variables,
        userId
      } = data;
      
      // Verificar acesso à organização
      await this._verifyOrganizationAccess(organizationId, userId);
      
      // Verificar se o agente existe e pertence à organização
      const { data: agent, error: agentError } = await supabaseAdmin
        .from('client_agents')
        .select('id')
        .eq('id', agentId)
        .eq('organization_id', organizationId)
        .single();
      
      if (agentError || !agent) {
        throw new AppError('Agente não encontrado ou não pertence a esta organização', 404);
      }
      
      // Criar campanha
      const { data: campaign, error } = await supabaseAdmin
        .from('message_campaigns')
        .insert({
          name,
          description,
          organization_id: organizationId,
          agent_id: agentId,
          message_template: messageTemplate,
          variables,
          status: 'draft'
        })
        .select()
        .single();
      
      if (error) throw new AppError(error.message, 400);
      
      logger.info(`Campanha criada: ${name} para organização: ${organizationId}`);
      
      return {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        agentId: campaign.agent_id,
        messageTemplate: campaign.message_template,
        variables: campaign.variables,
        status: campaign.status,
        createdAt: campaign.created_at
      };
    } catch (error) {
      logger.error(`Erro ao criar campanha: ${error.message}`);
      throw error;
    }
  }
  
  async getCampaignById(campaignId, userId) {
    try {
      // Verificar acesso à campanha
      const organizationId = await this._getCampaignOrganization(campaignId);
      await this._verifyOrganizationAccess(organizationId, userId);
      
      const { data, error } = await supabaseAdmin
        .from('message_campaigns')
        .select(`
          id,
          name,
          description,
          organization_id,
          agent_id,
          message_template,
          variables,
          scheduled_at,
          status,
          created_at,
          updated_at
        `)
        .eq('id', campaignId)
        .single();
      
      if (error) throw new AppError(error.message, 404);
      
      // Contar destinatários
      const { count, error: countError } = await supabaseAdmin
        .from('message_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);
      
      if (countError) throw new AppError(countError.message, 400);
      
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        organizationId: data.organization_id,
        agentId: data.agent_id,
        messageTemplate: data.message_template,
        variables: data.variables,
        scheduledAt: data.scheduled_at,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        recipientsCount: count
      };
    } catch (error) {
      logger.error(`Erro ao buscar campanha: ${error.message}`);
      throw error;
    }
  }
  
  async updateCampaign(campaignId, updates, userId) {
    try {
      // Verificar acesso à campanha
      const organizationId = await this._getCampaignOrganization(campaignId);
      await this._verifyOrganizationAccess(organizationId, userId);
      
      // Verificar status da campanha (só pode editar se for draft)
      const { data: campaign, error: checkError } = await supabaseAdmin
        .from('message_campaigns')
        .select('status')
        .eq('id', campaignId)
        .single();
      
      if (checkError) throw new AppError(checkError.message, 404);
      
      if (campaign.status !== 'draft') {
        throw new AppError('Não é possível editar uma campanha que não está em rascunho', 400);
      }
      
      const {
        name,
        description,
        messageTemplate,
        variables
      } = updates;
      
      const updateData = {};
      
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (messageTemplate !== undefined) updateData.message_template = messageTemplate;
      if (variables !== undefined) updateData.variables = variables;
      
      updateData.updated_at = new Date();
      
      const { data, error } = await supabaseAdmin
        .from('message_campaigns')
        .update(updateData)
        .eq('id', campaignId)
        .select()
        .single();
      
      if (error) throw new AppError(error.message, 400);
      
      logger.info(`Campanha atualizada: ${campaignId}`);
      
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        agentId: data.agent_id,
        messageTemplate: data.message_template,
        variables: data.variables,
        status: data.status,
        updatedAt: data.updated_at
      };
    } catch (error) {
      logger.error(`Erro ao atualizar campanha: ${error.message}`);
      throw error;
    }
  }
  
  async deleteCampaign(campaignId, userId) {
    try {
      // Verificar acesso à campanha
      const organizationId = await this._getCampaignOrganization(campaignId);
      await this._verifyOrganizationAccess(organizationId, userId);
      
      // Verificar status da campanha (só pode excluir se for draft)
      const { data: campaign, error: checkError } = await supabaseAdmin
        .from('message_campaigns')
        .select('status')
        .eq('id', campaignId)
        .single();
      
      if (checkError) throw new AppError(checkError.message, 404);
      
      if (campaign.status !== 'draft') {
        throw new AppError('Não é possível excluir uma campanha que não está em rascunho', 400);
      }
      
      // Excluir campanha
      const { error } = await supabaseAdmin
        .from('message_campaigns')
        .delete()
        .eq('id', campaignId);
      
      if (error) throw new AppError(error.message, 400);
      
      logger.info(`Campanha excluída: ${campaignId}`);
      
      return true;
    } catch (error) {
      logger.error(`Erro ao excluir campanha: ${error.message}`);
      throw error;
    }
  }
  
  async scheduleCampaign(campaignId, scheduledAt, userId) {
    try {
      // Verificar acesso à campanha
      const organizationId = await this._getCampaignOrganization(campaignId);
      await this._verifyOrganizationAccess(organizationId, userId);
      
      // Verificar status da campanha
      const { data: campaign, error: checkError } = await supabaseAdmin
        .from('message_campaigns')
        .select('status')
        .eq('id', campaignId)
        .single();
      
      if (checkError) throw new AppError(checkError.message, 404);
      
      if (campaign.status !== 'draft') {
        throw new AppError('Apenas campanhas em rascunho podem ser agendadas', 400);
      }
      
      // Verificar se tem destinatários
      const { count, error: countError } = await supabaseAdmin
        .from('message_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);
      
      if (countError) throw new AppError(countError.message, 400);
      
      if (count === 0) {
        throw new AppError('A campanha precisa ter pelo menos um destinatário', 400);
      }
      
      // Atualizar campanha
      const { data, error } = await supabaseAdmin
        .from('message_campaigns')
        .update({
          scheduled_at: scheduledAt ? new Date(scheduledAt) : new Date(),
          status: 'scheduled',
          updated_at: new Date()
        })
        .eq('id', campaignId)
        .select()
        .single();
      
      if (error) throw new AppError(error.message, 400);
      
      logger.info(`Campanha agendada: ${campaignId} para: ${data.scheduled_at}`);
      
      return {
        id: data.id,
        name: data.name,
        status: data.status,
        scheduledAt: data.scheduled_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      logger.error(`Erro ao agendar campanha: ${error.message}`);
      throw error;
    }
  }
  
  async cancelCampaign(campaignId, userId) {
    try {
      // Verificar acesso à campanha
      const organizationId = await this._getCampaignOrganization(campaignId);
      await this._verifyOrganizationAccess(organizationId, userId);
      
      // Verificar status da campanha
      const { data: campaign, error: checkError } = await supabaseAdmin
        .from('message_campaigns')
        .select('status')
        .eq('id', campaignId)
        .single();
      
      if (checkError) throw new AppError(checkError.message, 404);
      
      if (campaign.status !== 'scheduled' && campaign.status !== 'in_progress') {
        throw new AppError('Apenas campanhas agendadas ou em andamento podem ser canceladas', 400);
      }
      
      // Atualizar campanha
      const { data, error } = await supabaseAdmin
        .from('message_campaigns')
        .update({
          status: 'canceled',
          updated_at: new Date()
        })
        .eq('id', campaignId)
        .select()
        .single();
      
      if (error) throw new AppError(error.message, 400);
      
      logger.info(`Campanha cancelada: ${campaignId}`);
      
      return {
        id: data.id,
        name: data.name,
        status: data.status,
        updatedAt: data.updated_at
      };
    } catch (error) {
      logger.error(`Erro ao cancelar campanha: ${error.message}`);
      throw error;
    }
  }
  
  async getCampaignRecipients(campaignId, userId, pagination) {
    try {
      // Verificar acesso à campanha
      const organizationId = await this._getCampaignOrganization(campaignId);
      await this._verifyOrganizationAccess(organizationId, userId);
      
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await supabaseAdmin
        .from('message_recipients')
        .select('id, user_identifier, custom_variables, status, sent_at, delivered_at, error_message', { count: 'exact' })
        .eq('campaign_id', campaignId)
        .range(offset, offset + limit - 1);
      
      if (error) throw new AppError(error.message, 400);
      
      return {
        recipients: data.map(recipient => ({
          id: recipient.id,
          userIdentifier: recipient.user_identifier,
          customVariables: recipient.custom_variables,
          status: recipient.status,
          sentAt: recipient.sent_at,
          deliveredAt: recipient.delivered_at,
          errorMessage: recipient.error_message
        })),
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logger.error(`Erro ao buscar destinatários: ${error.message}`);
      throw error;
    }
  }
  
  async addCampaignRecipients(campaignId, recipients, userId) {
    try {
      // Verificar acesso à campanha
      const organizationId = await this._getCampaignOrganization(campaignId);
      await this._verifyOrganizationAccess(organizationId, userId);
      
      // Verificar status da campanha (só pode adicionar se for draft)
      const { data: campaign, error: checkError } = await supabaseAdmin
        .from('message_campaigns')
        .select('status')
        .eq('id', campaignId)
        .single();
      
      if (checkError) throw new AppError(checkError.message, 404);
      
      if (campaign.status !== 'draft') {
        throw new AppError('Não é possível adicionar destinatários a uma campanha que não está em rascunho', 400);
      }
      
      // Preparar dados para inserção
      const recipientsToInsert = recipients.map(recipient => ({
        campaign_id: campaignId,
        user_identifier: recipient.userIdentifier,
        custom_variables: recipient.customVariables || {},
        status: 'pending'
      }));
      
      // Inserir destinatários
      const { data, error } = await supabaseAdmin
        .from('message_recipients')
        .insert(recipientsToInsert)
        .select('id');
      
      if (error) throw new AppError(error.message, 400);
      
      logger.info(`${data.length} destinatários adicionados à campanha: ${campaignId}`);
      
      return {
        added: data.length,
        total: recipientsToInsert.length
      };
    } catch (error) {
      logger.error(`Erro ao adicionar destinatários: ${error.message}`);
      throw error;
    }
  }
  
  async removeCampaignRecipient(campaignId, recipientId, userId) {
    try {
      // Verificar acesso à campanha
      const organizationId = await this._getCampaignOrganization(campaignId);
      await this._verifyOrganizationAccess(organizationId, userId);
      
      // Verificar status da campanha
      const { data: campaign, error: checkError } = await supabaseAdmin
        .from('message_campaigns')
        .select('status')
        .eq('id', campaignId)
        .single();
      
      if (checkError) throw new AppError(checkError.message, 404);
      
      if (campaign.status !== 'draft') {
        throw new AppError('Não é possível remover destinatários de uma campanha que não está em rascunho', 400);
      }
      
      // Remover destinatário
      const { error } = await supabaseAdmin
        .from('message_recipients')
        .delete()
        .eq('id', recipientId)
        .eq('campaign_id', campaignId);
      
      if (error) throw new AppError(error.message, 400);
      
      logger.info(`Destinatário ${recipientId} removido da campanha: ${campaignId}`);
      
      return true;
    } catch (error) {
      logger.error(`Erro ao remover destinatário: ${error.message}`);
      throw error;
    }
  }
  
  async getDirectMessages(organizationId, userIdentifier, userId, pagination) {
    try {
      // Verificar acesso à organização
      await this._verifyOrganizationAccess(organizationId, userId);
      
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;
      
      let query = supabaseAdmin
        .from('direct_messages')
        .select(`
          id,
          agent_id,
          user_identifier,
          message,
          status,
          scheduled_at,
          sent_at,
          created_at,
          metadata
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (userIdentifier) {
        query = query.eq('user_identifier', userIdentifier);
      }
      
      const { data, error, count } = await query
        .range(offset, offset + limit - 1);
      
      if (error) throw new AppError(error.message, 400);
      
      return {
        messages: data.map(message => ({
          id: message.id,
          agentId: message.agent_id,
          userIdentifier: message.user_identifier,
          message: message.message,
          status: message.status,
          scheduledAt: message.scheduled_at,
          sentAt: message.sent_at,
          createdAt: message.created_at,
          metadata: message.metadata
        })),
        pagination: {
          page,
          limit,
          total: count || data.length
        }
      };
    } catch (error) {
      logger.error(`Erro ao buscar mensagens diretas: ${error.message}`);
      throw error;
    }
  }
  
  async sendDirectMessage(data) {
    try {
      const {
        organizationId,
        agentId,
        userIdentifier,
        message,
        scheduledAt,
        userId
      } = data;
      
      // Verificar acesso à organização
      await this._verifyOrganizationAccess(organizationId, userId);
      
      // Verificar se o agente existe e pertence à organização
      const { data: agent, error: agentError } = await supabaseAdmin
        .from('client_agents')
        .select('id')
        .eq('id', agentId)
        .eq('organization_id', organizationId)
        .single();
      
      if (agentError || !agent) {
        throw new AppError('Agente não encontrado ou não pertence a esta organização', 404);
      }
      
      // Criar registro da mensagem direta
      const { data: directMessage, error } = await supabaseAdmin
        .from('direct_messages')
        .insert({
          organization_id: organizationId,
          agent_id: agentId,
          user_identifier: userIdentifier,
          message,
          status: scheduledAt ? 'pending' : 'sending',
          scheduled_at: scheduledAt ? new Date(scheduledAt) : null,
          metadata: { initiated_by: userId }
        })
        .select()
        .single();
      
      if (error) throw new AppError(error.message, 400);
      
      // Se não for agendada, enviar agora
      if (!scheduledAt) {
        try {
          const result = await n8nIntegration.sendMessage(
            agentId,
            userIdentifier,
            message
          );
          
          // Atualizar com o resultado
          await supabaseAdmin
            .from('direct_messages')
            .update({
              status: 'sent',
              sent_at: new Date(),
              metadata: {
                ...directMessage.metadata,
                interaction_id: result.id,
                execution_time: result.executionTime,
                tokens_used: result.tokensUsed
              }
            })
            .eq('id', directMessage.id);
        } catch (sendError) {
          // Marcar como falha
          await supabaseAdmin
            .from('direct_messages')
            .update({
              status: 'failed',
              metadata: {
                ...directMessage.metadata,
                error: sendError.message
              }
            })
            .eq('id', directMessage.id);
            
          throw sendError;
        }
      }
      
      logger.info(`Mensagem direta ${directMessage.id} criada para usuário: ${userIdentifier}`);
      
      return {
        id: directMessage.id,
        status: directMessage.status,
        createdAt: directMessage.created_at,
        scheduledAt: directMessage.scheduled_at
      };
    } catch (error) {
      logger.error(`Erro ao enviar mensagem direta: ${error.message}`);
      throw error;
    }
  }
  
  // Processar campanhas agendadas (para ser executado por job)
  async processPendingCampaigns() {
    try {
      // Buscar campanhas agendadas para agora
      const { data: campaigns, error } = await supabaseAdmin
        .from('message_campaigns')
        .select('id, name, organization_id, agent_id, message_template, variables')
        .eq('status', 'scheduled')
        .lte('scheduled_at', new Date())
        .order('scheduled_at');
      
      if (error) {
        logger.error(`Erro ao buscar campanhas agendadas: ${error.message}`);
        return [];
      }
      
      const processed = [];
      
      for (const campaign of campaigns) {
        try {
          // Marcar como em progresso
          await supabaseAdmin
            .from('message_campaigns')
            .update({ status: 'in_progress', updated_at: new Date() })
            .eq('id', campaign.id);
          
          // Buscar destinatários
          const { data: recipients, error: recipientsError } = await supabaseAdmin
            .from('message_recipients')
            .select('id, user_identifier, custom_variables')
            .eq('campaign_id', campaign.id)
            .eq('status', 'pending');
          
          if (recipientsError) {
            throw new Error(`Erro ao buscar destinatários: ${recipientsError.message}`);
          }
          
          let sentCount = 0;
          let failedCount = 0;
          
          // Processar cada destinatário
          for (const recipient of recipients) {
            try {
              // Substituir variáveis no template
              const messageText = this._replaceTemplateVariables(
                campaign.message_template,
                { ...campaign.variables, ...recipient.custom_variables }
              );
              
              // Enviar mensagem
              const result = await n8nIntegration.sendMessage(
                campaign.agent_id,
                recipient.user_identifier,
                messageText
              );
              
              // Atualizar destinatário
              await supabaseAdmin
                .from('message_recipients')
                .update({
                  status: 'sent',
                  sent_at: new Date()
                })
                .eq('id', recipient.id);
                
              sentCount++;
            } catch (sendError) {
              // Registrar falha
              await supabaseAdmin
                .from('message_recipients')
                .update({
                  status: 'failed',
                  error_message: sendError.message
                })
                .eq('id', recipient.id);
                
              failedCount++;
              logger.error(`Erro ao enviar para destinatário ${recipient.id}: ${sendError.message}`);
            }
          }
          
          // Verificar se todos foram processados
          const { count: pendingCount, error: pendingError } = await supabaseAdmin
            .from('message_recipients')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('status', 'pending');
          
          // Atualizar status da campanha
          const finalStatus = pendingCount === 0 ? 'completed' : 'in_progress';
          
          await supabaseAdmin
            .from('message_campaigns')
            .update({
              status: finalStatus,
              updated_at: new Date(),
              metadata: {
                sent_count: sentCount,
                failed_count: failedCount,
                last_processed_at: new Date()
              }
            })
            .eq('id', campaign.id);
          
          processed.push({
            id: campaign.id,
            name: campaign.name,
            status: finalStatus,
            sent: sentCount,
            failed: failedCount
          });
          
          logger.info(`Campanha ${campaign.id} processada: ${sentCount} enviados, ${failedCount} falhas`);
        } catch (campaignError) {
          logger.error(`Erro ao processar campanha ${campaign.id}: ${campaignError.message}`);
          
          // Marcar campanha como falha
          await supabaseAdmin
            .from('message_campaigns')
            .update({
              status: 'failed',
              updated_at: new Date(),
              metadata: {
                error: campaignError.message
              }
            })
            .eq('id', campaign.id);
        }
      }
      
      return processed;
    } catch (error) {
      logger.error(`Erro no processamento de campanhas: ${error.message}`);
      return [];
    }
  }
  
  // Processar mensagens diretas agendadas
  async processPendingDirectMessages() {
    try {
      // Buscar mensagens agendadas para agora
      const { data: messages, error } = await supabaseAdmin
        .from('direct_messages')
        .select('id, organization_id, agent_id, user_identifier, message, metadata')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date())
        .order('scheduled_at');
      
      if (error) {
        logger.error(`Erro ao buscar mensagens agendadas: ${error.message}`);
        return [];
      }
      
      const processed = [];
      
      for (const directMessage of messages) {
        try {
          // Marcar como enviando
          await supabaseAdmin
            .from('direct_messages')
            .update({ status: 'sending', updated_at: new Date() })
            .eq('id', directMessage.id);
          
          // Enviar mensagem
          const result = await n8nIntegration.sendMessage(
            directMessage.agent_id,
            directMessage.user_identifier,
            directMessage.message
          );
          
          // Atualizar com o resultado
          await supabaseAdmin
            .from('direct_messages')
            .update({
              status: 'sent',
              sent_at: new Date(),
              metadata: {
                ...directMessage.metadata,
                interaction_id: result.id,
                execution_time: result.executionTime,
                tokens_used: result.tokensUsed
              }
            })
            .eq('id', directMessage.id);
          
          processed.push({
            id: directMessage.id,
            status: 'sent'
          });
          
          logger.info(`Mensagem direta ${directMessage.id} enviada com sucesso`);
        } catch (sendError) {
          // Marcar como falha
          await supabaseAdmin
            .from('direct_messages')
            .update({
              status: 'failed',
              metadata: {
                ...directMessage.metadata,
                error: sendError.message
              }
            })
            .eq('id', directMessage.id);
            
          logger.error(`Erro ao enviar mensagem direta ${directMessage.id}: ${sendError.message}`);
        }
      }
      
      return processed;
    } catch (error) {
      logger.error(`Erro no processamento de mensagens diretas: ${error.message}`);
      return [];
    }
  }
  
  // Métodos auxiliares
  
  _replaceTemplateVariables(template, variables) {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      // Sanitizar a chave para evitar regex injection
      const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`{{\\s*${safeKey}\\s*}}`, 'g');
      
      // Converter valor para string e escapar caracteres especiais para substituição
      const safeValue = String(value || '').replace(/\$/g, '$$$$');
      
      result = result.replace(pattern, safeValue);
    }
    
    return result;
  }
  
  async _getCampaignOrganization(campaignId) {
    const { data, error } = await supabaseAdmin
      .from('message_campaigns')
      .select('organization_id')
      .eq('id', campaignId)
      .single();
    
    if (error || !data) {
      throw new AppError('Campanha não encontrada', 404);
    }
    
    return data.organization_id;
  }
  
  async _verifyOrganizationAccess(organizationId, userId) {
    const { data, error } = await supabaseAdmin
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      throw new AppError('Acesso negado a esta organização', 403);
    }
    
    return true;
  }
}

module.exports = new MessageService();