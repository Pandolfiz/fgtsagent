const EvolutionCredential = require('../models/evolutionCredential');
const logger = require('../utils/logger');
const EvolutionService = require('../services/evolutionService');
const config = require('../config');

class EvolutionCredentialController {
  // Lista credenciais do cliente autenticado
  async list(req, res) {
    try {
      const clientId = req.clientId;
      // Buscar todas as credenciais do cliente
      const creds = await EvolutionCredential.findAllByClientId(clientId);

      // Para cada credencial, buscar e atualizar status da instância
      if (Array.isArray(creds) && creds.length > 0) {
        for (const cred of creds) {
          try {
            const service = EvolutionService.fromCredential(cred);
            // Primeiro tentar com fetchInstances
            try {
              const instances = await service.fetchInstances();
              
              if (instances && Array.isArray(instances)) {
                const instance = instances.find(i => i.instance?.instanceName === cred.instance_name);
                if (instance) {
                  cred.status = instance.instance.status;
                  // Se encontrou status, continuar para próxima credencial
                  continue;
                }
              }
              // Se não encontrou a instância ou status, tentar usar connectionState
            } catch (fetchErr) {
              logger.warn(`Erro ao buscar instância via fetchInstances: ${fetchErr.message}, tentando connectionState`);
            }

            // Segundo método: tentar com connectionState 
            try {
              const state = await service.fetchConnectionState();
              if (state && state.state) {
                cred.status = state.state;
              }
            } catch (stateErr) {
              logger.warn(`Também falhou ao buscar status via connectionState: ${stateErr.message}`);
              // Usar "unknown" como fallback de status
              cred.status = "unknown";
            }
          } catch (err) {
            logger.warn(`Erro geral ao buscar status da instância ${cred.instance_name}: ${err.message}`);
            // Usar "unknown" como fallback
            cred.status = "unknown";
          }
        }
      }
      
      return res.json({ success: true, data: creds });
    } catch (err) {
      logger.error('EvolutionCredentialController.list error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Busca por ID garantindo pertencimento ao cliente
  async getById(req, res) {
    try {
      const { id } = req.params;
      const cred = await EvolutionCredential.findById(id);
      if (!cred || cred.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Credencial não encontrada' });
      }
      return res.json({ success: true, data: cred });
    } catch (err) {
      logger.error('EvolutionCredentialController.getById error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Cria nova credencial para o cliente autenticado
  async create(req, res) {
    try {
      // Verificar se o nome do agente foi fornecido
      if (!req.body.agent_name) {
        return res.status(400).json({ success: false, message: 'Nome do agente é obrigatório' });
      }

      // Obter nome do usuário (se disponível) ou usar um valor padrão
      let userName = req.user?.displayName || req.user?.user_metadata?.full_name || req.user?.profile?.full_name || 
                    req.user?.user_metadata?.first_name || req.user?.email?.split('@')[0] || 'Usuario';
      
      // Gerar nome da instância baseado no nome do usuário + nome do agente
      const generatedInstanceName = `${userName} - ${req.body.agent_name}`;
      
      const payload = {
        client_id: req.clientId,
        phone: req.body.phone,
        instance_name: generatedInstanceName,
        partner_secret: config.evolutionApi.apiKey, // Usar chave API global
        agent_name: req.body.agent_name,
        metadata: req.body.metadata || {}
      };
      const cred = new EvolutionCredential(payload);
      const saved = await cred.save();
      return res.status(201).json({ success: true, data: saved });
    } catch (err) {
      logger.error('EvolutionCredentialController.create error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Atualiza credencial existente
  async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await EvolutionCredential.findById(id);
      if (!existing || existing.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Credencial não encontrada' });
      }

      // Verificar se o nome do agente foi fornecido
      if (req.body.agent_name === undefined || req.body.agent_name === '') {
        return res.status(400).json({ success: false, message: 'Nome do agente é obrigatório' });
      }

      // Obtém nome do usuário para atualizar o nome da instância
      let userName = req.user?.displayName || req.user?.user_metadata?.full_name || req.user?.profile?.full_name || 
                    req.user?.user_metadata?.first_name || req.user?.email?.split('@')[0] || 'Usuario';
      
      // Gerar novo nome da instância no formato "nomeUsuario - nomeAgente"
      const updatedInstanceName = `${userName} - ${req.body.agent_name}`;

      // Merge campos permitidos
      const updates = ['phone', 'agent_name', 'metadata'];
      updates.forEach(field => {
        if (req.body[field] !== undefined) {
          existing[field] = req.body[field];
        }
      });
      
      // Atualizar o nome da instância
      existing.instance_name = updatedInstanceName;
      const updated = await existing.save();
      return res.json({ success: true, data: updated });
    } catch (err) {
      logger.error('EvolutionCredentialController.update error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Exclui credencial do cliente autenticado
  async delete(req, res) {
    try {
      const { id } = req.params;
      const existing = await EvolutionCredential.findById(id);
      if (!existing || existing.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Credencial não encontrada' });
      }
      const { supabaseAdmin } = require('../config/supabase');
      const { error } = await supabaseAdmin
        .from('evolution_credentials')
        .delete()
        .eq('id', id);
      if (error) {
        logger.error('EvolutionCredentialController.delete error:', error.message || error);
        return res.status(500).json({ success: false, message: error.message });
      }
      return res.json({ success: true, message: 'Credencial excluída com sucesso' });
    } catch (err) {
      logger.error('EvolutionCredentialController.delete error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Inicializa instância na Evolution API e conecta WhatsApp Business via WebSocket
  async setupInstance(req, res) {
    try {
      const { id } = req.params;
      const existing = await EvolutionCredential.findById(id);
      if (!existing || existing.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Credencial não encontrada' });
      }
      
      // Obter nome do usuário (se disponível) ou usar um valor padrão
      let userName = req.user?.displayName || req.user?.user_metadata?.full_name || req.user?.profile?.full_name || 
                    req.user?.user_metadata?.first_name || req.user?.email?.split('@')[0] || 'Usuario';
      
      // Gerar nome da instância no formato "nomeUsuario - nomeAgente"
      const instanceName = `${userName} - ${existing.agent_name || existing.instance_name}`;
      
      const service = EvolutionService.fromCredential(existing);
      // Atualizar a instância com o novo formato de nome
      service.instanceName = instanceName;
      
      // Cria a instância na Evolution API e garante id da instância como id no Supabase
      const apiRes = await service.createInstance(existing.phone);
      const oldId = existing.id;
      const newId = apiRes.instance.instanceId;
      const { supabaseAdmin } = require('../config/supabase');
      const updates = {
        id: newId,
        instance_name: apiRes.instance.instanceName,
        partner_secret: apiRes.hash.apikey,
        metadata: { ...existing.metadata, evolution: apiRes }
      };
      const { data, error } = await supabaseAdmin
        .from('evolution_credentials')
        .update(updates)
        .eq('id', oldId)
        .select()
        .single();
      if (error) {
        logger.error('Erro ao atualizar credencial com id da instância:', error.message);
        throw error;
      }
      const saved = new EvolutionCredential(data);
      return res.json({ success: true, data: saved });
    } catch (err) {
      logger.error('EvolutionCredentialController.setupInstance error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Desconectar instância sem excluir o registro
  async disconnect(req, res) {
    try {
      const { id } = req.params;
      const existing = await EvolutionCredential.findById(id);
      if (!existing || existing.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Credencial não encontrada' });
      }
      const service = EvolutionService.fromCredential(existing);
      await service.logoutInstance();
      // Não deletar o registro, apenas desconectar
      return res.json({ success: true, message: 'Instância desconectada com sucesso' });
    } catch (err) {
      logger.error('EvolutionCredentialController.disconnect error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Busca QR Code de uma instância
  async fetchQrCode(req, res) {
    try {
      const { id } = req.params;
      const credential = await EvolutionCredential.findById(id);
      if (!credential || credential.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Credencial não encontrada' });
      }
      // Buscar QR Code fresco da Evolution API
      const service = EvolutionService.fromCredential(credential);
      let freshQr;
      try {
        freshQr = await service.fetchQrCode();
      } catch (err) {
        logger.warn('Falha ao buscar QR Code na API, usando metadata:', err.message);
        freshQr = credential.metadata?.evolution?.qrcode;
      }
      if (!freshQr) {
        return res.status(404).json({ success: false, message: 'QR Code não encontrado' });
      }
      
      // Processar dados do QR Code para formato consistente
      const qrData = { ...freshQr };
      
      // Se temos base64 mas está sem o prefixo data:image, adicione-o
      if (qrData.base64 && !qrData.base64.startsWith('data:image')) {
        // Verificar se é um base64 válido ou apenas um código
        if (/^[A-Za-z0-9+/=]+$/.test(qrData.base64)) {
          qrData.base64 = `data:image/png;base64,${qrData.base64}`;
        } else {
          // Se não é um base64 válido, pode ser que o campo esteja sendo usado incorretamente
          logger.warn('Base64 QR Code inválido, transformando em código', qrData.base64);
          qrData.code = qrData.base64;
          delete qrData.base64;
        }
      }
      
      // Atualizar metadata local com novo QR Code
      credential.metadata = {
        ...credential.metadata,
        evolution: {
          ...credential.metadata.evolution,
          qrcode: qrData
        }
      };
      await credential.save();
      // Retornar apenas os campos relevantes
      return res.json({ success: true, data: {
        base64: qrData.base64 || null,
        code: qrData.code || null,
        pairingCode: qrData.pairingCode || null
      }});
    } catch (error) {
      logger.error('EvolutionCredentialController.fetchQrCode error:', error.message || error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Exclui instância na Evolution API e credencial no banco local
  async deleteInstance(req, res) {
    try {
      const { id } = req.params;
      // Buscar credencial para obter dados da Evolution
      const cred = await EvolutionCredential.findById(id);
      if (!cred || cred.client_id !== req.user.id) {
        req.flash('error', 'Credencial não encontrada');
        return res.redirect('/whatsapp-credentials');
      }
      // Deletar instância na Evolution API
      const service = EvolutionService.fromCredential(cred);
      await service.deleteInstance();
      // Deletar credencial no banco
      const { supabaseAdmin } = require('../config/supabase');
      const { error } = await supabaseAdmin
        .from('evolution_credentials')
        .delete()
        .eq('id', id);
      if (error) {
        logger.error('Erro ao deletar credencial no banco:', error.message || error);
        req.flash('error', 'Erro ao excluir credencial');
      } else {
        req.flash('success', 'Instância e credencial excluídas com sucesso');
      }
      return res.redirect('/whatsapp-credentials');
    } catch (err) {
      logger.error('EvolutionCredentialController.deleteInstance error:', err.message || err);
      req.flash('error', 'Erro interno ao excluir credencial');
      return res.redirect('/whatsapp-credentials');
    }
  }

  // Reinicia instância na Evolution API
  async restartInstance(req, res) {
    try {
      const { id } = req.params;
      const existing = await EvolutionCredential.findById(id);
      if (!existing || existing.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Credencial não encontrada' });
      }
      const service = EvolutionService.fromCredential(existing);
      const data = await service.restartInstance();
      // Opcional: atualizar metadata ou status no banco, se necessário
      return res.json({ success: true, data });
    } catch (err) {
      logger.error('EvolutionCredentialController.restartInstance error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new EvolutionCredentialController(); 