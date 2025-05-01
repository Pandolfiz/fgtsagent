const { supabaseAdmin } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class Client {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone;
    this.status = data.status;
    this.cnpj = data.cnpj;
    this.subscription_plan = data.subscription_plan;
    this.evolution_customer_id = data.evolution_customer_id;
    this.metadata = data.metadata || {};
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  async save() {
    try {
      const payload = {
        id: this.id,
        name: this.name,
        email: this.email,
        phone: this.phone,
        status: this.status,
        cnpj: this.cnpj,
        subscription_plan: this.subscription_plan,
        evolution_customer_id: this.evolution_customer_id,
        metadata: this.metadata,
        created_at: this.created_at,
        updated_at: this.updated_at
      };
      const { data, error } = await supabaseAdmin
        .from('clients')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) {
        logger.error('Erro ao salvar cliente:', error.message || error);
        throw error;
      }
      return data;
    } catch (err) {
      logger.error('Exception em Client.save():', err.message || err);
      throw err;
    }
  }

  static async findById(id) {
    try {
      const { data, error } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        logger.warn(`Client.findById: não encontrado ${id}`);
        return null;
      }
      return new Client(data);
    } catch (err) {
      logger.error('Exception em Client.findById():', err.message || err);
      return null;
    }
  }

  static async findAll() {
    try {
      const { data, error } = await supabaseAdmin
        .from('clients')
        .select('*');
      if (error) {
        logger.error('Client.findAll error:', error.message || error);
        return [];
      }
      return data.map(d => new Client(d));
    } catch (err) {
      logger.error('Exception em Client.findAll():', err.message || err);
      return [];
    }
  }
}

module.exports = Client; 