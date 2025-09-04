const logger = require('../utils/logger');
const EvolutionService = require('../services/evolutionService');
const config = require('../config');
const { supabaseAdmin } = require('../config/supabase');
const { formatPhoneNumber } = require('../utils/utils');

class EvolutionCredentialController {
  // Lista credenciais do cliente autenticado
  async list(req, res) {
    try {
      const clientId = req.clientId;
      // Buscar todas as credenciais do cliente
      const { data: creds, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('client_id', clientId);
      if (error) throw error;
      
      // Para cada credencial, buscar e atualizar status da instância
      if (Array.isArray(creds) && creds.length > 0) {
        for (const cred of creds) {
          // Para credenciais de anúncios, definir status especial sem verificar Evolution API
          if (cred.connection_type === 'ads') {
            const requiresConfig = cred.metadata?.requires_configuration;
            const scheduledSetup = cred.metadata?.scheduled_setup;
            
            if (requiresConfig && scheduledSetup) {
              cred.status = "aguardando_configuracao";
            } else {
              cred.status = "configuracao_pendente";
            }
            continue; // Pular verificação na Evolution API
          }
          
          // Para credenciais WhatsApp Business normais, verificar status na Evolution API
          try {
            const service = EvolutionService.fromCredential(cred);
            try {
              const instances = await service.fetchInstances();
              if (instances && Array.isArray(instances)) {
                const instance = instances.find(i => i.instance?.instanceName === cred.instance_name);
                if (instance) {
                  cred.status = instance.instance.state; // ✅ Corrigido: usa 'state' em vez de 'status'
                  continue;
                }
              }
            } catch (fetchErr) {
              logger.warn(`Erro ao buscar instância via fetchInstances: ${fetchErr.message}, tentando connectionState`);
            }
            try {
              const state = await service.fetchConnectionState();
              if (state && state.state) {
                cred.status = state.state;
              }
            } catch (stateErr) {
              logger.warn(`Também falhou ao buscar status via connectionState: ${stateErr.message}`);
              cred.status = "unknown";
            }
          } catch (err) {
            logger.warn(`Erro geral ao buscar status da instância ${cred.instance_name}: ${err.message}`);
            cred.status = "unknown";
          }
        }
      }
      return res.json({ success: true, data: creds });
    } catch (err) {
      logger.error('whatsappCredentialController.list error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Busca por ID garantindo pertencimento ao cliente
  async getById(req, res) {
    try {
      const { id } = req.params;
      const { data: creds, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      const cred = creds && creds[0];
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
      if (!req.body.agent_name) {
        return res.status(400).json({ success: false, message: 'Nome do agente é obrigatório' });
      }
      
      let userName = req.user?.displayName || req.user?.user_metadata?.full_name || req.user?.profile?.full_name || req.user?.user_metadata?.first_name || req.user?.email?.split('@')[0] || 'Usuario';
      
      // Usar o instance_name fornecido ou gerar um padrão
      const instanceName = req.body.instance_name || `${userName} - ${req.body.agent_name}`;
      
      const payload = {
        client_id: req.clientId,
        phone: formatPhoneNumber(req.body.phone), // Formatar número removendo caracteres especiais
        instance_name: instanceName,
        agent_name: req.body.agent_name,
        connection_type: req.body.connection_type || 'whatsapp_business',
        metadata: {
          ...req.body.metadata,
          original_phone: req.body.phone // Salvar número original para referência
        }
      };
      
      const { data: saved, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      
      logger.info(`Nova credencial criada: ${saved.id} - Tipo: ${saved.connection_type} - Agente: ${saved.agent_name}`);
      
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
      const { data: creds, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      const existing = creds && creds[0];
      if (!existing || existing.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Credencial não encontrada' });
      }
      if (req.body.agent_name === undefined || req.body.agent_name === '') {
        return res.status(400).json({ success: false, message: 'Nome do agente é obrigatório' });
      }
      let userName = req.user?.displayName || req.user?.user_metadata?.full_name || req.user?.profile?.full_name || req.user?.user_metadata?.first_name || req.user?.email?.split('@')[0] || 'Usuario';
      const updatedInstanceName = `${userName} - ${req.body.agent_name}`;
      const updates = {};
      ['phone', 'agent_name', 'metadata'].forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });
      updates.instance_name = updatedInstanceName;
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('whatsapp_credentials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (updateError) throw updateError;
      return res.json({ success: true, data: updated });
    } catch (err) {
      logger.error('EvolutionCredentialController.update error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Exclui credencial do cliente autenticado e deleta instância da Evolution API
  async delete(req, res) {
    try {
      const { id } = req.params;
      const { data: creds, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      const existing = creds && creds[0];
      if (!existing || existing.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Credencial não encontrada' });
      }

      // Para credenciais WhatsApp Business, deletar instância na Evolution API
      // Para credenciais de anúncios, pular esta etapa
      if (existing.connection_type === 'whatsapp_business') {
        try {
          const service = EvolutionService.fromCredential(existing);
          await service.deleteInstance();
          logger.info(`Instância ${existing.instance_name} deletada da Evolution API`);
        } catch (evolutionError) {
          // Log mas não falhe completamente se a Evolution API não responder
          logger.warn(`Falha ao deletar instância da Evolution API: ${evolutionError.message}`);
        }
      } else {
        logger.info(`Credencial de anúncios ${existing.instance_name} será deletada apenas do banco (não há instância na Evolution API)`);
      }

      // Deletar credencial do banco
      const { error: deleteError } = await supabaseAdmin
        .from('whatsapp_credentials')
        .delete()
        .eq('id', id);
      if (deleteError) {
        logger.error('EvolutionCredentialController.delete error:', deleteError.message || deleteError);
        return res.status(500).json({ success: false, message: deleteError.message });
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
      const { data: creds, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      const existing = creds && creds[0];
      if (!existing || existing.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Credencial não encontrada' });
      }
      
      // Verificar se é uma credencial de anúncios que requer configuração manual
      if (existing.connection_type === 'ads') {
        return res.status(400).json({ 
          success: false, 
          message: 'Credenciais para anúncios requerem configuração manual pela nossa equipe. Por favor, agende um horário.',
          requires_scheduling: true
        });
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
      const updates = {
        id: newId,
        instance_name: apiRes.instance.instanceName,
        metadata: { 
          ...existing.metadata, 
          evolution: apiRes,
          evolution_api_key: apiRes.hash.apikey
        }
      };
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('whatsapp_credentials')
        .update(updates)
        .eq('id', oldId)
        .select()
        .single();
      if (updateError) {
        logger.error('Erro ao atualizar credencial com id da instância:', updateError.message);
        throw updateError;
      }
      return res.json({ success: true, data: updated });
    } catch (err) {
      logger.error('EvolutionCredentialController.setupInstance error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Desconectar instância sem excluir o registro
  async disconnect(req, res) {
    try {
      const { id } = req.params;
      const { data: creds, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      const existing = creds && creds[0];
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
      const { data: creds, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      const credential = creds && creds[0];
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
      const updatedMetadata = {
        ...credential.metadata,
        evolution: {
          ...credential.metadata?.evolution,
          qrcode: qrData
        }
      };
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('whatsapp_credentials')
        .update({ metadata: updatedMetadata })
        .eq('id', id)
        .select();
      if (updateError) throw updateError;
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
      const { data: creds, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      const cred = creds && creds[0];
      if (!cred || cred.client_id !== req.user.id) {
        req.flash('error', 'Credencial não encontrada');
        return res.redirect('/whatsapp-credentials');
      }
      // Deletar instância na Evolution API
      const service = EvolutionService.fromCredential(cred);
      await service.deleteInstance();
      // Deletar credencial no banco
      const { error: deleteError } = await supabaseAdmin
        .from('whatsapp_credentials')
        .delete()
        .eq('id', id);
      if (deleteError) {
        logger.error('Erro ao deletar credencial no banco:', deleteError.message || deleteError);
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
      const { data: creds, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      const existing = creds && creds[0];
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