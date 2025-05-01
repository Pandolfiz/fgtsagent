const { supabaseAdmin } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class Proposal {
  constructor(data) {
    this.proposal_id = data.proposal_id;
    this.lead_id = data.lead_id;
    this.value = data.value;
    this.status = data.status || 'pending';
    this.data = data.data || {};
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  async save() {
    try {
      const payload = {
        proposal_id: this.proposal_id,
        lead_id: this.lead_id,
        value: this.value,
        status: this.status,
        data: this.data,
        created_at: this.created_at,
        updated_at: this.updated_at
      };
      const { data, error } = await supabaseAdmin
        .from('proposals')
        .upsert(payload, { onConflict: 'proposal_id' })
        .select()
        .single();
      if (error) {
        logger.error('Erro ao salvar Proposal:', error.message || error);
        throw error;
      }
      return data;
    } catch (err) {
      logger.error('Exception em Proposal.save():', err.message || err);
      throw err;
    }
  }

  static async findById(proposal_id) {
    try {
      const { data, error } = await supabaseAdmin
        .from('proposals')
        .select('*')
        .eq('proposal_id', proposal_id)
        .single();
      if (error) {
        logger.warn(`Proposal.findById: não encontrada ${proposal_id}`);
        return null;
      }
      return new Proposal(data);
    } catch (err) {
      logger.error('Exception em Proposal.findById():', err.message || err);
      return null;
    }
  }

  static async findAllByLeadId(leadId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('proposals')
        .select('*')
        .eq('lead_id', leadId);
      if (error) {
        logger.warn(`Proposal.findAllByLeadId: erro ao buscar para leadId ${leadId}`);
        return [];
      }
      return data.map(d => new Proposal(d));
    } catch (err) {
      logger.error('Exception em Proposal.findAllByLeadId():', err.message || err);
      return [];
    }
  }

  async cancel() {
    try {
      this.status = 'cancelled';
      this.updated_at = new Date().toISOString();
      return await this.save();
    } catch (err) {
      logger.error('Exception em Proposal.cancel():', err.message || err);
      throw err;
    }
  }
}

module.exports = Proposal; 