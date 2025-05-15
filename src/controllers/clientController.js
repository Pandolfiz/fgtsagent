const logger = require('../utils/logger');
const { supabaseAdmin } = require('../config/supabase');

class ClientController {
  async list(req, res) {
    try {
      // Buscar clientes diretamente no Supabase
      const { data: clients, error } = await supabaseAdmin
        .from('clients')
        .select('*');
      if (error) throw error;
      return res.json({ success: true, data: clients });
    } catch (err) {
      logger.error('ClientController.list error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const client = await Client.findById(id);
      if (!client) {
        return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
      }
      // Verifica se é o próprio cliente ou admin
      const currentClientId = req.user.app_metadata.client_id;
      const isAdmin = req.user.app_metadata.role === 'admin';
      if (client.id !== currentClientId && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Sem permissão para acessar este cliente' });
      }
      return res.json({ success: true, data: client });
    } catch (err) {
      logger.error('ClientController.getById error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create(req, res) {
    try {
      const isAdmin = req.user.app_metadata.role === 'admin';
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Somente admin pode criar clientes' });
      }
      const payload = req.body;
      const client = new Client(payload);
      const saved = await client.save();
      return res.status(201).json({ success: true, data: saved });
    } catch (err) {
      logger.error('ClientController.create error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const isAdmin = req.user.app_metadata.role === 'admin';
      const currentClientId = req.user.app_metadata.client_id;
      if (currentClientId !== id && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Sem permissão para atualizar este cliente' });
      }
      const existing = await Client.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
      }
      // Merge updates
      Object.assign(existing, req.body);
      const updated = await existing.save();
      return res.json({ success: true, data: updated });
    } catch (err) {
      logger.error('ClientController.update error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const isAdmin = req.user.app_metadata.role === 'admin';
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Somente admin pode excluir clientes' });
      }
      const { error } = await supabaseAdmin
        .from('clients')
        .delete()
        .eq('id', id);
      if (error) {
        logger.error('ClientController.delete error:', error.message || error);
        return res.status(500).json({ success: false, message: error.message });
      }
      return res.json({ success: true, message: 'Cliente excluído com sucesso' });
    } catch (err) {
      logger.error('ClientController.delete exception:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new ClientController(); 