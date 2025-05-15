const logger = require('../utils/logger');
const { supabaseAdmin } = require('../config/supabase');

class KnowledgeBaseController {
  // Lista entradas da base de conhecimento do cliente autenticado
  async list(req, res) {
    try {
      const clientId = req.clientId;
      const { data: entries, error } = await supabaseAdmin
        .from('knowledge_base')
        .select('*')
        .eq('client_id', clientId);
      if (error) throw error;
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
      const { data: entries, error } = await supabaseAdmin
        .from('knowledge_base')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      const entry = entries && entries[0];
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
      const { data: saved, error } = await supabaseAdmin
        .from('knowledge_base')
        .insert([payload])
        .select();
      if (error) throw error;
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
      const { data: entries, error } = await supabaseAdmin
        .from('knowledge_base')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      const existing = entries && entries[0];
      if (!existing || existing.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Entrada não encontrada' });
      }
      const updates = {};
      ['title', 'content', 'tags', 'metadata'].forEach(field => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      });
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('knowledge_base')
        .update(updates)
        .eq('id', id)
        .select();
      if (updateError) throw updateError;
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
      const { data: entries, error } = await supabaseAdmin
        .from('knowledge_base')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      const existing = entries && entries[0];
      if (!existing || existing.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Entrada não encontrada' });
      }
      const { error: deleteError } = await supabaseAdmin
        .from('knowledge_base')
        .delete()
        .eq('id', id);
      if (deleteError) {
        logger.error('KnowledgeBaseController.delete error:', deleteError.message || deleteError);
        return res.status(500).json({ success: false, message: deleteError.message });
      }
      return res.json({ success: true, message: 'Entrada excluída com sucesso' });
    } catch (err) {
      logger.error('KnowledgeBaseController.delete error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new KnowledgeBaseController(); 