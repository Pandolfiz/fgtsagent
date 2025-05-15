const logger = require('../utils/logger');
const { supabaseAdmin } = require('../config/supabase');

class LeadController {
  async list(req, res) {
    try {
      const clientId = req.clientId;
      const { data: leads, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('client_id', clientId);
      if (error) throw error;
      return res.json({ success: true, data: leads });
    } catch (err) {
      logger.error('LeadController.list error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const { data: lead, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      if (!lead || String(lead.client_id).trim() !== String(req.clientId).trim()) {
        console.log('[DEBUG] Lead não encontrado ou client_id não bate');
        return res.status(404).json({ success: false, message: 'Lead não encontrado' });
      }
      return res.json({ success: true, data: lead });
    } catch (err) {
      logger.error('LeadController.getById error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create(req, res) {
    try {
      const payload = {
        client_id: req.clientId,
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        status: req.body.status,
        data: req.body.data || {}
      };
      const { data: saved, error } = await supabaseAdmin
        .from('leads')
        .insert([payload])
        .select();
      if (error) throw error;
      return res.status(201).json({ success: true, data: saved });
    } catch (err) {
      logger.error('LeadController.create error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { data: existing, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      if (!existing || existing.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Lead não encontrado' });
      }
      ['name','email','phone','status','data'].forEach(field => {
        if (req.body[field] !== undefined) existing[field] = req.body[field];
      });
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('leads')
        .update(existing)
        .eq('id', id)
        .select();
      if (updateError) throw updateError;
      return res.json({ success: true, data: updated });
    } catch (err) {
      logger.error('LeadController.update error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const { data: existing, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      if (!existing || existing.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Lead não encontrado' });
      }
      const { error: deleteError } = await supabaseAdmin
        .from('leads')
        .delete()
        .eq('id', id);
      if (deleteError) {
        logger.error('LeadController.delete error:', deleteError.message || deleteError);
        return res.status(500).json({ success: false, message: deleteError.message });
      }
      return res.json({ success: true, message: 'Lead excluído com sucesso' });
    } catch (err) {
      logger.error('LeadController.delete error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new LeadController(); 