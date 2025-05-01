const { supabaseAdmin } = require('../config/supabase');

/**
 * Insere ou atualiza um contato a partir de informações recebidas no webhook
 */
async function upsertContact({ remote_jid, push_name, profile_pic_url, instance_id }) {
  const { data, error } = await supabaseAdmin
    .from('contacts')
    .upsert(
      [{ remote_jid, push_name, profile_pic_url, instance_id }],
      { onConflict: 'remote_jid' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Busca contatos por um array de remote_jid
 */
async function getContactsByJids(remoteJids) {
  const { data, error } = await supabaseAdmin
    .from('contacts')
    .select('remote_jid, push_name, profile_pic_url, agent_state')
    .in('remote_jid', remoteJids);
  if (error) throw error;
  return data;
}

async function updateState({ remote_jid, agent_state }) {
  const { data, error } = await supabaseAdmin
    .from('contacts')
    .update({ agent_state })
    .eq('remote_jid', remote_jid)
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  upsertContact,
  getContactsByJids,
  updateState
}; 