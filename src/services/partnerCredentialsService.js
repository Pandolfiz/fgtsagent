// Serviço para gerenciar credenciais de parceiros de banco
const { supabase, supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/** Lista todas as credenciais do usuário */
async function listPartnerCredentials(userId) {
  logger.info(`[PartnerCredentials] Buscando credenciais para userId: ${userId}`);
  
  // Tenta buscar com supabaseAdmin para ignorar RLS
  const { data, error } = await supabaseAdmin
    .from('partner_credentials')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    logger.error(`[PartnerCredentials] Erro ao buscar credenciais: ${error.message}`, error);
    throw error;
  }
  
  if (!data || data.length === 0) {
    logger.warn(`[PartnerCredentials] Nenhuma credencial encontrada para userId: ${userId}`);
    // Verificar se tem credenciais em geral para debug
    const { data: allCreds } = await supabaseAdmin
      .from('partner_credentials')
      .select('id, user_id, created_at')
      .limit(5);
    logger.info(`[PartnerCredentials] Amostra de credenciais disponíveis:`, allCreds);
    return [];
  } else {
    logger.info(`[PartnerCredentials] Encontradas ${data.length} credenciais para userId: ${userId}`);
  }
  
  // Transformar os dados para o formato esperado pelo frontend
  const transformedData = data.map(credential => {
    // Garantir que todos os campos estejam presentes com valores padrão
    const transformed = {
      id: credential.id,
      name: credential.name || 'Credencial V8',
      api_key: credential.api_key || '',
      partner_type: credential.partner_type || 'v8',
      auth_type: credential.auth_type || 'oauth',
      oauth_config: {
        grant_type: credential.grant_type || 'password',
        username: credential.username || '',
        password: credential.password || '',
        audience: credential.audience || '',
        scope: credential.scope || '',
        client_id: credential.client_id || ''
      },
      status: credential.status || 'active',
      user_id: credential.user_id,
      created_at: credential.created_at,
      updated_at: credential.updated_at
    };
    
    // Log para depuração
    logger.info(`[PartnerCredentials] Transformando credencial ${credential.id}:`, 
      JSON.stringify({original: credential, transformed}, null, 2));
    
    return transformed;
  });
  
  return transformedData;
}

/** Obtém uma credencial específica do usuário */
async function getPartnerCredentialById(id, userId) {
  logger.info(`[PartnerCredentials] Buscando credencial ${id} para usuário ${userId}`);
  
  // Usar supabaseAdmin para contornar as restrições de RLS
  const { data, error } = await supabaseAdmin
    .from('partner_credentials')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  
  if (error) {
    logger.error(`[PartnerCredentials] Erro ao buscar credencial: ${error.message}`, error);
    throw error;
  }
  
  if (!data) {
    logger.warn(`[PartnerCredentials] Credencial ${id} não encontrada para usuário ${userId}`);
    return null;
  }
  
  // Transformar para o formato esperado pelo frontend
  const transformed = {
    id: data.id,
    name: data.name || 'Credencial V8',
    api_key: data.api_key || '',
    partner_type: data.partner_type || 'v8',
    auth_type: data.auth_type || 'oauth',
    oauth_config: {
      grant_type: data.grant_type || 'password',
      username: data.username || '',
      password: data.password || '',
      audience: data.audience || '',
      scope: data.scope || '',
      client_id: data.client_id || ''
    },
    status: data.status || 'active',
    user_id: data.user_id,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
  
  // Log para depuração
  logger.info(`[PartnerCredentials] Obtendo credencial ${data.id}:`, 
    JSON.stringify({original: data, transformed}, null, 2));
  
  return transformed;
}

/** Cria nova credencial de parceiro */
async function createPartnerCredential(credential) {
  // Transformar do formato do frontend para o formato do banco
  const dbCredential = {
    user_id: credential.user_id,
    name: credential.name || 'Credencial V8',
    api_key: credential.api_key || '',
    partner_type: credential.partner_type || 'v8',
    auth_type: credential.auth_type || 'oauth',
    status: credential.status || 'active'
  };
  
  // Adicionar campos OAuth se necessário
  if (credential.auth_type === 'oauth' && credential.oauth_config) {
    dbCredential.grant_type = credential.oauth_config.grant_type || 'password';
    dbCredential.username = credential.oauth_config.username || '';
    dbCredential.password = credential.oauth_config.password || '';
    dbCredential.audience = credential.oauth_config.audience || '';
    dbCredential.scope = credential.oauth_config.scope || '';
    dbCredential.client_id = credential.oauth_config.client_id || '';
  }
  
  logger.info(`[PartnerCredentials] Criando credencial:`, JSON.stringify(dbCredential, null, 2));
  
  // Usar supabaseAdmin para contornar as restrições de RLS
  const { data, error } = await supabaseAdmin
    .from('partner_credentials')
    .insert([dbCredential])
    .select()
    .single();
  
  if (error) {
    logger.error(`[PartnerCredentials] Erro ao criar credencial: ${error.message}`, error);
    throw error;
  }
  
  // Retornar no formato esperado pelo frontend
  const transformed = {
    id: data.id,
    name: data.name || 'Credencial V8',
    api_key: data.api_key || '',
    partner_type: data.partner_type || 'v8',
    auth_type: data.auth_type || 'oauth',
    oauth_config: {
      grant_type: data.grant_type || 'password',
      username: data.username || '',
      password: data.password || '',
      audience: data.audience || '',
      scope: data.scope || '',
      client_id: data.client_id || ''
    },
    status: data.status || 'active',
    user_id: data.user_id,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
  
  logger.info(`[PartnerCredentials] Credencial criada:`, JSON.stringify(transformed, null, 2));
  
  return transformed;
}

/** Atualiza credencial existente */
async function updatePartnerCredential(id, userId, updates) {
  // Transformar do formato do frontend para o formato do banco
  const dbUpdates = {
    name: updates.name,
    api_key: updates.api_key,
    partner_type: updates.partner_type,
    auth_type: updates.auth_type,
    status: updates.status
  };
  
  // Adicionar campos OAuth se necessário
  if (updates.auth_type === 'oauth' && updates.oauth_config) {
    dbUpdates.grant_type = updates.oauth_config.grant_type;
    dbUpdates.username = updates.oauth_config.username;
    dbUpdates.password = updates.oauth_config.password;
    dbUpdates.audience = updates.oauth_config.audience;
    dbUpdates.scope = updates.oauth_config.scope;
    dbUpdates.client_id = updates.oauth_config.client_id;
  }
  
  // Remover campos undefined
  Object.keys(dbUpdates).forEach(key => 
    dbUpdates[key] === undefined && delete dbUpdates[key]
  );
  
  logger.info(`[PartnerCredentials] Atualizando credencial ${id}:`, JSON.stringify(dbUpdates, null, 2));
  
  // Usar supabaseAdmin para contornar as restrições de RLS
  const { data, error } = await supabaseAdmin
    .from('partner_credentials')
    .update(dbUpdates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) {
    logger.error(`[PartnerCredentials] Erro ao atualizar credencial: ${error.message}`, error);
    throw error;
  }
  
  // Retornar no formato esperado pelo frontend
  const transformed = {
    id: data.id,
    name: data.name || 'Credencial V8',
    api_key: data.api_key || '',
    partner_type: data.partner_type || 'v8',
    auth_type: data.auth_type || 'oauth',
    oauth_config: {
      grant_type: data.grant_type || 'password',
      username: data.username || '',
      password: data.password || '',
      audience: data.audience || '',
      scope: data.scope || '',
      client_id: data.client_id || ''
    },
    status: data.status || 'active',
    user_id: data.user_id,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
  
  logger.info(`[PartnerCredentials] Credencial atualizada:`, JSON.stringify(transformed, null, 2));
  
  return transformed;
}

/** Deleta credencial de parceiro */
async function deletePartnerCredential(id, userId) {
  logger.info(`[PartnerCredentials] Excluindo credencial ${id} para usuário ${userId}`);
  
  // Usar supabaseAdmin para contornar as restrições de RLS
  const { error } = await supabaseAdmin
    .from('partner_credentials')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  
  if (error) {
    logger.error(`[PartnerCredentials] Erro ao excluir credencial: ${error.message}`, error);
    throw error;
  }
  
  logger.info(`[PartnerCredentials] Credencial ${id} excluída com sucesso`);
  return true;
}

module.exports = {
  listPartnerCredentials,
  getPartnerCredentialById,
  createPartnerCredential,
  updatePartnerCredential,
  deletePartnerCredential
}; 