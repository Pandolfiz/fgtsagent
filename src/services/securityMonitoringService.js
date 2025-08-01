const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const crypto = require('crypto');

class SecurityMonitoringService {
  constructor() {
    this.suspiciousActivities = [];
    this.securityAlerts = [];
    this.incidentLogs = [];
  }

  /**
   * Monitorar tentativas de login
   */
  async monitorLoginAttempts(userId, ipAddress, userAgent, success, details = {}) {
    try {
      const loginData = {
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        success,
        timestamp: new Date().toISOString(),
        details: JSON.stringify(details)
      };

      // Verificar atividades suspeitas
      let isSuspicious = false;
      try {
        isSuspicious = await this.detectSuspiciousLogin(loginData);
        
        if (isSuspicious) {
          await this.createSecurityAlert('suspicious_login', loginData);
          logger.warn(`Atividade suspeita detectada: login do usuário ${userId}`, loginData);
        }
      } catch (detectionError) {
        logger.warn('Erro na detecção de login suspeito (não crítico):', detectionError.message);
      }

      // Registrar no banco (opcional - pode falhar se tabelas não existem)
      try {
        const { error } = await supabaseAdmin
          .from('security_logs')
          .insert(loginData);

        if (error) {
          logger.warn('Erro ao registrar tentativa de login (tabela pode não existir):', error.message);
        }
      } catch (dbError) {
        logger.warn('Erro de conexão com banco para logs de segurança (não crítico):', dbError.message);
      }

      return { isSuspicious, alertCreated: isSuspicious };
    } catch (error) {
      logger.error('Erro no monitoramento de login:', error);
      // Não propagar erro para não quebrar a aplicação
      return { isSuspicious: false, alertCreated: false };
    }
  }

  /**
   * Detectar login suspeito
   */
  async detectSuspiciousLogin(loginData) {
    try {
      const { user_id, ip_address, success } = loginData;
      
      // Verificar tentativas falhadas recentes
      const { data: failedAttempts } = await supabaseAdmin
        .from('security_logs')
        .select('*')
        .eq('user_id', user_id)
        .eq('success', false)
        .gte('timestamp', new Date(Date.now() - 15 * 60 * 1000).toISOString()); // Últimos 15 minutos

      // Verificar tentativas de IPs diferentes
      const { data: differentIPs } = await supabaseAdmin
        .from('security_logs')
        .select('ip_address')
        .eq('user_id', user_id)
        .neq('ip_address', ip_address)
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Última hora

      // Critérios de suspeita
      const suspiciousCriteria = {
        multipleFailedAttempts: failedAttempts?.length >= 5,
        differentIPs: differentIPs?.length >= 3,
        unusualTime: this.isUnusualTime(),
        knownMaliciousIP: await this.isKnownMaliciousIP(ip_address)
      };

      return Object.values(suspiciousCriteria).some(criteria => criteria);
    } catch (error) {
      logger.error('Erro ao detectar login suspeito:', error);
      return false;
    }
  }

  /**
   * Monitorar acesso a dados sensíveis
   */
  async monitorDataAccess(userId, dataType, action, details = {}) {
    try {
      const accessData = {
        user_id: userId,
        data_type: dataType,
        action,
        timestamp: new Date().toISOString(),
        details: JSON.stringify(details)
      };

      // Verificar atividades suspeitas
      let isSuspicious = false;
      try {
        isSuspicious = await this.detectSuspiciousDataAccess(accessData);
        
        if (isSuspicious) {
          await this.createSecurityAlert('suspicious_data_access', accessData);
          logger.warn(`Acesso suspeito detectado: usuário ${userId} acessando ${dataType}`, accessData);
        }
      } catch (detectionError) {
        logger.warn('Erro na detecção de acesso suspeito (não crítico):', detectionError.message);
      }

      // Registrar no banco (opcional)
      try {
        const { error } = await supabaseAdmin
          .from('data_access_logs')
          .insert(accessData);

        if (error) {
          logger.warn('Erro ao registrar acesso a dados (tabela pode não existir):', error.message);
        }
      } catch (dbError) {
        logger.warn('Erro de conexão com banco para logs de acesso (não crítico):', dbError.message);
      }

      return { isSuspicious, alertCreated: isSuspicious };
    } catch (error) {
      logger.error('Erro no monitoramento de acesso a dados:', error);
      return { isSuspicious: false, alertCreated: false };
    }
  }

  /**
   * Detectar acesso suspeito a dados
   */
  async detectSuspiciousDataAccess(accessData) {
    try {
      const { user_id, data_type, action } = accessData;
      
      // Verificar acessos frequentes
      const { data: frequentAccess } = await supabaseAdmin
        .from('data_access_logs')
        .select('*')
        .eq('user_id', user_id)
        .eq('data_type', data_type)
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Última hora

      // Verificar horários incomuns
      const unusualTime = this.isUnusualTime();
      
      // Verificar padrões suspeitos
      const suspiciousPatterns = {
        frequentAccess: frequentAccess?.length >= 10,
        unusualTime,
        sensitiveDataAccess: ['cpf_cnpj', 'balance', 'financial_data'].includes(data_type),
        bulkAccess: action === 'bulk_export' || action === 'mass_query'
      };

      return Object.values(suspiciousPatterns).some(pattern => pattern);
    } catch (error) {
      logger.error('Erro ao detectar acesso suspeito a dados:', error);
      return false;
    }
  }

  /**
   * Monitorar transações financeiras
   */
  async monitorFinancialTransactions(userId, transactionType, amount, details = {}) {
    try {
      const transactionData = {
        user_id: userId,
        transaction_type: transactionType,
        amount: parseFloat(amount) || 0,
        timestamp: new Date().toISOString(),
        details: JSON.stringify(details)
      };

      // Verificar atividades suspeitas
      let isSuspicious = false;
      try {
        isSuspicious = await this.detectSuspiciousTransaction(transactionData);
        
        if (isSuspicious) {
          await this.createSecurityAlert('suspicious_transaction', transactionData);
          logger.warn(`Transação suspeita detectada: usuário ${userId} - ${transactionType} - R$ ${amount}`, transactionData);
        }
      } catch (detectionError) {
        logger.warn('Erro na detecção de transação suspeita (não crítico):', detectionError.message);
      }

      // Registrar no banco (opcional)
      try {
        const { error } = await supabaseAdmin
          .from('transaction_logs')
          .insert(transactionData);

        if (error) {
          logger.warn('Erro ao registrar transação (tabela pode não existir):', error.message);
        }
      } catch (dbError) {
        logger.warn('Erro de conexão com banco para logs de transação (não crítico):', dbError.message);
      }

      return { isSuspicious, alertCreated: isSuspicious };
    } catch (error) {
      logger.error('Erro no monitoramento de transações financeiras:', error);
      return { isSuspicious: false, alertCreated: false };
    }
  }

  /**
   * Detectar transação suspeita
   */
  async detectSuspiciousTransaction(transactionData) {
    try {
      const { user_id, amount, transaction_type } = transactionData;
      
      // Verificar transações recentes
      const { data: recentTransactions } = await supabaseAdmin
        .from('transaction_logs')
        .select('*')
        .eq('user_id', user_id)
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Últimas 24h

      // Critérios de suspeita
      const suspiciousCriteria = {
        highAmount: amount > 10000, // Valor alto
        multipleTransactions: recentTransactions?.length >= 5,
        unusualTime: this.isUnusualTime(),
        newUser: await this.isNewUser(user_id),
        unusualPattern: this.detectUnusualPattern(recentTransactions)
      };

      return Object.values(suspiciousCriteria).some(criteria => criteria);
    } catch (error) {
      logger.error('Erro ao detectar transação suspeita:', error);
      return false;
    }
  }

  /**
   * Criar alerta de segurança
   */
  async createSecurityAlert(alertType, data) {
    try {
      const alert = {
        id: crypto.randomUUID(),
        alert_type: alertType,
        severity: await this.calculateSeverity(alertType, data),
        data: JSON.stringify(data),
        timestamp: new Date().toISOString(),
        status: 'open',
        assigned_to: null
      };

      // Salvar alerta
      const { error } = await supabaseAdmin
        .from('security_alerts')
        .insert(alert);

      if (error) {
        logger.error('Erro ao criar alerta de segurança:', error);
        return null;
      }

      // Notificar equipe se for crítico
      if (alert.severity === 'critical') {
        await this.notifySecurityTeam(alert);
      }

      this.securityAlerts.push(alert);
      return alert;
    } catch (error) {
      logger.error('Erro ao criar alerta de segurança:', error);
      throw error;
    }
  }

  /**
   * Calcular severidade do alerta
   */
  async calculateSeverity(alertType, data) {
    const severityMap = {
      suspicious_login: 'high',
      suspicious_data_access: 'medium',
      suspicious_transaction: 'high',
      system_compromise: 'critical'
    };

    // Ajustar baseado no contexto
    if (data.user_id && await this.isAdminUser(data.user_id)) {
      return 'critical';
    }

    return severityMap[alertType] || 'medium';
  }

  /**
   * Notificar equipe de segurança
   */
  async notifySecurityTeam(alert) {
    try {
      // Enviar email de emergência
      const emailData = {
        to: 'security@fgtsagent.com.br',
        subject: `ALERTA CRÍTICO DE SEGURANÇA - ${alert.alert_type.toUpperCase()}`,
        body: `
          Alerta de Segurança Crítico Detectado!
          
          Tipo: ${alert.alert_type}
          Severidade: ${alert.severity}
          Timestamp: ${alert.timestamp}
          ID: ${alert.id}
          
          Dados: ${alert.data}
          
          Ação imediata necessária!
        `
      };

      // Implementar envio de email
      logger.critical('ALERTA CRÍTICO DE SEGURANÇA:', emailData);
      
      // TODO: Integrar com serviço de email
      // await emailService.sendEmail(emailData);
      
    } catch (error) {
      logger.error('Erro ao notificar equipe de segurança:', error);
    }
  }

  /**
   * Verificar se é horário incomum
   */
  isUnusualTime() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    // Horário incomum: 23h às 6h ou fim de semana
    return hour < 6 || hour > 23 || dayOfWeek === 0 || dayOfWeek === 6;
  }

  /**
   * Verificar se IP é conhecido como malicioso
   */
  async isKnownMaliciousIP(ipAddress) {
    // TODO: Integrar com serviço de reputação de IP
    // Por enquanto, lista básica
    const maliciousIPs = [
      '192.168.1.100', // Exemplo
      '10.0.0.50'      // Exemplo
    ];
    
    return maliciousIPs.includes(ipAddress);
  }

  /**
   * Verificar se usuário é novo
   */
  async isNewUser(userId) {
    try {
      const { data } = await supabaseAdmin
        .from('user_profiles')
        .select('created_at')
        .eq('id', userId)
        .single();

      if (!data) return true;

      const userAge = Date.now() - new Date(data.created_at).getTime();
      return userAge < 7 * 24 * 60 * 60 * 1000; // Menos de 7 dias
    } catch (error) {
      logger.error('Erro ao verificar se usuário é novo:', error);
      return false;
    }
  }

  /**
   * Verificar se usuário é administrador
   */
  async isAdminUser(userId) {
    try {
      const { data } = await supabaseAdmin
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single();

      return data?.role === 'admin';
    } catch (error) {
      logger.error('Erro ao verificar se usuário é admin:', error);
      return false;
    }
  }

  /**
   * Detectar padrão incomum
   */
  detectUnusualPattern(transactions) {
    if (!transactions || transactions.length < 3) return false;
    
    // Verificar se há muitas transações em sequência rápida
    const recentTransactions = transactions.slice(-3);
    const timeSpan = new Date(recentTransactions[2].timestamp) - new Date(recentTransactions[0].timestamp);
    
    return timeSpan < 5 * 60 * 1000; // Menos de 5 minutos
  }

  /**
   * Gerar relatório de segurança
   */
  async generateSecurityReport(startDate, endDate) {
    try {
      const { data: alerts } = await supabaseAdmin
        .from('security_alerts')
        .select('*')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

      const { data: loginAttempts } = await supabaseAdmin
        .from('security_logs')
        .select('*')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

      const { data: dataAccess } = await supabaseAdmin
        .from('data_access_logs')
        .select('*')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

      return {
        period: { startDate, endDate },
        summary: {
          totalAlerts: alerts?.length || 0,
          criticalAlerts: alerts?.filter(a => a.severity === 'critical').length || 0,
          failedLogins: loginAttempts?.filter(l => !l.success).length || 0,
          dataAccessEvents: dataAccess?.length || 0
        },
        details: {
          alerts,
          loginAttempts,
          dataAccess
        }
      };
    } catch (error) {
      logger.error('Erro ao gerar relatório de segurança:', error);
      throw error;
    }
  }

  /**
   * Limpar logs antigos
   */
  async cleanupOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

      // Limpar logs de segurança
      await supabaseAdmin
        .from('security_logs')
        .delete()
        .lt('timestamp', cutoffDate);

      // Limpar logs de acesso a dados
      await supabaseAdmin
        .from('data_access_logs')
        .delete()
        .lt('timestamp', cutoffDate);

      // Limpar logs de transações (manter por mais tempo)
      const transactionCutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      await supabaseAdmin
        .from('transaction_logs')
        .delete()
        .lt('timestamp', transactionCutoffDate);

      logger.info(`Limpeza de logs concluída. Mantidos logs dos últimos ${daysToKeep} dias.`);
    } catch (error) {
      logger.error('Erro ao limpar logs antigos:', error);
      throw error;
    }
  }
}

module.exports = new SecurityMonitoringService(); 