const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Serviço de notificações para monitorar mudanças nas tabelas 'balance' e 'proposals'
 */
class NotificationService {
  constructor() {
    this.subscriptions = new Map();
    this.isRunning = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
  }

  /**
   * Iniciar o serviço de notificações
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Serviço de notificações já está em execução');
      return;
    }

    try {
      logger.info('🚀 Iniciando serviço de notificações...');
      
      // Configurar subscription para tabela 'balance'
      await this.setupBalanceSubscription();
      
      // Configurar subscription para tabela 'proposals'
      await this.setupProposalsSubscription();
      
      this.isRunning = true;
      this.reconnectAttempts = 0;
      
      logger.info('✅ Serviço de notificações iniciado com sucesso');
    } catch (error) {
      logger.error(`❌ Erro ao iniciar serviço de notificações: ${error.message}`);
      await this.handleReconnection();
    }
  }

  /**
   * Parar o serviço de notificações
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    try {
      logger.info('🛑 Parando serviço de notificações...');
      
      // Remover todas as subscriptions
      for (const [table, subscription] of this.subscriptions) {
        if (subscription && subscription.unsubscribe) {
          subscription.unsubscribe();
          logger.info(`📡 Subscription para ${table} removida`);
        }
      }
      
      this.subscriptions.clear();
      this.isRunning = false;
      
      logger.info('✅ Serviço de notificações parado com sucesso');
    } catch (error) {
      logger.error(`❌ Erro ao parar serviço de notificações: ${error.message}`);
    }
  }

  /**
   * Configurar subscription para tabela 'balance'
   */
  async setupBalanceSubscription() {
    try {
      const subscription = supabaseAdmin
        .channel('balance_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'balance'
          },
          async (payload) => {
            logger.info('💰 Evento INSERT recebido para balance:', payload);
            await this.handleBalanceInsert(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'balance'
          },
          async (payload) => {
            await this.handleBalanceUpdate(payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info('📡 Subscription para tabela "balance" ativa');
          } else {
            logger.warn(`⚠️ Status da subscription "balance": ${status}`);
          }
        });

      this.subscriptions.set('balance', subscription);
    } catch (error) {
      logger.error(`❌ Erro ao configurar subscription para balance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Configurar subscription para tabela 'proposals'
   */
  async setupProposalsSubscription() {
    try {
      const subscription = supabaseAdmin
        .channel('proposals_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'proposals'
          },
          async (payload) => {
            await this.handleProposalInsert(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'proposals'
          },
          async (payload) => {
            await this.handleProposalUpdate(payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info('📡 Subscription para tabela "proposals" ativa');
          } else {
            logger.warn(`⚠️ Status da subscription "proposals": ${status}`);
          }
        });

      this.subscriptions.set('proposals', subscription);
    } catch (error) {
      logger.error(`❌ Erro ao configurar subscription para proposals: ${error.message}`);
      throw error;
    }
  }

  /**
   * Manipular inserção na tabela balance
   */
  async handleBalanceInsert(payload) {
    try {
      const { new: newRecord } = payload;
      
      logger.info(`💰 Nova consulta de saldo inserida:`, {
        leadId: newRecord.lead_id,
        clientId: newRecord.client_id,
        balance: newRecord.balance,
        simulation: newRecord.simulation,
        timestamp: newRecord.created_at
      });

      // Buscar informações do lead para contexto
      const leadInfo = await this.getLeadInfo(newRecord.lead_id);
      
      // Determinar se é sucesso ou erro
      const hasError = newRecord.error_reason && newRecord.error_reason.trim() !== '';
      const hasBalance = newRecord.balance !== null && newRecord.balance > 0;
      
      // Criar notificação baseada no resultado
      let notification;
      
      if (hasError) {
        // Notificação de ERRO
        const leadName = leadInfo?.name || 'Lead não identificado';
        notification = {
          type: 'balance_error',
          title: '❌ Erro na Consulta de Saldo',
          message: `${leadName}: ${newRecord.error_reason}`,
          data: {
            table: 'balance',
            action: 'insert_error',
            leadId: newRecord.lead_id,
            clientId: newRecord.client_id,
            balance: newRecord.balance,
            simulation: newRecord.simulation,
            errorReason: newRecord.error_reason,
            source: newRecord.source,
            leadInfo: leadInfo,
            leadName: leadName,
            timestamp: newRecord.created_at
          },
          priority: 'high',
          category: 'error'
        };
      } else if (hasBalance) {
        // Notificação de SUCESSO com saldo
        const leadName = leadInfo?.name || 'Lead não identificado';
        notification = {
          type: 'balance_success',
          title: '💰 Novo Saldo Consultado',
          message: `${leadName}: R$ ${Number(newRecord.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          data: {
            table: 'balance',
            action: 'insert_success',
            leadId: newRecord.lead_id,
            clientId: newRecord.client_id,
            balance: newRecord.balance,
            simulation: newRecord.simulation,
            source: newRecord.source,
            leadInfo: leadInfo,
            leadName: leadName,
            timestamp: newRecord.created_at
          },
          priority: 'medium',
          category: 'financial'
        };
      } else {
        // Notificação de SUCESSO sem saldo (saldo zerado)
        const leadName = leadInfo?.name || 'Lead não identificado';
        notification = {
          type: 'balance_zero',
          title: '💰 Consulta de Saldo Realizada',
          message: `${leadName}: R$ 0,00 (sem saldo disponível)`,
          data: {
            table: 'balance',
            action: 'insert_zero',
            leadId: newRecord.lead_id,
            clientId: newRecord.client_id,
            balance: newRecord.balance,
            simulation: newRecord.simulation,
            source: newRecord.source,
            leadInfo: leadInfo,
            leadName: leadName,
            timestamp: newRecord.created_at
          },
          priority: 'low',
          category: 'financial'
        };
      }

      // Enviar notificação via WebSocket
      await this.sendWebSocketNotification(notification);
      
      // Enviar notificação via webhook (se configurado)
      await this.sendWebhookNotification(notification);
      
      // Log da notificação
      logger.info('📤 Notificação de saldo enviada:', notification.title);
      
    } catch (error) {
      logger.error(`❌ Erro ao processar inserção de balance: ${error.message}`);
    }
  }

  /**
   * Manipular atualização na tabela balance
   */
  async handleBalanceUpdate(payload) {
    try {
      const { new: newRecord, old: oldRecord } = payload;
      
      logger.info(`💰 Saldo atualizado:`, {
        leadId: newRecord.lead_id,
        oldBalance: oldRecord.balance,
        newBalance: newRecord.balance,
        timestamp: newRecord.updated_at
      });

      // Buscar informações do lead para contexto
      const leadInfo = await this.getLeadInfo(newRecord.lead_id);
      
      // Criar notificação estruturada
      const leadName = leadInfo?.name || 'Lead não identificado';
      const notification = {
        type: 'balance_update',
        title: '💰 Saldo Atualizado',
        message: `${leadName}: R$ ${Number(oldRecord.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} → R$ ${Number(newRecord.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        data: {
          table: 'balance',
          action: 'update',
          leadId: newRecord.lead_id,
          clientId: newRecord.client_id,
          oldBalance: oldRecord.balance,
          newBalance: newRecord.balance,
          oldSimulation: oldRecord.simulation,
          newSimulation: newRecord.simulation,
          source: newRecord.source,
          leadInfo: leadInfo,
          leadName: leadName,
          timestamp: newRecord.updated_at
        },
        priority: 'low',
        category: 'financial'
      };

        // Enviar notificação via WebSocket
        await this.sendWebSocketNotification(notification);
        
        // Enviar notificação via webhook (se configurado)
        await this.sendWebhookNotification(notification);
        
        // Log da notificação
        logger.info('📤 Notificação de atualização de saldo enviada:', notification.title);
      
    } catch (error) {
      logger.error(`❌ Erro ao processar atualização de balance: ${error.message}`);
    }
  }

  /**
   * Manipular inserção na tabela proposals
   */
  async handleProposalInsert(payload) {
    try {
      const { new: newRecord } = payload;
      
      logger.info(`📋 Nova proposta criada:`, {
        proposalId: newRecord.proposal_id,
        leadId: newRecord.lead_id,
        clientId: newRecord.client_id,
        value: newRecord.value,
        status: newRecord.status,
        timestamp: newRecord.created_at
      });

      // Buscar informações do lead para contexto
      const leadInfo = await this.getLeadInfo(newRecord.lead_id);
      
      // Criar notificação estruturada
      const leadName = leadInfo?.name || 'Lead não identificado';
      const notification = {
        type: 'proposal_insert',
        title: '📋 Nova Proposta Criada',
        message: `${leadName}: R$ ${Number(newRecord.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        data: {
          table: 'proposals',
          action: 'insert',
          proposalId: newRecord.proposal_id,
          leadId: newRecord.lead_id,
          clientId: newRecord.client_id,
          value: newRecord.value,
          status: newRecord.status,
          contractNumber: newRecord['Número contrato'],
          formalizationLink: newRecord['Link de formalização'],
          leadInfo: leadInfo,
          leadName: leadName,
          timestamp: newRecord.created_at
        },
        priority: 'high',
        category: 'proposal'
      };

        // Enviar notificação via WebSocket
        await this.sendWebSocketNotification(notification);
        
        // Enviar notificação via webhook (se configurado)
        await this.sendWebhookNotification(notification);
        
        // Log da notificação
        logger.info('📤 Notificação de proposta enviada:', notification.title);
      
    } catch (error) {
      logger.error(`❌ Erro ao processar inserção de proposal: ${error.message}`);
    }
  }

  /**
   * Manipular atualização na tabela proposals
   */
  async handleProposalUpdate(payload) {
    try {
      const { new: newRecord, old: oldRecord } = payload;
      
      logger.info(`📋 Proposta atualizada:`, {
        proposalId: newRecord.proposal_id,
        leadId: newRecord.lead_id,
        oldStatus: oldRecord.status,
        newStatus: newRecord.status,
        timestamp: newRecord.updated_at
      });

      // Buscar informações do lead para contexto
      const leadInfo = await this.getLeadInfo(newRecord.lead_id);
      
      // Determinar prioridade baseada na mudança de status
      const leadName = leadInfo?.name || 'Lead não identificado';
      let priority = 'medium';
      let title = '📋 Proposta Atualizada';
      let message = `${leadName}: Status alterado para ${newRecord.status || 'N/A'}`;

      if (oldRecord.status !== newRecord.status) {
        switch (newRecord.status) {
          case 'aprovada':
            priority = 'high';
            title = '🎉 Proposta Aprovada!';
            message = `${leadName}: R$ ${Number(newRecord.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            break;
          case 'rejeitada':
            priority = 'high';
            title = '❌ Proposta Rejeitada';
            message = `${leadName}: ${newRecord.error_reason || 'Motivo não especificado'}`;
            break;
          case 'em_analise':
            priority = 'medium';
            title = '⏳ Proposta em Análise';
            message = `${leadName}: Em análise pelo banco`;
            break;
        }
      }
      
      // Criar notificação estruturada
      const notification = {
        type: 'proposal_update',
        title,
        message,
        data: {
          table: 'proposals',
          action: 'update',
          proposalId: newRecord.proposal_id,
          leadId: newRecord.lead_id,
          clientId: newRecord.client_id,
          oldStatus: oldRecord.status,
          newStatus: newRecord.status,
          value: newRecord.value,
          errorReason: newRecord.error_reason,
          leadInfo: leadInfo,
          leadName: leadName,
          timestamp: newRecord.updated_at
        },
        priority,
        category: 'proposal'
      };

        // Enviar notificação via WebSocket
        await this.sendWebSocketNotification(notification);
        
        // Enviar notificação via webhook (se configurado)
        await this.sendWebhookNotification(notification);
        
        // Log da notificação
        logger.info('📤 Notificação de atualização de proposta enviada:', notification.title);
      
    } catch (error) {
      logger.error(`❌ Erro ao processar atualização de proposal: ${error.message}`);
    }
  }

  /**
   * Buscar informações do lead
   */
  async getLeadInfo(leadId) {
    try {
      if (!leadId) {
        logger.warn('⚠️ LeadId não fornecido para getLeadInfo');
        return null;
      }

      logger.info(`🔍 Buscando informações do lead: ${leadId}`);

      const { data, error } = await supabaseAdmin
        .from('leads')
        .select('id, name, cpf, email, phone')
        .eq('id', leadId)
        .single();

      if (error) {
        logger.warn(`⚠️ Erro ao buscar informações do lead ${leadId}: ${error.message}`);
        return null;
      }

      logger.info(`✅ Lead encontrado: ${data?.name || 'Nome não encontrado'} (ID: ${data?.id})`);
      return data;
    } catch (error) {
      logger.warn(`⚠️ Erro ao buscar informações do lead ${leadId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Enviar notificação via webhook (opcional)
   */
  async sendWebhookNotification(notification) {
    try {
      // Verificar se há URL de webhook configurada
      const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
      if (!webhookUrl) {
        // Webhook não configurado, apenas log
        return;
      }

      // Enviar webhook (não aguardar resposta para evitar bloqueios)
      fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FgtsAgent-NotificationService/1.0'
        },
        body: JSON.stringify({
          ...notification,
          service: 'fgts-agent',
          version: '1.0'
        })
      }).catch(error => {
        logger.warn(`⚠️ Erro ao enviar webhook: ${error.message}`);
      });

      logger.info('📤 Webhook de notificação enviado');
    } catch (error) {
      logger.warn(`⚠️ Erro ao enviar webhook: ${error.message}`);
    }
  }

  /**
   * Lidar com reconexão em caso de falha
   */
  async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('❌ Máximo de tentativas de reconexão atingido. Parando serviço de notificações.');
      return;
    }

    this.reconnectAttempts++;
    logger.warn(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${this.reconnectDelay/1000}s...`);

    setTimeout(async () => {
      try {
        await this.start();
      } catch (error) {
        logger.error(`❌ Erro na tentativa de reconexão: ${error.message}`);
        await this.handleReconnection();
      }
    }, this.reconnectDelay);
  }

  /**
   * Obter status do serviço
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      subscriptions: Array.from(this.subscriptions.keys()),
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }

  /**
   * Enviar notificação via WebSocket
   */
  async sendWebSocketNotification(notification) {
    try {
      if (!global.io) {
        logger.warn('⚠️ Socket.io não está disponível para enviar notificação');
        return;
      }

      // Enviar para todos os clientes conectados (ou filtrar por usuário se necessário)
      global.io.emit('notification', {
        id: notification.id || `notification-${Date.now()}`,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timestamp: notification.timestamp || new Date().toISOString(),
        data: notification.data,
        priority: notification.priority,
        category: notification.category
      });

      logger.info(`📡 Notificação enviada via WebSocket: ${notification.title}`);
    } catch (error) {
      logger.error(`❌ Erro ao enviar notificação via WebSocket: ${error.message}`);
    }
  }
}

// Instância singleton
const notificationService = new NotificationService();

module.exports = notificationService;
