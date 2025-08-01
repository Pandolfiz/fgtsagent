const axios = require('axios');
const logger = require('../utils/logger');
const http = require('https');
const qs = require('querystring');
const partnerCredentialsService = require('../services/partnerCredentialsService');
const { supabaseAdmin } = require('../config/supabase');

// Configurar interceptors do Axios para log sem dados sensíveis
const { sanitizeHeaders } = require('../utils/logSanitizer');

axios.interceptors.request.use(
  config => {
    logger.info(`[Axios Request] ${config.method.toUpperCase()} ${config.url}`, { 
      headers: sanitizeHeaders(config.headers), 
      data: config.data 
    });
    return config;
  },
  error => {
    logger.error('[Axios Request Error]', { error: error.message });
    return Promise.reject(error);
  }
);
axios.interceptors.response.use(
  response => {
    logger.info(`[Axios Response] ${response.status} ${response.config.method.toUpperCase()} ${response.config.url}`, { 
      data: response.data, 
      headers: sanitizeHeaders(response.headers) 
    });
    return response;
  },
  error => {
    logger.error('[Axios Response Error]', { 
      status: error.response?.status, 
      data: error.response?.data, 
      headers: sanitizeHeaders(error.response?.headers), 
      message: error.message 
    });
    return Promise.reject(error);
  }
);

/**
 * Obtém token de acesso da V8 para o usuário logado, buscando credenciais na tabela partner_credentials.
 */
async function getV8AccessToken(userId) {
  const creds = await partnerCredentialsService.listPartnerCredentials(userId);
  if (!creds || creds.length === 0) throw new Error('Credenciais do parceiro não encontradas para este usuário.');
  
  // O serviço retorna os dados em oauth_config
  const { oauth_config } = creds[0];
  const { grant_type, username, password, audience, scope, client_id } = oauth_config;

  // Usar exatamente a conversão do curl para axios
  const options = {
    method: 'POST',
    url: 'https://auth.v8sistema.com/oauth/token',
    params: {'': ''},
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: {
      grant_type,
      username,
      password,
      audience,
      scope,
      client_id
    }
  };

  try {
    // Tentar primeiro com axios
    const response = await axios.request(options);
    if (response.data && response.data.access_token) {
      return response.data.access_token;
    }
    const errorMessage = response.data?.error_description || response.data?.error || 'Access token não retornado';
    throw new Error(errorMessage);
  } catch (error) {
    logger.warn('Axios falhou, tentando com curl...', error.message);
    
    // Fallback: usar curl diretamente
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    const curlCommand = `curl --request POST \
      --url 'https://auth.v8sistema.com/oauth/token' \
      --header 'Content-Type: application/x-www-form-urlencoded' \
      --data grant_type=password \
      --data username=${username} \
      --data password=${password} \
      --data audience=${audience} \
      --data scope=${scope} \
      --data client_id=${client_id}`;
    
    try {
      const { stdout, stderr } = await execAsync(curlCommand);
      if (stderr) {
        logger.error('Erro no curl:', stderr);
      }
      
      const curlResponse = JSON.parse(stdout);
      if (curlResponse.access_token) {
        return curlResponse.access_token;
      }
      
      throw new Error(curlResponse.error_description || curlResponse.error || 'Access token não retornado pelo curl');
    } catch (curlError) {
      logger.error('Erro ao executar curl:', curlError.message);
      throw new Error(`Falha na autenticação V8: ${error.message} | Curl: ${curlError.message}`);
    }
  }
}

// Função para cancelar proposta na V8
async function cancelProposalV8(proposalId, accessToken) {
      const url = `${process.env.V8_SISTEMA_API_URL || 'https://bff.v8sistema.com'}/fgts/proposal/${proposalId}/cancel`;
  const payload = { reason: 'invalid_data:invalid_name' };
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  // Log request details (sem dados sensíveis)
  logger.info('[V8 Request] URL:', url);
  logger.info('[V8 Request] Headers:', { 
    'Content-Type': headers['Content-Type'],
    'Accept': headers['Accept'],
    'Authorization': '[HIDDEN]'
  });
  logger.info('[V8 Request] Payload:', payload);
  // Log axios config completo (sem dados sensíveis)
  logger.info('[V8 Axios Config]', { 
    method: 'patch', 
    url, 
    headers: { 
      'Content-Type': headers['Content-Type'],
      'Accept': headers['Accept'],
      'Authorization': '[HIDDEN]'
    }, 
    data: payload 
  });
  try {
    const response = await axios.patch(url, payload, { headers });
    // Log success response
    logger.info('[V8 Response] status:', response.status, 'data:', response.data);
    return response.data;
  } catch (err) {
    // Log apenas informações essenciais do erro, evitando objetos circulares
    logger.error('[V8 Error] Message:', err.message);
    logger.error('[V8 Error] Name:', err.name);
    
    // Informações da configuração da requisição (só dados básicos, sem dados sensíveis)
    if (err.config) {
      logger.error('[V8 Error] Request config:', { 
        url: err.config.url,
        method: err.config.method,
        baseURL: err.config.baseURL,
        headers: sanitizeHeaders(err.config.headers)
      });
    }
    
    // Informações da resposta, se disponível
    if (err.response) {
      logger.error('[V8 Error] Response status:', err.response.status);
      logger.error('[V8 Error] Response headers:', sanitizeHeaders(err.response.headers));
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
    logger.info('[V8 DEBUG] accessToken obtido com sucesso', { 
      tokenLength: accessToken?.length,
      tokenPrefix: accessToken?.substring(0, 10)
    });
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
    
    const proposal = proposals[0];
    logger.info(`[DEBUG] Proposta encontrada: ${proposal_id}`, {
      status: proposal.status,
      client_id: proposal.client_id,
      user_id: req.user.id
    });
    // Cancelar na V8 se possível
    let v8CancelSuccess = false;
    try {
      const token = await getV8AccessToken(req.user.id);
      logger.info('[V8 DEBUG] accessToken obtido com sucesso', { 
        tokenLength: token?.length,
        tokenPrefix: token?.substring(0, 10)
      });
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
        logger.warn(`Falha ao cancelar na V8 para proposta ${proposal_id}, continuando apenas com cancelamento local: ${v8Err.message}`);
        // Não retornar erro 400, apenas continuar com cancelamento local
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

exports.updateProposal = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado ou ID do usuário ausente.' });
    }
    
    const proposal_id = req.params.id;
    if (!proposal_id) {
      return res.status(400).json({ success: false, message: 'ID da proposta não informado.' });
    }
    
    const { chavePix } = req.body;
    
    // Validar se a chave PIX foi fornecida
    if (!chavePix) {
      return res.status(400).json({ success: false, message: 'Chave PIX é obrigatória.' });
    }
    
    // Buscar proposta para verificar se existe e se pertence ao usuário
    const { data: proposals, error } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('proposal_id', proposal_id)
      .eq('client_id', req.user.id);
      
    if (error) throw error;
    
    if (!proposals || proposals.length === 0) {
      return res.status(404).json({ success: false, message: 'Proposta não encontrada ou não pertence ao usuário.' });
    }
    
    const proposal = proposals[0];
    
    // Verificar se a proposta pode ser editada (apenas propostas pendentes)
    if (proposal.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Apenas propostas pendentes podem ser editadas.' 
      });
    }
    
    // Atualizar apenas a chave PIX
    const { error: updateError } = await supabaseAdmin
      .from('proposals')
      .update({ chavePix })
      .eq('proposal_id', proposal_id);
      
    if (updateError) throw updateError;
    
    logger.info(`Proposta ${proposal_id} atualizada com sucesso. Nova chave PIX: ${chavePix}`);
    
    // Enviar webhook para n8n após atualização bem-sucedida
    try {
      // Buscar dados do lead para obter o CPF
      const { data: lead, error: leadError } = await supabaseAdmin
        .from('leads')
        .select('cpf')
        .eq('id', proposal.lead_id)
        .single();
        
      if (leadError || !lead) {
        logger.warn(`[WEBHOOK] Lead não encontrado para proposta ${proposal_id}: ${leadError?.message || 'Lead não encontrado'}`);
      } else {
        // Buscar credenciais do parceiro
        const partnerCreds = await partnerCredentialsService.listPartnerCredentials(req.user.id);
        
        if (!partnerCreds || partnerCreds.length === 0) {
          logger.warn(`[WEBHOOK] Credenciais do parceiro não encontradas para usuário ${req.user.id}`);
        } else {
          const creds = partnerCreds[0];
          
          // Preparar payload do webhook
          const webhookPayload = [
            {
              action: "resolver",
              parametros: {
                cpf: lead.cpf
              },
                      // O serviço retorna os dados em oauth_config
        grant_type: creds.oauth_config.grant_type,
        username: creds.oauth_config.username,
        password: creds.oauth_config.password,
        audience: creds.oauth_config.audience,
        scope: creds.oauth_config.scope,
        client_id: creds.oauth_config.client_id,
              user_id: req.user.id
            }
          ];
          
          // Enviar webhook para n8n (sem aguardar resposta)
          const N8N_WEBHOOK_URL = 'https://n8n-n8n.8cgx4t.easypanel.host/webhook/toolPropostaApp';
          
          logger.info(`[WEBHOOK] Enviando webhook para n8n: ${N8N_WEBHOOK_URL}`, {
            proposal_id,
            lead_cpf: lead.cpf,
            user_id: req.user.id
          });
          
          // Log do payload enviado
          logger.info(`[WEBHOOK] Payload enviado:`, JSON.stringify(webhookPayload, null, 2));
          
          // Enviar webhook de forma assíncrona (fire and forget)
          axios.post(N8N_WEBHOOK_URL, webhookPayload, {
            timeout: 30000,
            headers: {
              'Content-Type': 'application/json'
            }
          }).then(() => {
            logger.info(`[WEBHOOK] Webhook enviado com sucesso para proposta ${proposal_id}`);
          }).catch((webhookError) => {
            logger.error(`[WEBHOOK] Erro ao enviar webhook para proposta ${proposal_id}:`, webhookError.message);
          });
        }
      }
    } catch (webhookError) {
      logger.error(`[WEBHOOK] Erro ao enviar webhook para proposta ${proposal_id}:`, webhookError.message);
      // Não falhar a operação principal por causa do webhook
    }
    
    return res.json({ 
      success: true, 
      message: 'Proposta atualizada com sucesso.',
      data: { proposal_id, chavePix }
    });
    
  } catch (err) {
    logger.error('Erro ao atualizar proposta:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao atualizar proposta.', 
      error: err.message 
    });
  }
}; 