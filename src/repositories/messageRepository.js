const { supabaseAdmin } = require('../config/supabase');

async function saveMessage({ id, conversation_id, sender_id, recipient_id, content, metadata, timestamp, status, instanceId }) {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert([{ id, conversation_id, sender_id, recipient_id, content, metadata, timestamp, status, instance_id: instanceId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Busca histórico de mensagens para uma conversa e instância opcional
 */
async function getHistory(conversationId, instanceId) {
  // Construir consulta base
  let query = supabaseAdmin
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true });
  // Filtrar por instanceId se fornecido
  if (instanceId) {
    query = query.contains('metadata', { instanceId });
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Lista conversas únicas para um usuário e instância opcional
 */
async function getConversationsForUser(userId, instanceId) {
  // Construir consulta base
  let query = supabaseAdmin
    .from('messages')
    .select('conversation_id', { distinct: true })
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
  // Filtrar por instanceId se fornecido
  if (instanceId) {
    query = query.contains('metadata', { instanceId });
  }
  const { data, error } = await query;
  if (error) throw error;
  return data.map(item => item.conversation_id);
}

module.exports = {
  saveMessage,
  getHistory,
  getConversationsForUser
}; 