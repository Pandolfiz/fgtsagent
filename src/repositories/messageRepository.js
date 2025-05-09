const { supabaseAdmin } = require('../config/supabase');

async function saveMessage({ id, conversation_id, sender_id, recipient_id, content, metadata, timestamp, status, instanceId, role }) {
  // Forçar sempre um dos três valores aceitos, independente do sender_id
  let validatedRole = role;
  
  // Se role não estiver definido, usar from_me do metadata como critério
  if (!validatedRole) {
    // Tentar inferir from_me do metadata
    const fromMe = metadata?.fromMe || metadata?.key?.fromMe || status === 'sent';
    validatedRole = fromMe ? 'ME' : 'USER';
  }
  
  // Garantir que seja um valor aceito mesmo se role for definido com valor inválido
  if (!['ME', 'AI', 'USER'].includes(validatedRole)) {
    validatedRole = 'ME'; // Valor padrão
  }
  
  console.log(`[messageRepository] Salvando mensagem: role original=${role}, role validado=${validatedRole}, sender_id=${sender_id}, from_me=${metadata?.fromMe || metadata?.key?.fromMe || status === 'sent'}`);
  
  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert([{ 
      id, 
      conversation_id, 
      sender_id, 
      recipient_id, 
      content, 
      metadata, 
      timestamp, 
      status, 
      instance_id: instanceId,
      role: validatedRole // Usar o role validado
    }])
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
    .select('id, conversation_id, sender_id, recipient_id, content, metadata, timestamp, status, instance_id, role')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true });

  // Adicionar filtro por instância se fornecido
  if (instanceId) {
    query = query.eq('instance_id', instanceId);
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

/**
 * Busca a última mensagem de uma conversa específica
 */
async function getLastMessage(conversationId, instanceId) {
  console.log(`[messageRepository] Buscando última mensagem para conversa: ${conversationId}`);
  
  // Construir consulta base
  let query = supabaseAdmin
    .from('messages')
    .select('id, conversation_id, sender_id, recipient_id, content, metadata, timestamp, status, instance_id, role')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: false })
    .limit(1);

  // Adicionar filtro por instância se fornecido
  if (instanceId) {
    query = query.eq('instance_id', instanceId);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error(`[messageRepository] Erro ao buscar última mensagem para ${conversationId}:`, error);
    throw error;
  }
  
  console.log(`[messageRepository] Resultado para ${conversationId}: ${data.length > 0 ? 'Mensagem encontrada' : 'Nenhuma mensagem'}`);
  if (data.length > 0) {
    console.log(`[messageRepository] Timestamp: ${data[0].timestamp}, ID: ${data[0].id}`);
  }
  
  return data.length > 0 ? data[0] : null;
}

module.exports = {
  saveMessage,
  getHistory,
  getConversationsForUser,
  getLastMessage
}; 