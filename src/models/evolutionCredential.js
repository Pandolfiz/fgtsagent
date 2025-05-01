const { supabaseAdmin } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class EvolutionCredential {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.client_id = data.client_id;
    this.phone = data.phone;
    this.instance_name = data.instance_name;
    this.partner_secret = data.partner_secret;
    this.metadata = data.metadata || {};
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
    this.agent_name = data.agent_name;
  }

  async save() {
    try {
      const payload = {
        id: this.id,
        client_id: this.client_id,
        phone: this.phone,
        instance_name: this.instance_name,
        partner_secret: this.partner_secret,
        metadata: this.metadata,
        agent_name: this.agent_name,
        created_at: this.created_at,
        updated_at: this.updated_at
      };
      const { data, error } = await supabaseAdmin
        .from('evolution_credentials')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) {
        logger.error('Erro ao salvar EvolutionCredential:', error.message || error);
        throw error;
      }
      return data;
    } catch (err) {
      logger.error('Exception em EvolutionCredential.save():', err.message || err);
      throw err;
    }
  }

  static async findById(id) {
    try {
      const { data, error } = await supabaseAdmin
        .from('evolution_credentials')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        logger.warn(`EvolutionCredential.findById: não encontrado ${id}`);
        return null;
      }
      return new EvolutionCredential(data);
    } catch (err) {
      logger.error('Exception em EvolutionCredential.findById():', err.message || err);
      return null;
    }
  }

  static async findByClientId(clientId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('evolution_credentials')
        .select('*')
        .eq('client_id', clientId)
        .single();
      if (error) {
        logger.warn(`EvolutionCredential.findByClientId: não encontrado para clientId ${clientId}`);
        return null;
      }
      return new EvolutionCredential(data);
    } catch (err) {
      logger.error('Exception em EvolutionCredential.findByClientId():', err.message || err);
      return null;
    }
  }

  static async findAll() {
    try {
      const { data, error } = await supabaseAdmin
        .from('evolution_credentials')
        .select('*');
      if (error) {
        logger.error('EvolutionCredential.findAll error:', error.message || error);
        return [];
      }
      return data.map(d => new EvolutionCredential(d));
    } catch (err) {
      logger.error('Exception em EvolutionCredential.findAll():', err.message || err);
      return [];
    }
  }

  static async findAllByClientId(clientId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('evolution_credentials')
        .select('*')
        .eq('client_id', clientId);
      if (error) {
        logger.warn(`EvolutionCredential.findAllByClientId: erro ao buscar para clientId ${clientId}`);
        return [];
      }
      return data.map(d => new EvolutionCredential(d));
    } catch (err) {
      logger.error(`Exception em EvolutionCredential.findAllByClientId(): ${err.message}`);
      return [];
    }
  }
}

module.exports = EvolutionCredential; 