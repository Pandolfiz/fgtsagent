const Lead = require('../models/lead');
const logger = require('../utils/logger');

class LeadController {
  async list(req, res) {
    try {
      const clientId = req.clientId;
      const leads = await Lead.findByClientId(clientId);
      return res.json({ success: true, data: leads });
    } catch (err) {
      logger.error('LeadController.list error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const lead = await Lead.findById(id);
      console.log('[DEBUG] Lead retornado do banco:', lead);
      console.log('[DEBUG] Comparação de client_id:', {
        leadClientId: lead?.client_id,
        reqClientId: req.clientId,
        leadClientIdType: typeof lead?.client_id,
        reqClientIdType: typeof req.clientId,
        iguais: String(lead?.client_id).trim() === String(req.clientId).trim(),
        url: req.originalUrl
      });
      if (!lead || String(lead.client_id).trim() !== String(req.clientId).trim()) {
        console.log('[DEBUG] Lead não encontrado ou client_id não bate');
        return res.status(404).json({ success: false, message: 'Lead não encontrado' });
      }
      return res.json({ success: true, data: lead.toJSON() });
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
      const lead = new Lead(payload);
      const saved = await lead.save();
      return res.status(201).json({ success: true, data: saved });
    } catch (err) {
      logger.error('LeadController.create error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await Lead.findById(id);
      if (!existing || existing.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Lead não encontrado' });
      }
      ['name','email','phone','status','data'].forEach(field => {
        if (req.body[field] !== undefined) existing[field] = req.body[field];
      });
      const updated = await existing.save();
      return res.json({ success: true, data: updated });
    } catch (err) {
      logger.error('LeadController.update error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const existing = await Lead.findById(id);
      if (!existing || existing.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Lead não encontrado' });
      }
      const { supabaseAdmin } = require('../config/supabase');
      const { error } = await supabaseAdmin
        .from('leads')
        .delete()
        .eq('id', id);
      if (error) {
        logger.error('LeadController.delete error:', error.message || error);
        return res.status(500).json({ success: false, message: error.message });
      }
      return res.json({ success: true, message: 'Lead excluído com sucesso' });
    } catch (err) {
      logger.error('LeadController.delete error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new LeadController(); 