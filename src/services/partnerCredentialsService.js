// Serviço para gerenciar credenciais de parceiros de banco
const { supabase } = require('../config/supabase');

/** Lista todas as credenciais do usuário */
async function listPartnerCredentials(userId) {
  const { data, error } = await supabase
    .from('partner_credentials')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Obtém uma credencial específica do usuário */
async function getPartnerCredentialById(id, userId) {
  const { data, error } = await supabase
    .from('partner_credentials')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}

/** Cria nova credencial de parceiro */
async function createPartnerCredential(credential) {
  const { data, error } = await supabase
    .from('partner_credentials')
    .insert([credential])
    .single();
  if (error) throw error;
  return data;
}

/** Atualiza credencial existente */
async function updatePartnerCredential(id, userId, updates) {
  const { data, error } = await supabase
    .from('partner_credentials')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}

/** Deleta credencial de parceiro */
async function deletePartnerCredential(id, userId) {
  const { error } = await supabase
    .from('partner_credentials')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
  return true;
}

module.exports = {
  listPartnerCredentials,
  getPartnerCredentialById,
  createPartnerCredential,
  updatePartnerCredential,
  deletePartnerCredential
}; 