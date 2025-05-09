const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../config/supabase');
const messageRepository = require('../repositories/messageRepository');
const EvolutionService = require('./evolutionService');
const config = require('../config');
const EvolutionCredential = require('../models/evolutionCredential');
const { AppError } = require('../utils/errors');

const emitter = new EventEmitter();

async function handleWebhookEvent(body) {
  const event = body.event;
  let messagesList = [];
  if (event === 'MESSAGES_UPSERT') {
    const data = body.data;
    messagesList = Array.isArray(data.messages) ? data.messages : [data];
  } else if (event === 'messages.set') {
    // Novo formato: body.data é array de mensagens
    messagesList = Array.isArray(body.data) ? body.data : [body.data];
  } else {
    console.warn(`Evento de webhook ignorado: ${event}`);
    return;
  }
  for (const msg of messagesList) {
    // Gerar sempre um UUID para o id da mensagem
    const id = uuidv4();
    // Extrair identificação da conversa do payload (JID remoto)
    const remoteJid = msg.key?.remoteJid || msg.message?.conversation || '';
    const conversation_id = remoteJid;
    // Buscar client_id associado à instância para usar como sender e recipient
    const { data: cred, error: credError } = await supabaseAdmin
      .from('evolution_credentials')
      .select('client_id')
      .eq('id', msg.instanceId)
      .single();
    if (credError) throw credError;
    const clientId = cred.client_id;
    // Definir remetente e destinatário conforme origem da mensagem
    const fromMe = msg.key?.fromMe;
    const sender_id = fromMe ? clientId : remoteJid;
    const recipient_id = fromMe ? remoteJid : clientId;
    const content = msg.body || msg.text || msg.message?.conversation || '';
    const timestamp = msg.timestamp
      ? new Date(msg.timestamp)
      : msg.messageTimestamp
      ? new Date(msg.messageTimestamp * 1000)
      : new Date();
    const metadata = msg;
    
    // Determinar o role da mensagem respeitando qualquer valor já definido
    const role = msg.role || (fromMe ? 'ME' : 'USER');
    
    // Registrar para debug
    console.log(`Processando mensagem do webhook: fromMe=${fromMe}, content=${content.substring(0, 30)}..., role=${role}, sender_id=${sender_id}, recipient_id=${recipient_id}`);
    
    const saved = await messageRepository.saveMessage({
      id,
      conversation_id,
      sender_id,
      recipient_id,
      content,
      metadata,
      timestamp,
      status: 'received',
      instanceId: msg.instanceId,
      role // Definir explicitamente o role
    });
    emitter.emit('message', saved);
  }
}

/**
 * Envia mensagem via instância selecionada
 */
async function handleOutgoing({ to, content, conversationId, senderId, instanceId, role }) {
  // Validar instância
  if (!instanceId) {
    throw new AppError('Instância é obrigatória para enviar mensagem', 400);
  }
  // Buscar credencial da instância
  const cred = await EvolutionCredential.findById(instanceId);
  // Logar credencial para debug
  console.log('[DEBUG] Credencial carregada:', cred);
  // NOVA VALIDAÇÃO: garantir que o Nome do Agente é válido
  if (!cred.instance_name || cred.instance_name === 'chat') {
    throw new AppError(`Nome do Agente inválido: '${cred.instance_name}'. Selecione uma instância válida nas credenciais Evolution.`, 400);
  }
  // Não enviar mais para Evolution, apenas registrar localmente
  const saved = await messageRepository.saveMessage({
    id: uuidv4(),
    conversation_id: conversationId,
    sender_id: senderId,
    recipient_id: to,
    content,
    metadata: { instanceId },
    timestamp: new Date(),
    status: 'sent',
    instanceId,
    role: role || 'ME' // Usar o role fornecido ou definir 'ME' como padrão
  });
  emitter.emit('message', saved);
  return saved;
}

/**
 * Busca histórico de mensagens para uma conversa e instância opcional
 */
async function getHistory(conversationId, instanceId) {
  return await messageRepository.getHistory(conversationId, instanceId);
}

/**
 * Busca a última mensagem de uma conversa específica
 */
async function getLastMessage(conversationId, instanceId) {
  return await messageRepository.getLastMessage(conversationId, instanceId);
}

/**
 * Lista conversas únicas para um usuário e instância opcional
 */
async function getConversationsForUser(userId, instanceId) {
  return await messageRepository.getConversationsForUser(userId, instanceId);
}

function onMessage(listener) {
  emitter.on('message', listener);
}

function offMessage(listener) {
  emitter.off('message', listener);
}

module.exports = {
  handleWebhookEvent,
  handleOutgoing,
  getHistory,
  getLastMessage,
  getConversationsForUser,
  onMessage,
  offMessage
}; 