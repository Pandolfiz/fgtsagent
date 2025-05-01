const KnowledgeBase = require('../models/knowledgeBase');
const logger = require('../utils/logger');

class KnowledgeBaseController {
  // Lista entradas da base de conhecimento do cliente autenticado
  async list(req, res) {
    try {
      const clientId = req.clientId;
      const entries = await KnowledgeBase.findByClientId(clientId);
      // Corrigir codificação dos títulos (Latin1 para UTF-8)
      entries.forEach(entry => {
        if (entry.title) {
          entry.title = Buffer.from(entry.title, 'latin1').toString('utf8');
        }
      });
      // Filtrar títulos duplicados
      const uniqueMap = new Map();
      entries.forEach(entry => {
        if (!uniqueMap.has(entry.title)) {
          uniqueMap.set(entry.title, entry);
        }
      });
      const uniqueEntries = Array.from(uniqueMap.values());
      return res.json({ success: true, data: uniqueEntries });
    } catch (err) {
      logger.error('KnowledgeBaseController.list error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Busca por ID garantindo pertencimento ao cliente
  async getById(req, res) {
    try {
      const { id } = req.params;
      const entry = await KnowledgeBase.findById(id);
      if (!entry || entry.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Entrada não encontrada' });
      }
      return res.json({ success: true, data: entry });
    } catch (err) {
      logger.error('KnowledgeBaseController.getById error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Cria nova entrada na base de conhecimento para o cliente autenticado
  async create(req, res) {
    try {
      const payload = {
        client_id: req.clientId,
        title: req.body.title,
        content: req.body.content,
        tags: req.body.tags || [],
        metadata: req.body.metadata || {}
      };
      const entry = new KnowledgeBase(payload);
      const saved = await entry.save();
      return res.status(201).json({ success: true, data: saved });
    } catch (err) {
      logger.error('KnowledgeBaseController.create error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Atualiza entrada existente
  async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await KnowledgeBase.findById(id);
      if (!existing || existing.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Entrada não encontrada' });
      }
      ['title', 'content', 'tags', 'metadata'].forEach(field => {
        if (req.body[field] !== undefined) existing[field] = req.body[field];
      });
      const updated = await existing.save();
      return res.json({ success: true, data: updated });
    } catch (err) {
      logger.error('KnowledgeBaseController.update error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Exclui entrada da base de conhecimento do cliente autenticado
  async delete(req, res) {
    try {
      const { id } = req.params;
      const existing = await KnowledgeBase.findById(id);
      if (!existing || existing.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Entrada não encontrada' });
      }
      const { supabaseAdmin } = require('../config/supabase');
      const { error } = await supabaseAdmin
        .from('knowledge_base')
        .delete()
        .eq('id', id);
      if (error) {
        logger.error('KnowledgeBaseController.delete error:', error.message || error);
        return res.status(500).json({ success: false, message: error.message });
      }
      return res.json({ success: true, message: 'Entrada excluída com sucesso' });
    } catch (err) {
      logger.error('KnowledgeBaseController.delete error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new KnowledgeBaseController(); 