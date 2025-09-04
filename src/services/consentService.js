const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

class ConsentService {
  /**
   * Registrar consentimento de um usuário
   */
  async logConsent(userId, consentType, granted, options = {}) {
    try {
      const {
        ipAddress = null,
        userAgent = null,
        consentVersion = '1.0',
        consentText = null
      } = options;

      const { data, error } = await supabaseAdmin.rpc('log_consent', {
        p_user_id: userId,
        p_consent_type: consentType,
        p_granted: granted,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_consent_version: consentVersion,
        p_consent_text: consentText
      });

      if (error) {
        logger.error('Erro ao registrar consentimento:', error);
        throw new Error(`Falha ao registrar consentimento: ${error.message}`);
      }

      logger.info(`Consentimento registrado: usuário=${userId}, tipo=${consentType}, concedido=${granted}`);
      return data;
    } catch (error) {
      logger.error('Erro no serviço de consentimento:', error);
      throw error;
    }
  }

  /**
   * Obter histórico de consentimentos de um usuário
   */
  async getUserConsentHistory(userId) {
    try {
      const { data, error } = await supabaseAdmin.rpc('get_user_consent_history', {
        p_user_id: userId
      });

      if (error) {
        logger.error('Erro ao obter histórico de consentimentos:', error);
        throw new Error(`Falha ao obter histórico: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('Erro ao obter histórico de consentimentos:', error);
      throw error;
    }
  }

  /**
   * Verificar consentimento atual de um usuário
   */
  async getCurrentConsent(userId, consentType) {
    try {
      const { data, error } = await supabaseAdmin.rpc('get_current_consent', {
        p_user_id: userId,
        p_consent_type: consentType
      });

      if (error) {
        logger.error('Erro ao verificar consentimento atual:', error);
        throw new Error(`Falha ao verificar consentimento: ${error.message}`);
      }

      return data || false;
    } catch (error) {
      logger.error('Erro ao verificar consentimento atual:', error);
      throw error;
    }
  }

  /**
   * Registrar múltiplos consentimentos (para cadastro)
   */
  async logMultipleConsents(userId, consents, options = {}) {
    try {
      const results = [];
      
      for (const [consentType, granted] of Object.entries(consents)) {
        const result = await this.logConsent(userId, consentType, granted, options);
        results.push({ consentType, granted, logId: result });
      }

      logger.info(`Múltiplos consentimentos registrados: usuário=${userId}, total=${results.length}`);
      return results;
    } catch (error) {
      logger.error('Erro ao registrar múltiplos consentimentos:', error);
      throw error;
    }
  }

  /**
   * Registrar consentimento de cookies
   */
  async logCookieConsent(userId, cookieConsent, options = {}) {
    try {
      const consents = {};
      
      // Mapear tipos de cookies para tipos de consentimento
      if (cookieConsent.essential !== undefined) {
        consents['cookies_essential'] = cookieConsent.essential;
      }
      if (cookieConsent.analytics !== undefined) {
        consents['cookies_analytics'] = cookieConsent.analytics;
      }
      if (cookieConsent.marketing !== undefined) {
        consents['cookies_marketing'] = cookieConsent.marketing;
      }
      if (cookieConsent.preferences !== undefined) {
        consents['cookies_preferences'] = cookieConsent.preferences;
      }

      return await this.logMultipleConsents(userId, consents, {
        ...options,
        consentVersion: '1.0',
        consentText: 'Configurações de cookies atualizadas'
      });
    } catch (error) {
      logger.error('Erro ao registrar consentimento de cookies:', error);
      throw error;
    }
  }

  /**
   * Verificar se usuário tem todos os consentimentos obrigatórios
   */
  async hasRequiredConsents(userId) {
    try {
      const requiredConsents = [
        'terms',
        'privacy', 
        'data_processing',
        'age'
      ];

      const results = await Promise.all(
        requiredConsents.map(consentType => 
          this.getCurrentConsent(userId, consentType)
        )
      );

      const hasAllRequired = results.every(consent => consent === true);
      
      logger.info(`Verificação de consentimentos obrigatórios: usuário=${userId}, tem_todos=${hasAllRequired}`);
      
      return hasAllRequired;
    } catch (error) {
      logger.error('Erro ao verificar consentimentos obrigatórios:', error);
      throw error;
    }
  }

  /**
   * Revogar consentimento (marcar como negado)
   */
  async revokeConsent(userId, consentType, options = {}) {
    try {
      const result = await this.logConsent(userId, consentType, false, {
        ...options,
        consentText: 'Consentimento revogado pelo usuário'
      });

      logger.info(`Consentimento revogado: usuário=${userId}, tipo=${consentType}`);
      return result;
    } catch (error) {
      logger.error('Erro ao revogar consentimento:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas de consentimentos (para administradores)
   */
  async getConsentStatistics() {
    try {
      const { data, error } = await supabaseAdmin
        .from('consent_logs')
        .select('consent_type, granted, timestamp')
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Últimos 30 dias

      if (error) {
        logger.error('Erro ao obter estatísticas de consentimentos:', error);
        throw new Error(`Falha ao obter estatísticas: ${error.message}`);
      }

      // Processar estatísticas
      const stats = {};
      data.forEach(log => {
        if (!stats[log.consent_type]) {
          stats[log.consent_type] = { granted: 0, denied: 0, total: 0 };
        }
        stats[log.consent_type].total++;
        if (log.granted) {
          stats[log.consent_type].granted++;
        } else {
          stats[log.consent_type].denied++;
        }
      });

      return stats;
    } catch (error) {
      logger.error('Erro ao obter estatísticas de consentimentos:', error);
      throw error;
    }
  }
}

module.exports = new ConsentService();