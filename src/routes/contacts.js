const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { requireAuth } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');
const { getLastMessage } = require('../repositories/messageRepository');

/**
 * @route GET /api/contacts
 * @desc Obter todos os contatos do usuário autenticado
 * @access Private
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const instanceId = req.query.instance;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    
    logger.info(`[CONTACTS] Página ${page} (${limit} contatos) para usuário: ${userId}${instanceId ? `, instância: ${instanceId}` : ', todas as instâncias'}`);
    logger.info(`[CONTACTS] 🔍 Query parameters recebidos:`, { instanceId, page, limit, userId });
    
    const startTime = Date.now();
    let query = supabase
      .from('contacts')
      .select('*')
      .eq('client_id', userId)
      .order('update_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Se uma instância específica foi solicitada, filtrar diretamente por instance_id
    if (instanceId) {
      query = query.eq('instance_id', instanceId);
      logger.info(`[CONTACTS] Filtrando por instância: ${instanceId}`);
    }
    
    const { data: contactsData, error } = await query;
    
    const duration = Date.now() - startTime;
    logger.info(`Consulta de contatos finalizada em ${duration}ms - ${contactsData?.length || 0} contatos encontrados${instanceId ? ` para instância ${instanceId}` : ''}`);
    
    // Log detalhado dos contatos encontrados
    if (contactsData && contactsData.length > 0) {
      logger.info(`[CONTACTS] Contatos encontrados:`, contactsData.map(c => ({
        id: c.remote_jid,
        name: c.push_name,
        instance_id: c.instance_id
      })));
    }
    
    if (error) {
      logger.error(`Erro ao buscar contatos: ${error.message}`, { error });
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar contatos',
        error: error.message
      });
    }
    
    logger.info(`Contatos encontrados: ${contactsData?.length || 0}`);
    
    // Formatar os contatos para o formato da UI e buscar última mensagem
    const formattedContacts = await Promise.all(contactsData.map(async (contact) => {
      let lastMessage = '';
      let lastMessageTime = null;
      
      try {
        // Buscar a última mensagem do contato
        const lastMsg = await getLastMessage(contact.remote_jid, instanceId);
        if (lastMsg) {
          lastMessage = lastMsg.content || '';
          lastMessageTime = lastMsg.timestamp;
        }
      } catch (error) {
        logger.warn(`[CONTACTS] Erro ao buscar última mensagem para ${contact.remote_jid}: ${error.message}`);
      }
      
      return {
        id: contact.remote_jid,
        name: contact.push_name || 'Contato',
        phone: contact.phone,
        last_message: lastMessage,
        last_message_time: lastMessageTime,
        unread_count: 0,
        online: false,
        user_id: userId,
        remote_jid: contact.remote_jid,
        client_id: contact.client_id,
        agent_state: contact.agent_state || 'human',
        lead_id: contact.lead_id,
        instance_id: contact.instance_id || instanceId || null // Usar instance_id do contato ou do filtro
      };
    }));
    
    // Verificar se há mais páginas
    const hasMore = formattedContacts.length === limit;
    
    logger.info(`[CONTACTS] ✅ Página ${page}: ${formattedContacts.length} contatos${instanceId ? ` para instância ${instanceId}` : ' (todas as instâncias)'}, hasMore: ${hasMore}`);
    
    return res.json({
      success: true,
      contacts: formattedContacts,
      pagination: {
        page,
        limit,
        hasMore,
        total: formattedContacts.length
      },
      hasMore // Compatibilidade com frontend
    });
  } catch (error) {
    logger.error('Erro ao processar solicitação de contatos:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno ao processar solicitação',
      error: error.message
    });
  }
});

/**
 * @route GET /api/contacts/count
 * @desc Obter contagem de contatos (usado para diagnóstico)
 * @access Private
 */
router.get('/count', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('count');
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
    
    return res.json({
      success: true,
      count: data[0]?.count || 0
    });
  } catch (error) {
    logger.error('Erro ao obter contagem de contatos:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno ao processar solicitação',
      error: error.message
    });
  }
});

/**
 * @route POST /api/contacts
 * @desc Criar um novo contato
 * @access Private
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nome e telefone são obrigatórios' 
      });
    }
    
    // Formato padrão para IDs de conversa (ajuste conforme sua lógica atual)
    const conversationId = `5527997186150_${phone}`;
    
    const newContact = {
      remote_jid: conversationId,
      push_name: name,
      phone: phone,
      agent_status: 'full',
      agent_state: 'ai',
      client_id: userId
    };
    
    logger.info(`Criando novo contato: ${name} (${phone}) para usuário ${userId}`);
    
    const { data, error } = await supabase
      .from('contacts')
      .insert(newContact)
      .select();
    
    if (error) {
      logger.error(`Erro ao criar contato: ${error.message}`, { error });
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao criar contato',
        error: error.message
      });
    }
    
    // Formatar o contato para o formato da UI e buscar última mensagem
    let lastMessage = '';
    let lastMessageTime = null;
    
    try {
      // Buscar a última mensagem do contato
      const lastMsg = await getLastMessage(conversationId, instanceId);
      if (lastMsg) {
        lastMessage = lastMsg.content || '';
        lastMessageTime = lastMsg.timestamp;
      }
    } catch (error) {
      logger.warn(`[CONTACTS] Erro ao buscar última mensagem para ${conversationId}: ${error.message}`);
    }
    
    const formattedContact = {
      id: conversationId,
      name: name,
      phone: phone,
      remote_jid: conversationId,
      last_message: lastMessage,
      last_message_time: lastMessageTime,
      unread_count: 0,
      online: false,
      user_id: userId,
      client_id: userId
    };
    
    logger.info(`Contato criado com sucesso: ${name}`);
    
    return res.status(201).json({
      success: true,
      contact: formattedContact
    });
  } catch (error) {
    logger.error('Erro ao processar criação de contato:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno ao processar solicitação',
      error: error.message
    });
  }
});

/**
 * @route POST /api/contacts/:id/toggle-ai
 * @desc Alternar estado do agente AI para um contato
 * @access Private
 */
router.post('/:id/toggle-ai', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    
    logger.info(`[TOGGLE-AI] Alternando estado AI para contato: ${contactId}, usuário: ${userId}`);
    
    // Buscar o contato atual
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('remote_jid', contactId)
      .eq('client_id', userId)
      .single();
    
    if (fetchError) {
      logger.error(`[TOGGLE-AI] Erro ao buscar contato: ${fetchError.message}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Contato não encontrado',
        error: fetchError.message
      });
    }
    
    if (!contact) {
      logger.warn(`[TOGGLE-AI] Contato não encontrado: ${contactId}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Contato não encontrado'
      });
    }
    
    // Alternar o estado do agente
    const currentState = contact.agent_state || 'human';
    const newState = currentState === 'ai' ? 'human' : 'ai';
    
    logger.info(`[TOGGLE-AI] Alternando de '${currentState}' para '${newState}'`);
    
    // Atualizar o contato
    const { data: updatedContact, error: updateError } = await supabase
      .from('contacts')
      .update({ 
        agent_state: newState,
        update_at: new Date().toISOString()
      })
      .eq('remote_jid', contactId)
      .eq('client_id', userId)
      .select()
      .single();
    
    if (updateError) {
      logger.error(`[TOGGLE-AI] Erro ao atualizar contato: ${updateError.message}`);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao atualizar estado do agente',
        error: updateError.message
      });
    }
    
    logger.info(`[TOGGLE-AI] ✅ Estado AI atualizado com sucesso para '${newState}'`);
    
    return res.json({
      success: true,
      message: `Agente AI ${newState === 'ai' ? 'ativado' : 'desativado'}`,
      contact: {
        id: updatedContact.remote_jid,
        agent_state: updatedContact.agent_state,
        name: updatedContact.push_name
      }
    });
    
  } catch (error) {
    logger.error(`[TOGGLE-AI] Erro interno: ${error.message}`);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno ao processar solicitação',
      error: error.message
    });
  }
});

module.exports = router; 