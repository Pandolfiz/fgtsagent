// Serviço de integração com EvolutionAPI
const axios = require('axios');
const WebSocket = require('ws');
const config = require('../config');
const { URL } = require('url');
const logger = require('../config/logger');

class EvolutionService {
  constructor({ baseUrl, apiKey, instanceName, instanceId }) {
    // Validar configuração obrigatória
    if (!baseUrl) {
      throw new Error('EVOLUTION_API_URL não configurada. Defina a variável de ambiente.');
    }
    if (!apiKey) {
      throw new Error('EVOLUTION_API_KEY não configurada. Defina a variável de ambiente.');
    }
    // Normalizar URL base: garantir protocolo
    let urlString = baseUrl;
    if (!/^https?:\/\//i.test(urlString)) {
      urlString = `http://${urlString}`;
    }
    try {
      const parsed = new URL(urlString);
      // manter protocolo, host e path, sem barra final
      this.baseUrl = parsed.href.replace(/\/$/, '');
    } catch (err) {
      throw new Error(`EVOLUTION_API_URL inválido: ${urlString}`);
    }
    this.apiKey = apiKey;
    this.instanceName = instanceName;
    this.instanceId = instanceId;
  }

  static fromCredential(cred) {
    return new EvolutionService({
      baseUrl: config.evolutionApi.url,
      apiKey: cred.metadata?.evolution_api_key || config.evolutionApi.apiKey,
      instanceName: cred.instance_name,
      instanceId: cred.id,
      agentName: cred.agent_name
    });
  }

  // Verifica status da API
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseUrl}/`, {
        headers: { apikey: this.apiKey }
      });
      return response.data;
    } catch (err) {
      logger.error('Erro ao verificar status da API:', err.message);
      throw new Error('Erro ao verificar status da API: ' + err.message);
    }
  }

  // Busca todas as instâncias disponíveis
  async fetchInstances() {
    try {
      // Usa o endpoint correto e filtra por nome de instância se disponível
      const endpoint = `${this.baseUrl}/instance/fetchInstances${this.instanceName ? `?instanceName=${encodeURIComponent(this.instanceName)}` : ''}`;
      logger.info(`Buscando instâncias em: ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        headers: { apikey: config.evolutionApi.apiKey }
      });

      if (!response.data) {
        throw new Error('Resposta vazia da API');
      }

      return response.data;
    } catch (err) {
      if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
        throw new Error(`Host não encontrado (${this.baseUrl}). Verifique a configuração EVOLUTION_API_URL.`);
      }
      if (err.response) {
        logger.warn('Erro ao buscar instâncias:', err.response.status, err.response.data);
        throw new Error(`Erro da Evolution API: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
      }
      logger.warn('Erro ao buscar instâncias:', err.message);
      throw err;
    }
  }

  // Busca estado de conexão da instância
  async fetchConnectionState() {
    try {
      const endpoint = `${this.baseUrl}/instance/connectionState/${encodeURIComponent(this.instanceName)}`;
      logger.info(`Buscando estado de conexão em: ${endpoint}`);
      const response = await axios.get(endpoint, {
        headers: { apikey: config.evolutionApi.apiKey }
      });
      return response.data;
    } catch (err) {
      if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
        throw new Error(`Host não encontrado (${this.baseUrl}). Verifique a configuração EVOLUTION_API_URL.`);
      }
      if (err.response) {
        logger.warn('Erro ao buscar connectionState:', err.response.status, err.response.data);
        throw new Error(`Erro da Evolution API: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
      }
      logger.warn('Erro ao buscar connectionState:', err.message);
      throw err;
    }
  }

  // Cria instância (caso não exista)
  async createInstance(number) {
    try {
      const endpoint = `${this.baseUrl}/instance/create`;
      logger.info(`Criando instância em: ${endpoint}`);
      
      // Validar número de telefone
      if (!number || !/^\d{10,}$/.test(number.replace(/\D/g, ''))) {
        throw new Error('Número de telefone inválido');
      }

      const payload = {
        instanceName: this.instanceName,
        token: this.apiKey,
        number,
        qrcode: true,
        integration: 'EVOLUTION',
        webhook:{
          enabled: true,
          url: process.env.N8N_WEBHOOK_URL || 'https://n8n-n8n.8cgx4t.easypanel.host/webhook/fgtsAgent',
          byEvents: false,
          events: ['MESSAGES_SET', 'MESSAGES_UPSERT', 'CONTACTS_UPDATE'],
          base64: true},
        // Configurações gerais via v2 API
        rejectCall: true,
        msgCall: '',
        groupsIgnore: true,
        alwaysOnline: true,
        readMessages: false,
        readStatus: true,
        syncFullHistory: true,
      }

      logger.info('Payload para criação de instância:', payload);
      
      const response = await axios.post(endpoint, payload, {
        headers: { apikey: this.apiKey, 'Content-Type': 'application/json' }
      });

      if (!response.data) {
        throw new Error('Resposta vazia da API');
      }

      logger.info('Instância criada com sucesso:', response.data);
      return response.data;
    } catch (err) {
      if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
        throw new Error(`Host não encontrado (${this.baseUrl}). Verifique a configuração EVOLUTION_API_URL.`);
      }
      if (err.response) {
        logger.error('Erro ao criar instância:', err.response.status, err.response.data);
        throw new Error(`Erro da Evolution API: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
      }
      logger.error('Erro ao criar instância:', err.message);
      throw err;
    }
  }

  // Envia mensagem via WebSocket
  async sendMessage(to, message) {
    throw new Error('Envio de mensagem via WebSocket não está mais disponível. Use sendTextMessage via REST API.');
  }

  // Busca QR Code de uma instância
  async fetchQrCode() {
    try {
      // Primeiro, deletar a instância se existir para forçar recriação limpa
      logger.info('Forçando recriação da instância para garantir QR Code...');
      
      try {
        await this.deleteInstance();
        logger.info('Instância deletada com sucesso');
      } catch (deleteError) {
        logger.warn(`Erro ao deletar instância (ignorando): ${deleteError.message}`);
      }
      
      // Aguardar um pouco após deletar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Agora criar uma nova instância limpa
      logger.info('Criando nova instância para gerar QR Code...');
      
      const createEndpoint = `${this.baseUrl}/instance/create`;
      const createPayload = {
        instanceName: this.instanceName,
        token: this.apiKey,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      };
      
      logger.info(`Criando instância em: ${createEndpoint}`, createPayload);
      
      const createResponse = await axios.post(createEndpoint, createPayload, {
        headers: { 
          apikey: this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      const createData = createResponse.data;
      logger.info('Instância criada:', createData);
      
      // Aguardar um pouco para a instância inicializar
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Agora tentar conectar para obter QR Code
      const connectEndpoint = `${this.baseUrl}/instance/connect/${encodeURIComponent(this.instanceName)}`;
      logger.info(`Conectando para obter QR Code: ${connectEndpoint}`);
      
      const connectResponse = await axios.get(connectEndpoint, {
        headers: { apikey: this.apiKey }
      });
      
      const connectData = connectResponse.data;
      logger.info('Resposta do connect:', connectData);
      
      // Verificar diferentes formatos de resposta
      if (connectData?.pairingCode && connectData?.code) {
        logger.info('QR Code obtido com pairingCode e code');
        return {
          base64: null,
          pairingCode: connectData.pairingCode,
          code: connectData.code
        };
      } else if (connectData?.base64) {
        logger.info('QR Code obtido em base64');
        return {
          base64: connectData.base64,
          pairingCode: connectData.pairingCode || null,
          code: connectData.code || null
        };
      } else if (connectData?.qrcode) {
        logger.info('QR Code obtido como string');
        return {
          base64: null,
          pairingCode: connectData.pairingCode || null,
          code: connectData.qrcode
        };
      }
      
      // Se o connect retornou vazio, aguardar mais um pouco e tentar novamente
      if (Object.keys(connectData).length === 0) {
        logger.info('Connect retornou vazio, aguardando mais tempo...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Tentar conectar novamente
        const retryResponse = await axios.get(connectEndpoint, {
          headers: { apikey: this.apiKey }
        });
        
        const retryData = retryResponse.data;
        logger.info('Segunda tentativa de connect:', retryData);
        
        if (retryData?.pairingCode && retryData?.code) {
          return {
            base64: null,
            pairingCode: retryData.pairingCode,
            code: retryData.code
          };
        } else if (retryData?.base64) {
          return {
            base64: retryData.base64,
            pairingCode: retryData.pairingCode || null,
            code: retryData.code || null
          };
        } else if (retryData?.qrcode) {
          return {
            base64: null,
            pairingCode: retryData.pairingCode || null,
            code: retryData.qrcode
          };
        }
      }
      
    } catch (error) {
      logger.error(`Erro ao buscar QR Code: ${error.message}`);
      
      // Se deu erro 404, tentar uma última vez com connectionState
      if (error.response?.status === 404) {
        logger.info('Tentando verificar status da instância como fallback...');
        try {
          const statusEndpoint = `${this.baseUrl}/instance/connectionState/${encodeURIComponent(this.instanceName)}`;
          const statusResponse = await axios.get(statusEndpoint, {
            headers: { apikey: this.apiKey }
          });
          
          const statusData = statusResponse.data;
          logger.info('Status como fallback:', statusData);
          
          if (statusData?.instance?.qrcode) {
            return {
              base64: null,
              pairingCode: statusData.instance.pairingCode || null,
              code: statusData.instance.qrcode
            };
          }
        } catch (statusError) {
          logger.warn(`Erro no fallback status: ${statusError.message}`);
        }
        
        throw new Error('Instância não encontrada. Verifique se a Evolution API está funcionando corretamente.');
      }
      
      throw error;
    }

    // Se chegou até aqui, não conseguiu obter QR Code
    throw new Error('Não foi possível obter QR Code da instância. Tente novamente em alguns segundos.');
  }

  // Deleta instância na Evolution API
  async deleteInstance() {
    // Deleta instância usando instanceName no path
    const endpoint = `${this.baseUrl}/instance/delete/${encodeURIComponent(this.instanceName)}`;
    // Primeiro, desconectar instância se estiver conectada
    const logoutEndpoint = `${this.baseUrl}/instance/logout/${encodeURIComponent(this.instanceName)}`;
    try {
      logger.info(`Desconectando instância via logout em: ${logoutEndpoint}`);
      await axios.delete(logoutEndpoint, { headers: { apikey: this.apiKey } });
      logger.info('Instância desconectada com sucesso antes da exclusão');
    } catch (logoutErr) {
      if (logoutErr.response && logoutErr.response.status === 404) {
        logger.warn(`Logout: instância ${this.instanceName} não estava conectada (404), seguindo para exclusão`);
      } else {
        logger.error('Erro ao desconectar instância antes de excluir:', logoutErr.message);
      }
    }
    try {
      logger.info(`Deletando instância via API em: ${endpoint}`);
      const response = await axios.delete(endpoint, {
        headers: { apikey: this.apiKey }
      });
      return response.data;
    } catch (err) {
      // Se 404, ignora
      if (err.response && err.response.status === 404) {
        logger.warn(`Instância ${this.instanceName} não encontrada (404) na Evolution API, ignorando exclusão`);
        return null;
      }
      // Falha de DNS
      if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
        throw new Error(`Host não encontrado (${this.baseUrl}). Verifique a configuração EVOLUTION_API_URL.`);
      }
      if (err.response) {
        logger.error('Erro ao deletar instância:', err.response.status, err.response.data);
        // Extrair mensagem de erro da API (pode vir como objeto mapeando caracteres)
        let apiError = err.response.data?.error;
        let errorMsg = '';
        if (apiError) {
          if (typeof apiError === 'string') {
            errorMsg = apiError;
          } else if (typeof apiError === 'object') {
            // juntar valores numéricos em string (ex: {0:'B',1:'a',...})
            errorMsg = Object.values(apiError).join('');
          }
        }
        if (!errorMsg) {
          errorMsg = `Erro da Evolution API: ${err.response.status}`;
        }
        throw new Error(errorMsg);
      }
      logger.error('Erro ao deletar instância:', err.message);
      throw err;
    }
  }

  // Logout da instância sem deletar
  async logoutInstance() {
    const logoutEndpoint = `${this.baseUrl}/instance/logout/${encodeURIComponent(this.instanceName)}`;
    try {
      logger.info(`Desconectando instância via logout em: ${logoutEndpoint}`);
      const response = await axios.delete(logoutEndpoint, { headers: { apikey: this.apiKey } });
      return response.data;
    } catch (err) {
      if (err.response && err.response.status === 404) {
        logger.warn(`Instância ${this.instanceName} não estava conectada (404)`);
        return null;
      }
      logger.error('Erro ao desconectar instância:', err.message);
      throw err;
    }
  }

  // Reinicia instância na Evolution API
  async restartInstance() {
    const endpoint = `${this.baseUrl}/instance/restart/${encodeURIComponent(this.instanceName)}`;
    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: endpoint,
      headers: { apikey: this.apiKey }
    };
    try {
      const response = await axios.request(config);
      return response.data;
    } catch (err) {
      if (err.response) {
        logger.error('Erro ao reiniciar instância:', err.response.status, err.response.data);
        throw new Error(`Erro da Evolution API: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
      }
      logger.error('Erro ao reiniciar instância:', err.message);
      throw err;
    }
  }

  // Envia mensagem de texto via API REST (alternativa ao WebSocket)
  async sendTextMessage(to, text) {
    try {
      // Garantir que o instanceName existe (obrigatório)
      if (!this.instanceName) {
        throw new Error('instanceName é obrigatório para enviar mensagens');
      }

      // Logar explicitamente o valor de instanceName para debug
      logger.info(`[DEBUG] instanceName usado na requisição Evolution: '${this.instanceName}'`);

      // Validar número de telefone
      if (!to || !/^\d+@c\.us$/.test(to)) {
        to = to.replace(/\D/g, '') + '@c.us';
      }

      // NOVA VALIDAÇÃO: garantir que o texto não é vazio, nulo ou undefined
      if (!text || typeof text !== 'string' || !text.trim()) {
        throw new Error('O campo text da mensagem não pode ser vazio.');
      }

      // Usar o instanceName exatamente como está salvo no banco, mas sempre encodeURIComponent para evitar problemas com caracteres especiais
      const endpoint = `${this.baseUrl}/message/sendText/${encodeURIComponent(this.instanceName)}`;
      
      logger.info(`Enviando mensagem para ${to} via REST API: ${endpoint}`);
      
      // Payload conforme modelo oficial Evolution API
      const payload = {
        number: to,
        options: {
          delay: 1200,
          presence: 'composing'
        },
        textMessage: {
          text: text
        }
      };
      
      // Logar o payload final para debug
      logger.info('Payload final para Evolution API:', JSON.stringify(payload));
      
      const response = await axios.post(endpoint, payload, {
        headers: { 
          apikey: this.apiKey, 
          'Content-Type': 'application/json' 
        }
      });

      logger.info('Mensagem enviada com sucesso:', response.data);
      return response.data;
    } catch (err) {
      logger.error('Erro ao enviar mensagem via API REST:', err.message);
      if (err.response) {
        logger.error('Detalhes do erro:', err.response.status, err.response.data);
        throw new Error(`Erro da Evolution API: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
      }
      throw err;
    }
  }
}

module.exports = EvolutionService; 