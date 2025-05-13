const { supabaseAdmin } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class Lead {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.client_id = data.client_id;
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone;
    this.status = data.status;
    this.cpf = (data.cpf && String(data.cpf).trim() !== '' ? data.cpf : (data.data && data.data.cpf) || null);
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[DEBUG] Valor do CPF no construtor Lead:`, { cpf: this.cpf, dataCpf: data.data?.cpf, rawCpf: data.cpf });
    }
    this.data = data.data || {};
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  async save() {
    try {
      const payload = {
        id: this.id,
        client_id: this.client_id,
        name: this.name,
        email: this.email,
        phone: this.phone,
        status: this.status,
        data: this.data,
        created_at: this.created_at,
        updated_at: this.updated_at
      };
      const { data, error } = await supabaseAdmin
        .from('leads')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) {
        logger.error('Erro ao salvar Lead:', error.message || error);
        throw error;
      }
      return data;
    } catch (err) {
      logger.error('Exception em Lead.save():', err.message || err);
      throw err;
    }
  }

  static async findById(id) {
    try {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        logger.warn(`Lead.findById: não encontrado ${id}`);
        return null;
      }
      logger.info('[DEBUG] Lead encontrado no banco:', data);
      return new Lead(data);
    } catch (err) {
      logger.error('Exception em Lead.findById():', err.message || err);
      return null;
    }
  }

  static async findByClientId(clientId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('client_id', clientId);
      if (error) {
        logger.warn(`Lead.findByClientId: erro ao buscar para clientId ${clientId}`);
        return [];
      }
      return data.map(d => new Lead(d));
    } catch (err) {
      logger.error('Exception em Lead.findByClientId():', err.message || err);
      return [];
    }
  }

  static async findAll() {
    try {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select('*');
      if (error) {
        logger.error('Lead.findAll error:', error.message || error);
        return [];
      }
      return data.map(d => new Lead(d));
    } catch (err) {
      logger.error('Exception em Lead.findAll():', err.message || err);
      return [];
    }
  }

  toJSON() {
    return {
      id: this.id,
      client_id: this.client_id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      status: this.status,
      cpf: this.cpf,
      data: this.data,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Lead; 