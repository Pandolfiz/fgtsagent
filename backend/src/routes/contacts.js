const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseClient');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route GET /api/contacts
 * @desc Obter todos os contatos do usuário autenticado
 * @access Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    logger.info(`Buscando contatos para usuário: ${userId}`);
    
    const startTime = Date.now();
    const { data: contactsData, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('client_id', userId);
    
    const duration = Date.now() - startTime;
    logger.info(`Consulta de contatos finalizada em ${duration}ms`);
    
    if (error) {
      logger.error(`Erro ao buscar contatos: ${error.message}`, { error });
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar contatos',
        error: error.message
      });
    }
    
    logger.info(`Contatos encontrados: ${contactsData?.length || 0}`);
    
    // Formatar os contatos para o formato da UI
    const formattedContacts = contactsData.map(contact => ({
      id: contact.remote_jid,
      name: contact.push_name || 'Contato',
      phone: contact.phone,
      last_message: '',
      last_message_time: null,
      unread_count: 0,
      online: false,
      user_id: userId,
      remote_jid: contact.remote_jid,
      client_id: contact.client_id
    }));
    
    return res.json({
      success: true,
      contacts: formattedContacts
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
router.get('/count', authMiddleware, async (req, res) => {
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
router.post('/', authMiddleware, async (req, res) => {
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
    
    // Formatar o contato para o formato da UI
    const formattedContact = {
      id: conversationId,
      name: name,
      phone: phone,
      remote_jid: conversationId,
      last_message: '',
      last_message_time: null,
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

module.exports = router; 