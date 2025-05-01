const Proposal = require('../models/proposal');
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
    // Log full error object for análise detalhada
    logger.error('[V8 Error] Error object:', err);
    // Configuração da requisição
    if (err.config) logger.error('[V8 Error] Request config:', err.config);
    // Objeto Request (raw)
    if (err.request) logger.error('[V8 Error] Raw request:', err.request);
    // Resposta, se disponível
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
    const proposal = await Proposal.findById(proposal_id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposta não encontrada.' });
    }
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
    // 3. Atualizar localmente
    await proposal.cancel();
    logger.info(`Proposta ${proposal_id} cancelada com sucesso na V8 e localmente.`);
    return res.json({ success: true, message: 'Proposta cancelada com sucesso na V8 e localmente.' });
  } catch (err) {
    logger.error('Erro no processo de cancelamento de proposta:', err.message);
    return res.status(500).json({ success: false, message: 'Erro ao cancelar proposta.', error: err.message });
  }
};

exports.deleteProposal = async (req, res) => {
  logger.info('[DEBUG] Entrou no deleteProposal', { params: req.params, user: req.user });
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado ou ID do usuário ausente.' });
    }
    const proposal_id = req.params.id;
    if (!proposal_id) return res.status(400).json({ success: false, message: 'ID da proposta não informado.' });
    const proposal = await Proposal.findById(proposal_id);
    logger.info('[DEBUG] Proposal encontrado:', proposal);
    if (!proposal) return res.status(404).json({ success: false, message: 'Proposta não encontrada.' });
    // Cancelar na V8 se necessário
    try {
      const token = await getV8AccessToken(req.user.id);
      logger.info('[V8 DEBUG] accessToken:', token);
      logger.info('[V8 DEBUG] Chamando cancelProposalV8 com proposal_id:', proposal_id);
      await cancelProposalV8(proposal_id, token);
      logger.info(`Proposta ${proposal_id} cancelada no V8.`);
    } catch (v8Err) {
      logger.error('[V8 DEBUG] Erro completo ao cancelar na V8:', v8Err);
      if (!v8Err.message.includes('Operation does not allow cancelation')) {
        return res.status(400).json({ success: false, message: 'Falha ao cancelar na V8.', error: v8Err.message });
      }
    }
    // Atualizar status para 'cancelled' em vez de deletar
    const { error } = await supabaseAdmin
      .from('proposals')
      .update({ status: 'cancelled' })
      .eq('proposal_id', proposal_id);
    if (error) throw error;
    return res.json({ success: true, message: 'Proposta cancelada com sucesso.' });
  } catch (err) {
    logger.error('[DEBUG] Erro final ao excluir proposta:', err);
    return res.status(500).json({ success: false, message: 'Erro ao excluir proposta.', error: err.message });
  }
}; 