const axios = require('axios');
const logger = require('../utils/logger');
const http = require('https');
const qs = require('querystring');
const partnerCredentialsService = require('../services/partnerCredentialsService');
const { supabaseAdmin } = require('../config/supabase');

// Configurar interceptors do Axios para log completo de requests/responses
axios.interceptors.request.use(
  config => {
    logger.info(`[Axios Request] ${config.method.toUpperCase()} ${config.url}`, { headers: config.headers, data: config.data });
    return config;
  },
  error => {
    logger.error('[Axios Request Error]', { error: error.message });
    return Promise.reject(error);
  }
);
axios.interceptors.response.use(
  response => {
    logger.info(`[Axios Response] ${response.status} ${response.config.method.toUpperCase()} ${response.config.url}`, { data: response.data, headers: response.headers });
    return response;
  },
  error => {
    logger.error('[Axios Response Error]', { status: error.response?.status, data: error.response?.data, headers: error.response?.headers, message: error.message });
    return Promise.reject(error);
  }
);

/**
 * Obtém token de acesso da V8 para o usuário logado, buscando credenciais na tabela partner_credentials.
 */
async function getV8AccessToken(userId) {
  const creds = await partnerCredentialsService.listPartnerCredentials(userId);
  if (!creds || creds.length === 0) throw new Error('Credenciais do parceiro não encontradas para este usuário.');
  const { grant_type, username, password, audience, scope, client_id } = creds[0];
  const postData = qs.stringify({ grant_type, username, password, audience, scope, client_id });
  const options = {
    method: 'POST',
    hostname: 'auth.v8sistema.com',
    path: '/oauth/token',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) return resolve(parsed.access_token);
          return reject(new Error('Access token não retornado'));  
        } catch (e) {
          return reject(e);
        }
      });
    }).on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Função para cancelar proposta na V8
async function cancelProposalV8(proposalId, accessToken) {
  const url = `https://bff.v8sistema.com/fgts/proposal/${proposalId}/cancel`;
  const payload = { reason: 'invalid_data:invalid_name' };
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  // Log request details
  logger.info('[V8 Request] URL:', url);
  logger.info('[V8 Request] Headers:', headers);
  logger.info('[V8 Request] Payload:', payload);
  // Log axios config completo
  logger.info('[V8 Axios Config]', { method: 'patch', url, headers, data: payload });
  try {
    const response = await axios.patch(url, payload, { headers });
    // Log success response
    logger.info('[V8 Response] status:', response.status, 'data:', response.data);
    return response.data;
  } catch (err) {
    // Log apenas informações essenciais do erro, evitando objetos circulares
    logger.error('[V8 Error] Message:', err.message);
    logger.error('[V8 Error] Name:', err.name);
    
    // Informações da configuração da requisição (só dados básicos)
    if (err.config) {
      logger.error('[V8 Error] Request config:', { 
        url: err.config.url,
        method: err.config.method,
        baseURL: err.config.baseURL,
        headers: err.config.headers
      });
    }
    
    // Informações da resposta, se disponível
    if (err.response) {
      logger.error('[V8 Error] Response status:', err.response.status);
      logger.error('[V8 Error] Response headers:', err.response.headers);
      logger.error('[V8 Error] Response data:', err.response.data);
    }
    
    // Extrai mensagem de erro nativo ou fallback
    const status = err.response?.status;
    const data = err.response?.data;
    const v8Message = (data && (data.error?.message || data.message)) || err.message || `Status ${status}`;
    throw new Error(v8Message);
  }
}

exports.cancelProposal = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado ou ID do usuário ausente.' });
    }
    const { id: proposal_id } = req.params;
    if (!proposal_id) {
      return res.status(400).json({ success: false, message: 'ID da proposta não informado.' });
    }
    // Buscar proposta diretamente no Supabase
    const { data: proposals, error } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('proposal_id', proposal_id);
    if (error) throw error;
    if (!proposals || proposals.length === 0) {
      return res.status(404).json({ success: false, message: 'Proposta não encontrada.' });
    }
    const proposal = proposals[0];
    if (proposal.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Proposta já está cancelada.' });
    }
    if (proposal.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Propostas pagas não podem ser canceladas.' });
    }
    // 1. Obter token de acesso da V8
    const accessToken = await getV8AccessToken(req.user.id);
    logger.info('[V8 DEBUG] accessToken:', accessToken);
    // 2. Cancelar na V8 usando proposal_id
    await cancelProposalV8(proposal_id, accessToken);
    // 3. Atualizar localmente no Supabase
    const { error: updateError } = await supabaseAdmin
      .from('proposals')
      .update({ status: 'cancelled' })
      .eq('proposal_id', proposal_id);
    if (updateError) throw updateError;
    logger.info(`Proposta ${proposal_id} cancelada com sucesso na V8 e localmente.`);
    return res.json({ success: true, message: 'Proposta cancelada com sucesso na V8 e localmente.' });
  } catch (err) {
    logger.error('Erro no processo de cancelamento de proposta:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao cancelar proposta.', error: err.message });
  }
};

exports.deleteProposal = async (req, res) => {
  logger.info('[DEBUG] Entrou no deleteProposal', { params: req.params, user: req.user?.id });
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado ou ID do usuário ausente.' });
    }
    const proposal_id = req.params.id;
    if (!proposal_id) return res.status(400).json({ success: false, message: 'ID da proposta não informado.' });
    // Buscar proposta diretamente no Supabase
    const { data: proposals, error } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('proposal_id', proposal_id);
    if (error) throw error;
    if (!proposals || proposals.length === 0) return res.status(404).json({ success: false, message: 'Proposta não encontrada.' });
    // Cancelar na V8 se possível
    let v8CancelSuccess = false;
    try {
      const token = await getV8AccessToken(req.user.id);
      logger.info('[V8 DEBUG] accessToken:', token);
      logger.info('[V8 DEBUG] Chamando cancelProposalV8 com proposal_id:', proposal_id);
      await cancelProposalV8(proposal_id, token);
      logger.info(`Proposta ${proposal_id} cancelada no V8.`);
      v8CancelSuccess = true;
    } catch (v8Err) {
      logger.error('[V8 DEBUG] Erro ao cancelar na V8:', { 
        message: v8Err.message,
        name: v8Err.name,
        code: v8Err.code,
        status: v8Err.response?.status
      });
      if (v8Err.message.includes('Credenciais do parceiro não encontradas')) {
        logger.warn(`Credenciais não encontradas para usuário ${req.user.id}, continuando com cancelamento local apenas`);
      } else if (!v8Err.message.includes('Operation does not allow cancelation')) {
        return res.status(400).json({ 
          success: false, 
          message: 'Falha ao cancelar na V8.', 
          error: v8Err.message 
        });
      }
    }
    // Atualizar status para 'cancelled' localmente no Supabase
    const { error: updateError } = await supabaseAdmin
      .from('proposals')
      .update({ status: 'cancelled' })
      .eq('proposal_id', proposal_id);
    if (updateError) throw updateError;
    const message = v8CancelSuccess 
      ? 'Proposta cancelada com sucesso na V8 e localmente.' 
      : 'Proposta cancelada localmente com sucesso.';
    return res.json({ success: true, message });
  } catch (err) {
    logger.error('[DEBUG] Erro final ao excluir proposta:', { 
      message: err.message,
      name: err.name,
      code: err.code,
      stack: err.stack?.split('\n').slice(0, 3).join('\n') 
    });
    return res.status(500).json({ success: false, message: 'Erro ao excluir proposta.', error: err.message });
  }
}; 