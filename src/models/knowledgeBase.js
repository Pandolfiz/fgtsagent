const { supabaseAdmin } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class KnowledgeBase {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.client_id = data.client_id;
    this.title = data.title;
    this.content = data.content;
    this.tags = data.tags || [];
    this.metadata = data.metadata || {};
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  async save() {
    try {
      const payload = {
        id: this.id,
        client_id: this.client_id,
        title: this.title,
        content: this.content,
        tags: this.tags,
        metadata: this.metadata,
        created_at: this.created_at,
        updated_at: this.updated_at
      };
      const { data, error } = await supabaseAdmin
        .from('knowledge_base')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) {
        logger.error('Erro ao salvar KnowledgeBase:', error.message || error);
        throw error;
      }
      return data;
    } catch (err) {
      logger.error('Exception em KnowledgeBase.save():', err.message || err);
      throw err;
    }
  }

  static async findById(id) {
    try {
      const { data, error } = await supabaseAdmin
        .from('knowledge_base')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        logger.warn(`KnowledgeBase.findById: não encontrado ${id}`);
        return null;
      }
      return new KnowledgeBase(data);
    } catch (err) {
      logger.error('Exception em KnowledgeBase.findById():', err.message || err);
      return null;
    }
  }

  static async findByClientId(clientId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('knowledge_base')
        .select('*')
        .eq('client_id', clientId);
      if (error) {
        logger.warn(`KnowledgeBase.findByClientId: erro ao buscar para clientId ${clientId}`);
        return [];
      }
      return data.map(d => new KnowledgeBase(d));
    } catch (err) {
      logger.error('Exception em KnowledgeBase.findByClientId():', err.message || err);
      return [];
    }
  }

  static async findAll() {
    try {
      const { data, error } = await supabaseAdmin
        .from('knowledge_base')
        .select('*');
      if (error) {
        logger.error('KnowledgeBase.findAll error:', error.message || error);
        return [];
      }
      return data.map(d => new KnowledgeBase(d));
    } catch (err) {
      logger.error('Exception em KnowledgeBase.findAll():', err.message || err);
      return [];
    }
  }
}

module.exports = KnowledgeBase; 