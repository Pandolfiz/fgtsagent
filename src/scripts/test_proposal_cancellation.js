#!/usr/bin/env node

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const partnerCredentialsService = require('../services/partnerCredentialsService');
const axios = require('axios');
const qs = require('querystring');
const http = require('http');

/**
 * Script para testar o cancelamento de propostas no V8
 */
async function testProposalCancellation() {
  console.log('🔧 Testando cancelamento de propostas no V8...\n');

  try {
    // 1. Buscar uma proposta para testar
    console.log('1️⃣ Buscando proposta para teste...');
    const { data: proposals, error } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .neq('status', 'cancelled')
      .neq('status', 'paid')
      .limit(1);

    if (error) {
      console.log('❌ Erro ao buscar propostas:', error.message);
      return;
    }

    if (!proposals || proposals.length === 0) {
      console.log('❌ Nenhuma proposta disponível para teste');
      return;
    }

    const proposal = proposals[0];
    console.log('✅ Proposta encontrada:', {
      proposal_id: proposal.proposal_id,
      status: proposal.status,
      client_id: proposal.client_id
    });

    // 2. Testar obtenção do token V8
    console.log('\n2️⃣ Testando obtenção do token V8...');
    try {
      const token = await getV8AccessToken(proposal.client_id);
      console.log('✅ Token V8 obtido com sucesso');
      console.log('📋 Token info:', {
        length: token?.length,
        prefix: token?.substring(0, 20) + '...'
      });

      // 3. Testar cancelamento no V8
      console.log('\n3️⃣ Testando cancelamento no V8...');
      await testCancelProposalV8(proposal.proposal_id, token);
      console.log('✅ Cancelamento no V8 testado com sucesso');

    } catch (tokenError) {
      console.log('❌ Erro ao obter token V8:', tokenError.message);
      
      // Verificar credenciais
      console.log('\n🔍 Verificando credenciais do parceiro...');
      try {
        const creds = await partnerCredentialsService.listPartnerCredentials(proposal.client_id);
        if (creds && creds.length > 0) {
          console.log('✅ Credenciais encontradas:', {
            count: creds.length,
            firstCredential: {
              id: creds[0].id,
              partner_type: creds[0].partner_type,
              auth_type: creds[0].auth_type
            }
          });
        } else {
          console.log('❌ Nenhuma credencial encontrada para o usuário');
        }
      } catch (credsError) {
        console.log('❌ Erro ao verificar credenciais:', credsError.message);
      }
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    logger.error('Erro no teste de cancelamento:', error);
  }
}

async function getV8AccessToken(userId) {
  const creds = await partnerCredentialsService.listPartnerCredentials(userId);
  if (!creds || creds.length === 0) throw new Error('Credenciais do parceiro não encontradas para este usuário.');
  
  // O serviço retorna os dados em oauth_config
  const { oauth_config } = creds[0];
  const { grant_type, username, password, audience, scope, client_id } = oauth_config;
  
  console.log('🔑 Dados de autenticação:', {
    grant_type,
    username,
    audience,
    scope,
    client_id,
    password: password ? '[HIDDEN]' : 'undefined'
  });

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
    console.log('📡 Resposta do axios:', {
      status: response.status,
      data: response.data
    });
    
    if (response.data && response.data.access_token) {
      return response.data.access_token;
    }
    
    const errorMessage = response.data?.error_description || response.data?.error || 'Access token não retornado';
    throw new Error(errorMessage);
  } catch (error) {
    console.log('⚠️ Axios falhou, tentando com curl...', error.message);
    
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
      console.log('🔄 Executando curl...');
      const { stdout, stderr } = await execAsync(curlCommand);
      
      if (stderr) {
        console.log('⚠️ Curl stderr:', stderr);
      }
      
      console.log('📡 Resposta do curl:', stdout);
      const curlResponse = JSON.parse(stdout);
      
      if (curlResponse.access_token) {
        return curlResponse.access_token;
      }
      
      throw new Error(curlResponse.error_description || curlResponse.error || 'Access token não retornado pelo curl');
    } catch (curlError) {
      console.error('❌ Erro ao executar curl:', curlError.message);
      throw new Error(`Falha na autenticação V8: ${error.message} | Curl: ${curlError.message}`);
    }
  }
}

async function testCancelProposalV8(proposalId, accessToken) {
  const url = `${process.env.V8_SISTEMA_API_URL || 'https://bff.v8sistema.com'}/fgts/proposal/${proposalId}/cancel`;
  const payload = { reason: 'invalid_data:invalid_name' };
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  console.log('🌐 URL do cancelamento:', url);
  console.log('📦 Payload:', payload);
  console.log('📋 Headers:', {
    'Content-Type': headers['Content-Type'],
    'Accept': headers['Accept'],
    'Authorization': '[HIDDEN]'
  });

  try {
    const response = await axios.patch(url, payload, { headers });
    console.log('✅ Resposta do V8:', {
      status: response.status,
      data: response.data
    });
    return response.data;
  } catch (err) {
    console.error('❌ Erro na requisição V8:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data
    });
    throw err;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testProposalCancellation().catch(console.error);
}

module.exports = { testProposalCancellation }; 

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const partnerCredentialsService = require('../services/partnerCredentialsService');
const axios = require('axios');
const qs = require('querystring');
const http = require('http');

/**
 * Script para testar o cancelamento de propostas no V8
 */
async function testProposalCancellation() {
  console.log('🔧 Testando cancelamento de propostas no V8...\n');

  try {
    // 1. Buscar uma proposta para testar
    console.log('1️⃣ Buscando proposta para teste...');
    const { data: proposals, error } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .neq('status', 'cancelled')
      .neq('status', 'paid')
      .limit(1);

    if (error) {
      console.log('❌ Erro ao buscar propostas:', error.message);
      return;
    }

    if (!proposals || proposals.length === 0) {
      console.log('❌ Nenhuma proposta disponível para teste');
      return;
    }

    const proposal = proposals[0];
    console.log('✅ Proposta encontrada:', {
      proposal_id: proposal.proposal_id,
      status: proposal.status,
      client_id: proposal.client_id
    });

    // 2. Testar obtenção do token V8
    console.log('\n2️⃣ Testando obtenção do token V8...');
    try {
      const token = await getV8AccessToken(proposal.client_id);
      console.log('✅ Token V8 obtido com sucesso');
      console.log('📋 Token info:', {
        length: token?.length,
        prefix: token?.substring(0, 20) + '...'
      });

      // 3. Testar cancelamento no V8
      console.log('\n3️⃣ Testando cancelamento no V8...');
      await testCancelProposalV8(proposal.proposal_id, token);
      console.log('✅ Cancelamento no V8 testado com sucesso');

    } catch (tokenError) {
      console.log('❌ Erro ao obter token V8:', tokenError.message);
      
      // Verificar credenciais
      console.log('\n🔍 Verificando credenciais do parceiro...');
      try {
        const creds = await partnerCredentialsService.listPartnerCredentials(proposal.client_id);
        if (creds && creds.length > 0) {
          console.log('✅ Credenciais encontradas:', {
            count: creds.length,
            firstCredential: {
              id: creds[0].id,
              partner_type: creds[0].partner_type,
              auth_type: creds[0].auth_type
            }
          });
        } else {
          console.log('❌ Nenhuma credencial encontrada para o usuário');
        }
      } catch (credsError) {
        console.log('❌ Erro ao verificar credenciais:', credsError.message);
      }
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    logger.error('Erro no teste de cancelamento:', error);
  }
}

async function getV8AccessToken(userId) {
  const creds = await partnerCredentialsService.listPartnerCredentials(userId);
  if (!creds || creds.length === 0) throw new Error('Credenciais do parceiro não encontradas para este usuário.');
  
  // O serviço retorna os dados em oauth_config
  const { oauth_config } = creds[0];
  const { grant_type, username, password, audience, scope, client_id } = oauth_config;
  
  console.log('🔑 Dados de autenticação:', {
    grant_type,
    username,
    audience,
    scope,
    client_id,
    password: password ? '[HIDDEN]' : 'undefined'
  });

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
    console.log('📡 Resposta do axios:', {
      status: response.status,
      data: response.data
    });
    
    if (response.data && response.data.access_token) {
      return response.data.access_token;
    }
    
    const errorMessage = response.data?.error_description || response.data?.error || 'Access token não retornado';
    throw new Error(errorMessage);
  } catch (error) {
    console.log('⚠️ Axios falhou, tentando com curl...', error.message);
    
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
      console.log('🔄 Executando curl...');
      const { stdout, stderr } = await execAsync(curlCommand);
      
      if (stderr) {
        console.log('⚠️ Curl stderr:', stderr);
      }
      
      console.log('📡 Resposta do curl:', stdout);
      const curlResponse = JSON.parse(stdout);
      
      if (curlResponse.access_token) {
        return curlResponse.access_token;
      }
      
      throw new Error(curlResponse.error_description || curlResponse.error || 'Access token não retornado pelo curl');
    } catch (curlError) {
      console.error('❌ Erro ao executar curl:', curlError.message);
      throw new Error(`Falha na autenticação V8: ${error.message} | Curl: ${curlError.message}`);
    }
  }
}

async function testCancelProposalV8(proposalId, accessToken) {
  const url = `${process.env.V8_SISTEMA_API_URL || 'https://bff.v8sistema.com'}/fgts/proposal/${proposalId}/cancel`;
  const payload = { reason: 'invalid_data:invalid_name' };
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  console.log('🌐 URL do cancelamento:', url);
  console.log('📦 Payload:', payload);
  console.log('📋 Headers:', {
    'Content-Type': headers['Content-Type'],
    'Accept': headers['Accept'],
    'Authorization': '[HIDDEN]'
  });

  try {
    const response = await axios.patch(url, payload, { headers });
    console.log('✅ Resposta do V8:', {
      status: response.status,
      data: response.data
    });
    return response.data;
  } catch (err) {
    console.error('❌ Erro na requisição V8:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data
    });
    throw err;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testProposalCancellation().catch(console.error);
}

module.exports = { testProposalCancellation }; 