const logger = require('../utils/logger');
const EvolutionService = require('../services/evolutionService');
const WhatsappService = require('../services/whatsappService');
const smsRateLimitService = require('../services/smsRateLimitService');
const config = require('../config');
const { supabaseAdmin } = require('../config/supabase');
const axios = require('axios'); // Adicionado para o novo método

class WhatsappCredentialController {
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
          // Para credenciais de anúncios, verificar status na API da Meta
          if (cred.connection_type === 'ads') {
            try {
              // Verificar se tem os dados necessários para verificar status
              if (cred.wpp_number_id && cred.wpp_access_token) {
                logger.info(`[LIST] Verificando status da credencial ads ${cred.id} na API da Meta`);
                
                const statusResult = await WhatsappService.checkPhoneNumberStatus(
                  cred.wpp_number_id,
                  cred.wpp_access_token
                );
                
                if (statusResult.success && statusResult.status) {
                  cred.status = statusResult.status;
                  logger.info(`[LIST] Status atualizado para ${cred.id}: ${statusResult.status}`);
                } else {
                  // Se não conseguiu verificar, usar status do banco ou padrão
                  cred.status = cred.status || "aguardando_configuracao";
                  logger.warn(`[LIST] Não foi possível verificar status da credencial ${cred.id}`);
                }
              } else {
                // Se não tem dados da Meta, verificar metadados
                const requiresConfig = cred.metadata?.requires_configuration;
                const scheduledSetup = cred.metadata?.scheduled_setup;
                if (requiresConfig && scheduledSetup) {
                  cred.status = "aguardando_configuracao";
                } else {
                  cred.status = "configuracao_pendente";
                }
                logger.info(`[LIST] Credencial ads ${cred.id} sem dados da Meta, usando metadados`);
              }
            } catch (metaErr) {
              logger.warn(`[LIST] Erro ao verificar status da credencial ads ${cred.id}: ${metaErr.message}`);
              // Em caso de erro, manter status atual ou usar padrão
              cred.status = cred.status || "aguardando_configuracao";
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
                  cred.status = instance.instance.status;
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
      logger.error('WhatsappCredentialController.list error:', err.message || err);
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
      logger.error('WhatsappCredentialController.getById error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Cria nova credencial para o cliente autenticado
  async create(req, res) {
    try {
      if (!req.body.agent_name) {
        return res.status(400).json({ success: false, message: 'Nome do agente é obrigatório' });
      }
      
      // Log para depuração detalhada
      logger.info(`[CREATE] Iniciando criação de credencial para usuário ${req.user?.id}`);
      logger.info(`[CREATE] req.user completo:`, {
        id: req.user?.id,
        email: req.user?.email,
        full_name: req.user?.full_name,
        displayName: req.user?.displayName,
        name: req.user?.name,
        user_metadata: req.user?.user_metadata,
        profile: req.user?.profile
      });
      
      // Corrigir obtenção do nome do usuário
      let userName = req.user?.full_name || req.user?.displayName || req.user?.name || req.user?.user_metadata?.full_name || req.user?.profile?.full_name || req.user?.user_metadata?.first_name || (req.user?.email ? req.user.email.split('@')[0] : '') || 'Usuario';
      
      logger.info(`[CREATE] userName após primeira tentativa: "${userName}"`);
      
      // Se ainda não encontrou um nome válido, buscar no banco
      if (!userName || userName === 'Usuario') {
        logger.info(`[CREATE] Nome não encontrado, buscando no banco de dados...`);
        try {
          const { data: profile, error: profileError } = await require('../config/supabase').supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();
          
          logger.info(`[CREATE] Resultado da busca no banco:`, {
            hasProfile: !!profile,
            profileError: profileError?.message,
            profileData: profile ? {
              full_name: profile.full_name,
              first_name: profile.first_name,
              last_name: profile.last_name,
              name: profile.name
            } : null
          });
          
          if (!profileError && profile && profile.full_name) {
            userName = profile.full_name;
            logger.info(`[CREATE] Nome encontrado no banco: "${userName}"`);
          }
        } catch (profileCatchErr) {
          logger.error(`[CREATE] Erro ao buscar perfil: ${profileCatchErr.message}`);
        }
      }
      
      logger.info(`[CREATE] userName final: "${userName}"`);
      
      // Bloquear criação se nome não encontrado
      if (!userName || userName === 'Usuario') {
        logger.warn(`[CREATE] Nome do usuário não encontrado, bloqueando criação`);
        return res.status(400).json({
          success: false,
          message: 'Não foi possível identificar o nome do usuário. Por favor, complete seu perfil antes de criar uma instância.'
        });
      }
      // Usar o instance_name fornecido pelo frontend, se vier preenchido
      let instanceName = req.body.instance_name;
      if (!instanceName || typeof instanceName !== 'string' || !instanceName.trim()) {
        instanceName = `${userName} - ${req.body.agent_name}`;
      }
      // Salvar no Supabase com o mesmo nome que será usado na Evolution API
      const payload = {
        client_id: req.clientId,
        phone: req.body.phone,
        instance_name: instanceName,
        agent_name: req.body.agent_name,
        connection_type: req.body.connection_type || 'whatsapp_business',
        wpp_number_id: req.body.wpp_number_id || null,
        wpp_access_token: req.body.wpp_access_token || null,
        wpp_business_account_id: req.body.wpp_business_account_id || null,
        metadata: req.body.metadata || {}
      };
      
      logger.info(`[CREATE] Salvando credencial no banco:`, {
        agent_name: payload.agent_name,
        phone: payload.phone,
        connection_type: payload.connection_type,
        wpp_number_id: payload.wpp_number_id,
        wpp_access_token: payload.wpp_access_token ? `${payload.wpp_access_token.substring(0, 10)}...` : 'null',
        wpp_business_account_id: payload.wpp_business_account_id,
        has_metadata: !!payload.metadata
      });
      const { data: saved, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      logger.info(`Nova credencial criada: ${saved.id} - Tipo: ${saved.connection_type} - Agente: ${saved.agent_name}`);
      // Criar instância na Evolution API usando o mesmo nome
      // (Se necessário, adicione aqui a chamada para EvolutionService usando instanceName)
      return res.status(201).json({ success: true, data: saved });
    } catch (err) {
      logger.error('WhatsappCredentialController.create error:', err.message || err);
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
      // Corrigir obtenção do nome do usuário
      let userName = req.user?.full_name || req.user?.displayName || req.user?.name || req.user?.user_metadata?.full_name || req.user?.profile?.full_name || req.user?.user_metadata?.first_name || (req.user?.email ? req.user.email.split('@')[0] : '') || 'Usuario';
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
      logger.error('WhatsappCredentialController.update error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Exclui credencial do cliente autenticado e deleta instância da API
  async delete(req, res) {
    try {
      const { id } = req.params;
      
      logger.info(`[DELETE] Iniciando exclusão da credencial ${id}`);
      logger.info(`[DELETE] req.user:`, {
        id: req.user?.id,
        email: req.user?.email,
        full_name: req.user?.full_name,
        displayName: req.user?.displayName
      });
      logger.info(`[DELETE] req.clientId: ${req.clientId}`);
      
      // Buscar credencial para obter dados da API
      const { data: creds, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('id', id);
        
      if (error) {
        logger.error(`[DELETE] Erro ao buscar credencial: ${error.message}`);
        throw error;
      }
      
      const existing = creds && creds[0];
      logger.info(`[DELETE] Credencial encontrada:`, existing ? {
        id: existing.id,
        instance_name: existing.instance_name,
        client_id: existing.client_id,
        connection_type: existing.connection_type
      } : 'Nenhuma credencial encontrada');
      
      if (!existing || existing.client_id !== req.clientId) {
        logger.warn(`[DELETE] Credencial não encontrada ou não pertence ao cliente. ID: ${id}, clientId: ${req.clientId}`);
        return res.status(404).json({ success: false, message: 'Credencial não encontrada' });
      }
      
      // Para credenciais WhatsApp Business, deletar instância na API
      // Para credenciais de anúncios, pular esta etapa
      if (existing.connection_type === 'whatsapp_business') {
        try {
          logger.info(`[DELETE] Deletando instância da API: ${existing.instance_name}`);
          const service = EvolutionService.fromCredential(existing);
          await service.deleteInstance();
          logger.info(`[DELETE] Instância ${existing.instance_name} deletada da API`);
        } catch (evolutionError) {
          // Log mas não falhe completamente se a API não responder
          logger.warn(`[DELETE] Falha ao deletar instância da API: ${evolutionError.message}`);
        }
      } else {
        logger.info(`[DELETE] Credencial de anúncios ${existing.instance_name} será deletada apenas do banco (não há instância na API)`);
      }
      
      // Deletar credencial do banco
      logger.info(`[DELETE] Deletando credencial do banco de dados`);
      const { error: deleteError } = await supabaseAdmin
        .from('whatsapp_credentials')
        .delete()
        .eq('id', id);
        
      if (deleteError) {
        logger.error(`[DELETE] Erro ao deletar do banco: ${deleteError.message}`);
        return res.status(500).json({ success: false, message: deleteError.message });
      }
      
      logger.info(`[DELETE] Credencial excluída com sucesso`);
      return res.json({ success: true, message: 'Credencial excluída com sucesso' });
    } catch (err) {
      logger.error(`[DELETE] Erro geral: ${err.message}`);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Inicializa instância na API e conecta WhatsApp Business via WebSocket
  async setupInstance(req, res) {
    try {
      const { id } = req.params;
      
      logger.info(`[SETUP] Iniciando setup da instância ${id}`);
      logger.info(`[SETUP] req.user:`, {
        id: req.user?.id,
        email: req.user?.email,
        full_name: req.user?.full_name,
        displayName: req.user?.displayName,
        name: req.user?.name
      });
      
      const { data: creds, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      const existing = creds && creds[0];
      if (!existing || existing.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Credencial não encontrada' });
      }
      
      logger.info(`[SETUP] Credencial encontrada:`, {
        id: existing.id,
        instance_name: existing.instance_name,
        agent_name: existing.agent_name,
        connection_type: existing.connection_type
      });
      
      // Verificar se é uma credencial de anúncios que requer configuração manual
      if (existing.connection_type === 'ads') {
        return res.status(400).json({ 
          success: false, 
          message: 'Credenciais para anúncios requerem configuração manual pela nossa equipe. Por favor, agende um horário.',
          requires_scheduling: true
        });
      }
      
      // Corrigir obtenção do nome do usuário
      let userName = req.user?.full_name || req.user?.displayName || req.user?.name || req.user?.user_metadata?.full_name || req.user?.profile?.full_name || req.user?.user_metadata?.first_name || (req.user?.email ? req.user.email.split('@')[0] : '') || 'Usuario';
      
      logger.info(`[SETUP] userName obtido: "${userName}"`);
      
      // Gerar nome da instância no formato "nomeUsuario - nomeAgente"
      const instanceName = `${userName} - ${existing.agent_name || existing.instance_name}`;
      
      logger.info(`[SETUP] instance_name gerado: "${instanceName}"`);
      
      const service = EvolutionService.fromCredential(existing);
      // Atualizar a instância com o novo formato de nome
      service.instanceName = instanceName;
      
      logger.info(`[SETUP] Criando instância na Evolution API com nome: "${instanceName}"`);
      
      // Cria a instância na API e garante id da instância como id no Supabase
      const apiRes = await service.createInstance(existing.phone);
      
      logger.info(`[SETUP] Resposta da Evolution API:`, {
        success: !!apiRes,
        instanceId: apiRes?.instance?.instanceId,
        instanceName: apiRes?.instance?.instanceName
      });
      
      if (!apiRes || !apiRes.instance) {
        throw new Error('Falha ao criar instância na Evolution API');
      }
      
      const oldId = existing.id;
      const newId = apiRes.instance.instanceId;
      
      // Atualizar credencial no banco com o novo ID da instância
      const { data: updatedCred, error: updateError } = await supabaseAdmin
        .from('whatsapp_credentials')
        .update({
          id: newId,
          instance_name: instanceName,
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', oldId)
        .select()
        .single();
        
      if (updateError) {
        logger.error(`[SETUP] Erro ao atualizar credencial: ${updateError.message}`);
        throw updateError;
      }
      
      logger.info(`[SETUP] Credencial atualizada com sucesso:`, {
        oldId,
        newId,
        instanceName: updatedCred.instance_name,
        status: updatedCred.status
      });
      
      // Retornar a credencial atualizada
      return res.json({ 
        success: true, 
        data: updatedCred,
        message: 'Instância criada com sucesso'
      });
      
    } catch (err) {
      logger.error('WhatsappCredentialController.setupInstance error:', err.message || err);
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
      
      // Verificar se é uma credencial WhatsApp Business
      if (existing.connection_type !== 'whatsapp_business') {
        return res.status(400).json({ 
          success: false, 
          message: 'Esta funcionalidade é apenas para credenciais WhatsApp Business' 
        });
      }
      
      const service = EvolutionService.fromCredential(existing);
      await service.logoutInstance();
      // Não deletar o registro, apenas desconectar
      return res.json({ success: true, message: 'Instância desconectada com sucesso' });
    } catch (err) {
      logger.error('WhatsappCredentialController.disconnect error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Exclui instância na API e credencial no banco local
  async deleteInstance(req, res) {
    try {
      const { id } = req.params;
      // Buscar credencial para obter dados da API
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
      
      // Verificar se é uma credencial WhatsApp Business
      if (cred.connection_type !== 'whatsapp_business') {
        req.flash('error', 'Esta funcionalidade é apenas para credenciais WhatsApp Business');
        return res.redirect('/whatsapp-credentials');
      }
      
      // Deletar instância na API
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
      logger.error('WhatsappCredentialController.deleteInstance error:', err.message || err);
      req.flash('error', 'Erro interno ao excluir credencial');
      return res.redirect('/whatsapp-credentials');
    }
  }

  // Reinicia instância na API
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
      
      // Verificar se é uma credencial WhatsApp Business
      if (existing.connection_type !== 'whatsapp_business') {
        return res.status(400).json({ 
          success: false, 
          message: 'Esta funcionalidade é apenas para credenciais WhatsApp Business' 
        });
      }
      
      const service = EvolutionService.fromCredential(existing);
      await service.restartInstance();
      return res.json({ success: true, message: 'Instância reiniciada com sucesso' });
    } catch (err) {
      logger.error('WhatsappCredentialController.restartInstance error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Busca QR Code de uma instância
  async fetchQrCode(req, res) {
    try {
      const { id } = req.params;
      
      logger.info(`[QRCODE] Buscando QR Code para credencial ${id}`);
      
      const { data: creds, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      const credential = creds && creds[0];
      if (!credential || credential.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Credencial não encontrada' });
      }
      
      logger.info(`[QRCODE] Credencial encontrada:`, {
        id: credential.id,
        instance_name: credential.instance_name,
        connection_type: credential.connection_type
      });
      
      // Verificar se é uma credencial WhatsApp Business
      if (credential.connection_type !== 'whatsapp_business') {
        return res.status(400).json({ 
          success: false, 
          message: 'QR Code é apenas para credenciais WhatsApp Business. Para credenciais de ads, use "Verificar Status".' 
        });
      }
      
      // Primeiro, tentar usar QR Code em cache se ainda for válido
      const cachedQr = credential.metadata?.evolution?.qrcode;
      if (cachedQr && (cachedQr.base64 || cachedQr.code || cachedQr.pairingCode)) {
        logger.info(`[QRCODE] Usando QR Code em cache`);
        return res.json({ 
          success: true, 
          data: {
            base64: cachedQr.base64 || null,
            code: cachedQr.code || null,
            pairingCode: cachedQr.pairingCode || null
          }
        });
      }
      
      // Buscar QR Code fresco da Evolution API
      const service = EvolutionService.fromCredential(credential);
      let freshQr;
      try {
        logger.info(`[QRCODE] Solicitando QR Code da Evolution API...`);
        freshQr = await service.fetchQrCode();
        logger.info(`[QRCODE] QR Code obtido da API:`, {
          hasBase64: !!freshQr?.base64,
          hasCode: !!freshQr?.code,
          hasPairingCode: !!freshQr?.pairingCode
        });
      } catch (err) {
        logger.warn(`[QRCODE] Falha ao buscar QR Code na API: ${err.message}, usando metadata`);
        freshQr = cachedQr;
      }
      
      if (!freshQr) {
        logger.error(`[QRCODE] QR Code não encontrado`);
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
          logger.warn('[QRCODE] Base64 QR Code inválido, transformando em código', qrData.base64);
          qrData.code = qrData.base64;
          delete qrData.base64;
        }
      }
      
      // Atualizar metadata local com novo QR Code (em background, não bloquear resposta)
      const updatedMetadata = {
        ...credential.metadata,
        evolution: {
          ...credential.metadata?.evolution,
          qrcode: qrData
        }
      };
      
      // Atualizar em background para não bloquear a resposta
      supabaseAdmin
        .from('whatsapp_credentials')
        .update({ metadata: updatedMetadata })
        .eq('id', id)
        .then(() => {
          logger.info(`[QRCODE] Metadata atualizada com sucesso`);
        })
        .catch((updateError) => {
          logger.error(`[QRCODE] Erro ao atualizar metadata: ${updateError.message}`);
        });
      
      logger.info(`[QRCODE] QR Code retornado com sucesso`);
      
      // Retornar imediatamente
      return res.json({ 
        success: true, 
        data: qrData
      });
      
    } catch (err) {
      logger.error('WhatsappCredentialController.fetchQrCode error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Verificar status de números WhatsApp via API da Meta
  async checkPhoneNumberStatus(req, res) {
    try {
      const { id } = req.params;
      
      logger.info(`[STATUS] Verificando status do número para credencial: ${id}`);
      
      // Buscar credencial
      const { data: creds, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('id', id);
      
      if (error) throw error;
      
      const credential = creds && creds[0];
      if (!credential || credential.client_id !== req.clientId) {
        return res.status(404).json({ success: false, message: 'Credencial não encontrada' });
      }
      
      // Verificar se é uma credencial de ads com dados necessários
      if (credential.connection_type !== 'ads') {
        return res.status(400).json({ 
          success: false, 
          message: 'Esta credencial não é do tipo ads' 
        });
      }
      
      if (!credential.wpp_number_id || !credential.wpp_access_token) {
        return res.status(400).json({ 
          success: false, 
          message: 'Credencial não possui wpp_number_id ou wpp_access_token' 
        });
      }
      
      // Verificar status via API da Meta
      const statusResult = await WhatsappService.checkPhoneNumberStatus(
        credential.wpp_number_id,
        credential.wpp_access_token
      );
      
      if (statusResult.success) {
        // Atualizar status no banco de dados
        const { data: updateResult, error: updateError } = await supabaseAdmin
          .from('whatsapp_credentials')
          .update({
            status: statusResult.status,
            status_description: `Status verificado via Meta API: ${statusResult.status}`,
            metadata: {
              ...credential.metadata,
              last_status_check: new Date().toISOString(),
              meta_api_status: statusResult.status,
              meta_api_status_code: statusResult.status_code
            }
          })
          .eq('id', credential.id)
          .select()
          .single();
        
        if (updateError) {
          logger.warn(`[STATUS] Erro ao atualizar status no banco: ${updateError.message}`);
        }
        
        return res.json({
          success: true,
          data: {
            credential_id: id,
            phone: credential.phone,
            wpp_number_id: credential.wpp_number_id,
            status: statusResult.status,
            meta_data: statusResult.data
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: statusResult.error || 'Erro ao verificar status',
          data: {
            credential_id: id,
            phone: credential.phone,
            wpp_number_id: credential.wpp_number_id,
            status: 'unknown'
          }
        });
      }
      
    } catch (err) {
      logger.error(`[STATUS] Erro ao verificar status: ${err.message}`);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Verificar status de todos os números do cliente
  async checkAllPhoneNumbersStatus(req, res) {
    try {
      const clientId = req.clientId;
      
      logger.info(`[STATUS] Verificando status de todos os números do cliente: ${clientId}`);
      
      // Buscar todas as credenciais de ads do cliente
      const { data: creds, error } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('client_id', clientId)
        .eq('connection_type', 'ads');
      
      if (error) throw error;
      
      if (!creds || creds.length === 0) {
        return res.json({
          success: true,
          data: [],
          message: 'Nenhuma credencial de ads encontrada'
        });
      }
      
      // Verificar status de todos os números
      const results = await WhatsappService.checkMultiplePhoneNumbers(creds);
      
      // Atualizar status no banco de dados
      for (const result of results) {
        if (result.success) {
          const credential = creds.find(c => c.id === result.credential_id);
          if (credential) {
            const { error: updateError } = await supabaseAdmin
              .from('whatsapp_credentials')
              .update({ 
                status: result.status,
                metadata: {
                  ...credential.metadata,
                  last_status_check: new Date().toISOString(),
                  meta_status: result
                }
              })
              .eq('id', result.credential_id);
            
            if (updateError) {
              logger.warn(`[STATUS] Erro ao atualizar status da credencial ${result.credential_id}: ${updateError.message}`);
            }
          }
        }
      }
      
      return res.json({
        success: true,
        data: results,
        message: `Status verificado para ${results.length} números`
      });
      
    } catch (err) {
      logger.error(`[STATUS] Erro ao verificar status de todos os números: ${err.message}`);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Adicionar novo número de telefone à conta WhatsApp Business
  async addPhoneNumber(req, res) {
    try {
      const { phoneNumber, businessAccountId, accessToken } = req.body;
      
      if (!phoneNumber || !businessAccountId || !accessToken) {
        return res.status(400).json({
          success: false,
          message: 'phoneNumber, businessAccountId e accessToken são obrigatórios'
        });
      }
      
      logger.info(`[ADD_PHONE] Adicionando número ${phoneNumber} à conta ${businessAccountId}`);
      
      const result = await WhatsappService.addPhoneNumber(phoneNumber, accessToken, businessAccountId);
      
      if (result.success) {
        return res.json({
          success: true,
          data: result.data,
          message: 'Número adicionado com sucesso'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.error,
          details: result.details
        });
      }
      
    } catch (err) {
      logger.error(`[ADD_PHONE] Erro ao adicionar número: ${err.message}`);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Verificar disponibilidade de um número
  async checkPhoneNumberAvailability(req, res) {
    try {
      const { phoneNumber, accessToken } = req.body;
      
      if (!phoneNumber || !accessToken) {
        return res.status(400).json({
          success: false,
          message: 'phoneNumber e accessToken são obrigatórios'
        });
      }
      
      logger.info(`[CHECK_AVAILABILITY] Verificando disponibilidade do número ${phoneNumber}`);
      
      const result = await WhatsappService.checkPhoneNumberAvailability(phoneNumber, accessToken);
      
      if (result.success) {
        return res.json({
          success: true,
          data: result.data,
          available: result.available,
          message: result.available ? 'Número disponível' : 'Número não disponível'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.error,
          details: result.details
        });
      }
      
    } catch (err) {
      logger.error(`[CHECK_AVAILABILITY] Erro ao verificar disponibilidade: ${err.message}`);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Listar números de telefone da conta
  async listPhoneNumbers(req, res) {
    try {
      const { businessAccountId, accessToken } = req.body;
      
      if (!businessAccountId || !accessToken) {
        return res.status(400).json({
          success: false,
          message: 'businessAccountId e accessToken são obrigatórios'
        });
      }
      
      logger.info(`[LIST_PHONES] Listando números da conta ${businessAccountId}`);
      
      const result = await WhatsappService.listPhoneNumbers(accessToken, businessAccountId);
      
      if (result.success) {
        return res.json({
          success: true,
          data: result.data,
          total: result.total,
          message: `${result.total} números encontrados`
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.error,
          details: result.details
        });
      }
      
    } catch (err) {
      logger.error(`[LIST_PHONES] Erro ao listar números: ${err.message}`);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Remover número de telefone da conta
  async removePhoneNumber(req, res) {
    try {
      const { phoneNumberId, accessToken } = req.body;
      
      if (!phoneNumberId || !accessToken) {
        return res.status(400).json({
          success: false,
          message: 'phoneNumberId e accessToken são obrigatórios'
        });
      }
      
      logger.info(`[REMOVE_PHONE] Removendo número ${phoneNumberId}`);
      
      const result = await WhatsappService.removePhoneNumber(phoneNumberId, accessToken);
      
      if (result.success) {
        return res.json({
          success: true,
          data: result.data,
          message: 'Número removido com sucesso'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.error,
          details: result.details
        });
      }
      
    } catch (err) {
      logger.error(`[REMOVE_PHONE] Erro ao remover número: ${err.message}`);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Método para criar conta WhatsApp na API oficial da Meta (fluxo automatizado)
  async createWhatsAppAccount(req, res) {
    try {
      const {
        phoneNumber,
        businessAccountId,
        accessToken,
        wppName,
        displayName,
        timezone = 'America/Sao_Paulo',
        category = 'BUSINESS',
        businessDescription = 'Conta criada automaticamente via sistema.'
      } = req.body;

      // Log detalhado do req.body para debug ANTES da desestruturação
      logger.info(`[CREATE_WHATSAPP_ACCOUNT] req.body completo:`, JSON.stringify(req.body, null, 2));
      logger.info(`[CREATE_WHATSAPP_ACCOUNT] req.body keys:`, Object.keys(req.body || {}));
      logger.info(`[CREATE_WHATSAPP_ACCOUNT] req.body.phoneNumber:`, req.body?.phoneNumber);
      
      logger.info(`[CREATE_WHATSAPP_ACCOUNT] Iniciando criação de conta para ${phoneNumber}`);
      logger.info(`[CREATE_WHATSAPP_ACCOUNT] Dados recebidos:`, {
        phoneNumber,
        businessAccountId,
        accessToken: accessToken ? `${accessToken.substring(0, 10)}...` : 'undefined',
        displayName
      });
      logger.info(`[CREATE_WHATSAPP_ACCOUNT] Tipos dos dados:`, {
        phoneNumber: typeof phoneNumber,
        businessAccountId: typeof businessAccountId,
        accessToken: typeof accessToken,
        displayName: typeof displayName
      });

      // Validar dados obrigatórios
      if (!phoneNumber) {
        logger.error(`[CREATE_WHATSAPP_ACCOUNT] phoneNumber está undefined ou vazio`);
        return res.status(400).json({
          success: false,
          error: 'phoneNumber é obrigatório'
        });
      }

      if (!businessAccountId) {
        logger.error(`[CREATE_WHATSAPP_ACCOUNT] businessAccountId está undefined ou vazio`);
        return res.status(400).json({
          success: false,
          error: 'businessAccountId é obrigatório'
        });
      }

      if (!accessToken) {
        logger.error(`[CREATE_WHATSAPP_ACCOUNT] accessToken está undefined ou vazio`);
        return res.status(400).json({
          success: false,
          error: 'accessToken é obrigatório'
        });
      }

      if (!displayName) {
        logger.error(`[CREATE_WHATSAPP_ACCOUNT] displayName está undefined ou vazio`);
        return res.status(400).json({
          success: false,
          error: 'displayName é obrigatório'
        });
      }

      // 1. Verificar disponibilidade do número
      logger.info(`[CREATE_WHATSAPP_ACCOUNT] Verificando disponibilidade do número ${phoneNumber}`);
      const availabilityResult = await WhatsappService.checkPhoneNumberAvailability(phoneNumber, accessToken, wppName);
      
      if (!availabilityResult.success) {
        logger.error(`[CREATE_WHATSAPP_ACCOUNT] Erro ao verificar disponibilidade: ${availabilityResult.error}`);
        
        // Se o erro for de número já registrado, retornar erro específico
        if (availabilityResult.code === 'NUMBER_ALREADY_REGISTERED') {
          return res.status(400).json({
            success: false,
            error: availabilityResult.error,
            code: 'NUMBER_ALREADY_REGISTERED',
            details: availabilityResult.details
          });
        }
        
        return res.status(400).json({
          success: false,
          error: `Erro ao verificar disponibilidade do número: ${availabilityResult.error}`
        });
      }

      if (!availabilityResult.available) {
        logger.warn(`[CREATE_WHATSAPP_ACCOUNT] Número ${phoneNumber} não está disponível`);
        return res.status(400).json({
          success: false,
          error: `Número ${phoneNumber} não está disponível para registro`
        });
      }

      // 2. Adicionar número à conta de negócios
      logger.info(`[CREATE_WHATSAPP_ACCOUNT] Adicionando número ${phoneNumber} à conta de negócios`);
      const addResult = await WhatsappService.addPhoneNumber(phoneNumber, accessToken, businessAccountId, wppName);
      
      let phoneNumberId = null;
      let metaApiSuccess = false;
      let metaApiError = null;
      let shouldSaveToSupabase = true;
      let errorStatus = 'meta_api_error';
      
      if (addResult.success) {
        phoneNumberId = addResult.phone_number_id;
        metaApiSuccess = true;
        logger.info(`[CREATE_WHATSAPP_ACCOUNT] Número adicionado com ID: ${phoneNumberId}`);
      } else {
        metaApiError = addResult.error;
        logger.error(`[CREATE_WHATSAPP_ACCOUNT] Erro ao adicionar número na Meta API: ${addResult.error}`);
        logger.info(`[CREATE_WHATSAPP_ACCOUNT] Detalhes do erro:`, {
          error: addResult.error,
          code: addResult.code,
          details: addResult.details
        });
        
        // SEMPRE salvar no Supabase quando há erro na Meta API, exceto para erros críticos
        // Casos que NÃO devem salvar no Supabase:
        if (addResult.code === 'NUMBER_ALREADY_REGISTERED') {
          shouldSaveToSupabase = false;
          logger.info(`[CREATE_WHATSAPP_ACCOUNT] Número já registrado, não salvando no Supabase`);
        } else if (addResult.error.includes('access token') || addResult.error.includes('Token de acesso')) {
          shouldSaveToSupabase = false;
          logger.info(`[CREATE_WHATSAPP_ACCOUNT] Token de acesso inválido, não salvando no Supabase`);
        } else if (addResult.error.includes('business') || addResult.error.includes('Business Account')) {
          shouldSaveToSupabase = false;
          logger.info(`[CREATE_WHATSAPP_ACCOUNT] Business ID inválido, não salvando no Supabase`);
        } else {
          // Casos que DEVEM salvar no Supabase:
          if (addResult.code === 'VERIFIED_NAME_REQUIRED') {
            errorStatus = 'pending_verification';
          } else if (addResult.error.includes('verificação de nome já está em andamento')) {
            errorStatus = 'name_verification_in_progress';
          } else {
            // Para qualquer outro erro, salvar com status de erro
            errorStatus = 'meta_api_error';
          }
          logger.info(`[CREATE_WHATSAPP_ACCOUNT] Erro na Meta API: ${addResult.error}, salvando credencial com status: ${errorStatus}`);
        }
        
        logger.info(`[CREATE_WHATSAPP_ACCOUNT] Decisão de salvamento:`, {
          shouldSaveToSupabase,
          errorStatus,
          metaApiError
        });
      }

      // 3. Configurar informações do negócio (apenas se a Meta API foi bem-sucedida)
      if (metaApiSuccess && phoneNumberId) {
        logger.info(`[CREATE_WHATSAPP_ACCOUNT] Configurando informações do negócio`);
        const businessInfo = {
          messaging_product: 'whatsapp',
          display_name: displayName,
          timezone: timezone,
          category: category,
          business_description: businessDescription
        };

        try {
          const businessConfigResponse = await axios.post(
            `https://graph.facebook.com/v23.0/${phoneNumberId}`,
            businessInfo,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          logger.info(`[CREATE_WHATSAPP_ACCOUNT] Informações do negócio configuradas:`, businessConfigResponse.data);
        } catch (businessErr) {
          logger.warn(`[CREATE_WHATSAPP_ACCOUNT] Erro ao configurar informações do negócio: ${businessErr.message}`);
          // Não falhar se a configuração do negócio falhar
        }

        // 4. NÃO iniciar processo de verificação automaticamente
        // A verificação será solicitada manualmente pelo usuário através do botão "Enviar SMS"
        logger.info(`[CREATE_WHATSAPP_ACCOUNT] Verificação não iniciada automaticamente - será solicitada manualmente`);
      } else {
        logger.info(`[CREATE_WHATSAPP_ACCOUNT] Pulando configuração do negócio devido a erro na Meta API`);
      }

      // 5. Salvar credencial no Supabase (condicional)
      let savedCredential = null;
      
      // Determinar status final baseado no resultado da Meta API
      let finalStatus = 'pending_verification';
      if (!metaApiSuccess) {
        finalStatus = errorStatus || 'meta_api_error';
      }
      
      logger.info(`[CREATE_WHATSAPP_ACCOUNT] Verificando se deve salvar no Supabase:`, {
        metaApiSuccess,
        shouldSaveToSupabase,
        condition: metaApiSuccess || shouldSaveToSupabase,
        finalStatus
      });
      
      if (metaApiSuccess || shouldSaveToSupabase) {
        logger.info(`[CREATE_WHATSAPP_ACCOUNT] Salvando credencial no Supabase`);
        
        // Debug: verificar dados do usuário
        logger.info(`[CREATE_WHATSAPP_ACCOUNT] Dados do usuário:`, {
          user: req.user,
          full_name: req.user?.full_name,
          name: req.user?.name,
          email: req.user?.email,
          user_metadata: req.user?.user_metadata
        });
        
        // Tentar obter o nome do usuário de diferentes formas
        let userName = 'Usuario';
        if (req.user?.full_name) {
          userName = req.user.full_name;
        } else if (req.user?.name) {
          userName = req.user.name;
        } else if (req.user?.user_metadata?.full_name) {
          userName = req.user.user_metadata.full_name;
        } else if (req.user?.user_metadata?.name) {
          userName = req.user.user_metadata.name;
        } else if (req.user?.email) {
          userName = req.user.email.split('@')[0]; // Usar parte do email
        }
        
        // Usar displayName como nome do usuário e wppName como nome do agente
        const instanceName = `${displayName} - ${wppName} - Anúncios`;

        const credentialPayload = {
          client_id: req.clientId,
          phone: phoneNumber,
          instance_name: instanceName,
          agent_name: wppName,
          connection_type: 'ads',
          wpp_number_id: phoneNumberId,
          wpp_access_token: accessToken,
          wpp_business_account_id: businessAccountId,
          status: finalStatus,
          status_description: metaApiError || addResult?.error || null,
          metadata: {
            created_via: 'ads_form',
            meta_api_success: metaApiSuccess,
            meta_api_error: metaApiError,
            meta_api_error_code: addResult?.code || null,
            business_account_id: businessAccountId,
            access_token: accessToken ? `${accessToken.substring(0, 10)}...` : null,
            phone_number_id: phoneNumberId,
            verification_method: metaApiSuccess ? 'SMS' : null,
            display_name: wppName,
            timezone: timezone,
            category: category,
            business_description: businessDescription,
            error_details: addResult?.details || null
          }
        };
        
        logger.info(`[CREATE_WHATSAPP_ACCOUNT] Payload da credencial:`, {
          agent_name: credentialPayload.agent_name,
          phone: credentialPayload.phone,
          connection_type: credentialPayload.connection_type,
          wpp_number_id: credentialPayload.wpp_number_id,
          wpp_access_token: credentialPayload.wpp_access_token ? `${credentialPayload.wpp_access_token.substring(0, 10)}...` : 'null',
          wpp_business_account_id: credentialPayload.wpp_business_account_id,
          status: credentialPayload.status,
          status_description: credentialPayload.status_description,
          meta_api_success: credentialPayload.metadata.meta_api_success,
          meta_api_error: credentialPayload.metadata.meta_api_error
        });
        
        const { data: savedCredentialData, error: saveError } = await supabaseAdmin
          .from('whatsapp_credentials')
          .insert(credentialPayload)
          .select()
          .single();
        
        if (saveError) {
          logger.error(`[CREATE_WHATSAPP_ACCOUNT] Erro ao salvar credencial no Supabase:`, saveError);
          return res.status(500).json({
            success: false,
            error: 'Erro ao salvar credencial no banco de dados',
            details: saveError
          });
        }
        
        savedCredential = savedCredentialData;
        logger.info(`[CREATE_WHATSAPP_ACCOUNT] Credencial salva com sucesso:`, savedCredential.id);
      } else {
        logger.info(`[CREATE_WHATSAPP_ACCOUNT] Não salvando credencial no Supabase devido ao tipo de erro`);
      }
      
      // 6. Retornar resposta baseada no resultado da Meta API
      if (metaApiSuccess) {
        return res.json({
          success: true,
          data: {
            phoneNumberId: phoneNumberId,
            phoneNumber: phoneNumber,
            verificationMethod: 'SMS',
            message: 'Conta WhatsApp criada com sucesso. Verifique o código SMS enviado para completar a verificação.',
            requiresVerification: true,
            credentialId: savedCredential?.id
          }
        });
      } else {
        // Verificar se a credencial foi salva
        if (savedCredential) {
          // Determinar mensagem baseada no tipo de erro
          let userMessage = 'Credencial salva com sucesso.';
          if (finalStatus === 'name_verification_in_progress') {
            userMessage = 'Credencial salva. O número já possui verificação de nome em andamento.';
          } else if (finalStatus === 'meta_api_error') {
            userMessage = `Credencial salva. Erro na Meta API: ${metaApiError}. Tente novamente mais tarde.`;
          }

          return res.json({
            success: true,
            data: {
              phoneNumberId: phoneNumberId,
              phoneNumber: phoneNumber,
              verificationMethod: null,
              message: userMessage,
              requiresVerification: false,
              credentialId: savedCredential.id,
              metaApiError: metaApiError,
              status: finalStatus
            }
          });
        } else {
          // Credencial não foi salva - retornar erro específico
          let errorMessage = 'Erro ao criar conta WhatsApp.';
          if (addResult.code === 'NUMBER_ALREADY_REGISTERED') {
            errorMessage = 'Este número já está registrado em outra conta WhatsApp.';
          } else if (addResult.error.includes('access token') || addResult.error.includes('Token de acesso')) {
            errorMessage = 'Token de acesso inválido ou expirado. Verifique suas credenciais.';
          } else if (addResult.error.includes('business') || addResult.error.includes('Business Account')) {
            errorMessage = 'Business Account ID inválido. Verifique suas credenciais.';
          }

          return res.status(400).json({
            success: false,
            error: errorMessage,
            details: addResult.details
          });
        }
      }

    } catch (error) {
      logger.error(`[CREATE_WHATSAPP_ACCOUNT] Erro interno: ${error.message}`);
      
      // Log detalhado do erro
      if (error.response) {
        logger.error(`[CREATE_WHATSAPP_ACCOUNT] Resposta de erro da API:`, {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
        
        // Se for erro da Meta API, retornar erro mais específico
        if (error.response.status === 400) {
          return res.status(400).json({
            success: false,
            error: `Erro na Meta API: ${error.response.data.error?.message || error.response.data.error || 'Parâmetros inválidos'}`,
            details: error.response.data
          });
        }
        
        if (error.response.status === 401) {
          return res.status(401).json({
            success: false,
            error: 'Token de acesso inválido ou expirado',
            details: error.response.data
          });
        }
      }
      
      return res.status(500).json({
        success: false,
        error: `Erro interno ao criar conta WhatsApp: ${error.message}`
      });
    }
  }

  // Novo método para verificar código de verificação
  async verifyWhatsAppCode(req, res) {
    try {
      const { phoneNumberId, accessToken, code } = req.body;

      logger.info(`[VERIFY_WHATSAPP_CODE] Verificando código para ${phoneNumberId}`);

      // Validar dados obrigatórios
      if (!phoneNumberId) {
        return res.status(400).json({
          success: false,
          error: 'phoneNumberId é obrigatório'
        });
      }

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'accessToken é obrigatório'
        });
      }

      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Código de verificação é obrigatório'
        });
      }

      // Buscar credencial antes de fazer a requisição
      const clientId = req.clientId;
      const { data: credential, error: credentialError } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('wpp_number_id', phoneNumberId)
        .eq('client_id', clientId)
        .single();

      if (credentialError) {
        logger.warn(`[VERIFY_WHATSAPP_CODE] Credencial não encontrada para phoneNumberId ${phoneNumberId}:`, credentialError);
      }

      // Verificar código na Meta API usando o WhatsappService
      try {
        const verifyResult = await WhatsappService.verifyWhatsAppCode(phoneNumberId, accessToken, code);

        if (verifyResult.success) {
          logger.info(`[VERIFY_WHATSAPP_CODE] Código verificado com sucesso:`, verifyResult.data);

          // Atualizar status da credencial no banco
          if (credential) {
            await supabaseAdmin
              .from('whatsapp_credentials')
              .update({
                status: 'verified',
                status_description: 'Número verificado com sucesso',
                metadata: {
                  ...credential.metadata,
                  verified: true,
                  verification_date: new Date().toISOString(),
                  verification_method: 'SMS'
                }
              })
              .eq('id', credential.id);
          }

          return res.status(200).json({
            success: true,
            data: {
              phoneNumberId: phoneNumberId,
              message: 'Código verificado com sucesso! Número está pronto para uso.',
              verified: true
            }
          });
        } else {
          // Erro retornado pelo WhatsappService
          logger.error(`[VERIFY_WHATSAPP_CODE] Erro do WhatsappService:`, verifyResult.error);
          
          // Atualizar status da credencial com erro
          if (credential) {
            await supabaseAdmin
              .from('whatsapp_credentials')
              .update({
                status: 'verification_failed',
                status_description: verifyResult.error || 'Erro ao verificar código',
                metadata: {
                  ...credential.metadata,
                  verification_error: verifyResult.error,
                  verification_error_code: verifyResult.code,
                  verification_error_details: verifyResult.details
                }
              })
              .eq('id', credential.id);
          }

          return res.status(400).json({
            success: false,
            error: verifyResult.error,
            code: verifyResult.code
          });
        }

      } catch (verifyError) {
        logger.error(`[VERIFY_WHATSAPP_CODE] Erro ao verificar código: ${verifyError.message}`);
        
        // Atualizar status da credencial com erro
        if (credential) {
          await supabaseAdmin
            .from('whatsapp_credentials')
            .update({
              status: 'verification_failed',
              status_description: 'Erro interno ao verificar código',
              metadata: {
                ...credential.metadata,
                verification_error: verifyError.message,
                verification_error_type: 'internal_error'
              }
            })
            .eq('id', credential.id);
        }

        return res.status(500).json({
          success: false,
          error: 'Erro interno ao verificar código'
        });
      }

    } catch (error) {
      logger.error(`[VERIFY_WHATSAPP_CODE] Erro interno: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Novo método para verificar status de verificação
  async checkVerificationStatus(req, res) {
    try {
      const { phoneNumberId, accessToken } = req.body;

      logger.info(`[CHECK_VERIFICATION_STATUS] Verificando status para ${phoneNumberId}`);

      // Validar dados obrigatórios
      if (!phoneNumberId) {
        return res.status(400).json({
          success: false,
          error: 'phoneNumberId é obrigatório'
        });
      }

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'accessToken é obrigatório'
        });
      }

      // Buscar credencial antes de fazer a requisição
      const clientId = req.clientId;
      const { data: credential, error: credentialError } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('wpp_number_id', phoneNumberId)
        .eq('client_id', clientId)
        .single();

      if (credentialError) {
        logger.warn(`[CHECK_VERIFICATION_STATUS] Credencial não encontrada para phoneNumberId ${phoneNumberId}:`, credentialError);
      }

      // Verificar status na Meta API usando o WhatsappService
      try {
        const statusResult = await WhatsappService.checkVerificationStatus(phoneNumberId, accessToken);

        if (statusResult.success) {
          logger.info(`[CHECK_VERIFICATION_STATUS] Status verificado com sucesso:`, statusResult.data);

          const phoneData = statusResult.data;
          let newStatus = 'unknown';
          let statusDescription = 'Status desconhecido';

          // Mapear status da Meta API para nosso sistema
          if (phoneData.verified_name) {
            newStatus = 'verified';
            statusDescription = `Verificado como: ${phoneData.verified_name}`;
          } else if (phoneData.code_verification_status === 'VERIFIED') {
            newStatus = 'verified';
            statusDescription = 'Número verificado com sucesso';
          } else if (phoneData.code_verification_status === 'PENDING') {
            newStatus = 'pending_verification';
            statusDescription = 'Aguardando verificação do código';
          } else if (phoneData.code_verification_status === 'FAILED') {
            newStatus = 'verification_failed';
            statusDescription = 'Falha na verificação do código';
          }

          // Atualizar status da credencial no banco
          if (credential) {
            await supabaseAdmin
              .from('whatsapp_credentials')
              .update({
                status: newStatus,
                status_description: statusDescription,
                metadata: {
                  ...credential.metadata,
                  last_status_check: new Date().toISOString(),
                  meta_api_status: phoneData.code_verification_status,
                  verified_name: phoneData.verified_name,
                  quality_rating: phoneData.quality_rating
                }
              })
              .eq('id', credential.id);
          }

          return res.status(200).json({
            success: true,
            data: {
              phoneNumberId: phoneNumberId,
              status: newStatus,
              status_description: statusDescription,
              meta_api_data: phoneData
            }
          });
        } else {
          // Erro retornado pelo WhatsappService
          logger.error(`[CHECK_VERIFICATION_STATUS] Erro do WhatsappService:`, statusResult.error);
          
          // Atualizar status da credencial com erro
          if (credential) {
            await supabaseAdmin
              .from('whatsapp_credentials')
              .update({
                status: 'meta_api_error',
                status_description: statusResult.error || 'Erro ao verificar status',
                metadata: {
                  ...credential.metadata,
                  status_check_error: statusResult.error,
                  status_check_error_details: statusResult.details
                }
              })
              .eq('id', credential.id);
          }

          return res.status(400).json({
            success: false,
            error: statusResult.error
          });
        }

      } catch (statusError) {
        logger.error(`[CHECK_VERIFICATION_STATUS] Erro ao verificar status: ${statusError.message}`);
        
        // Atualizar status da credencial com erro
        if (credential) {
          await supabaseAdmin
            .from('whatsapp_credentials')
            .update({
              status: 'meta_api_error',
              status_description: 'Erro interno ao verificar status',
              metadata: {
                ...credential.metadata,
                status_check_error: statusError.message,
                status_check_error_type: 'internal_error'
              }
            })
            .eq('id', credential.id);
        }

        return res.status(500).json({
          success: false,
          error: 'Erro interno ao verificar status'
        });
      }

    } catch (error) {
      logger.error(`[CHECK_VERIFICATION_STATUS] Erro interno: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Novo método para solicitar código de verificação via SMS
  async requestVerificationCode(req, res) {
    try {
      const { phoneNumberId, accessToken, codeMethod = 'SMS', language = 'pt_BR' } = req.body;

      logger.info(`[REQUEST_VERIFICATION_CODE] Solicitando código para ${phoneNumberId} via ${codeMethod}`);

      // Validar dados obrigatórios
      if (!phoneNumberId) {
        return res.status(400).json({
          success: false,
          error: 'phoneNumberId é obrigatório'
        });
      }

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'accessToken é obrigatório'
        });
      }

      // Buscar credencial antes de fazer a requisição
      const clientId = req.clientId;
      const { data: credential, error: credentialError } = await supabaseAdmin
        .from('whatsapp_credentials')
        .select('*')
        .eq('wpp_number_id', phoneNumberId)
        .eq('client_id', clientId)
        .single();

      if (credentialError) {
        logger.warn(`[REQUEST_VERIFICATION_CODE] Credencial não encontrada para phoneNumberId ${phoneNumberId}:`, credentialError);
      }

      // Verificar rate limiting antes de fazer a requisição
      const rateLimitCheck = smsRateLimitService.canRequestSms(phoneNumberId, clientId);
      if (!rateLimitCheck.allowed) {
        logger.warn(`[REQUEST_VERIFICATION_CODE] Rate limit excedido para ${phoneNumberId}:`, rateLimitCheck);
        
        return res.status(429).json({
          success: false,
          error: rateLimitCheck.message,
          code: 'RATE_LIMIT_EXCEEDED',
          reason: rateLimitCheck.reason,
          retryAfter: rateLimitCheck.retryAfter
        });
      }

      // Solicitar código na Meta API usando o WhatsappService
      try {
        const requestResult = await WhatsappService.requestVerificationCode(phoneNumberId, accessToken, codeMethod, language);

        if (requestResult.success) {
          logger.info(`[REQUEST_VERIFICATION_CODE] Código solicitado com sucesso:`, requestResult.data);

          // Registrar tentativa bem-sucedida no rate limiting
          smsRateLimitService.recordSmsRequest(phoneNumberId, clientId, true);

          // Atualizar status da credencial no banco
          if (credential) {
            await supabaseAdmin
              .from('whatsapp_credentials')
              .update({
                status: 'pending_verification',
                status_description: 'Código de verificação solicitado via SMS',
                metadata: {
                  ...credential.metadata,
                  sms_requested: true,
                  sms_request_date: new Date().toISOString(),
                  verification_method: 'SMS'
                }
              })
              .eq('id', credential.id);
          }

          return res.status(200).json({
            success: true,
            data: {
              phoneNumberId: phoneNumberId,
              message: 'Código de verificação enviado com sucesso via SMS',
              code_method: codeMethod,
              language: language
            }
          });
        } else {
          // Erro retornado pelo WhatsappService
          logger.error(`[REQUEST_VERIFICATION_CODE] Erro do WhatsappService:`, requestResult.error);
          
          // Registrar tentativa falhada no rate limiting
          smsRateLimitService.recordSmsRequest(phoneNumberId, clientId, false);
          
          // Atualizar status da credencial com erro
          if (credential) {
            await supabaseAdmin
              .from('whatsapp_credentials')
              .update({
                status: 'meta_api_error',
                status_description: requestResult.error || 'Erro ao solicitar código de verificação',
                metadata: {
                  ...credential.metadata,
                  sms_request_error: requestResult.error,
                  sms_request_error_code: requestResult.code,
                  sms_request_error_title: requestResult.userTitle,
                  sms_request_error_details: requestResult.details,
                  sms_request_meta_code: requestResult.metaCode,
                  sms_request_meta_subcode: requestResult.metaSubcode
                }
              })
              .eq('id', credential.id);
          }

          return res.status(400).json({
            success: false,
            error: requestResult.error,
            userTitle: requestResult.userTitle,
            code: requestResult.code,
            metaCode: requestResult.metaCode,
            metaSubcode: requestResult.metaSubcode,
            details: requestResult.details
          });
        }

      } catch (requestError) {
        logger.error(`[REQUEST_VERIFICATION_CODE] Erro ao solicitar código: ${requestError.message}`);
        
        // Atualizar status da credencial com erro
        if (credential) {
          await supabaseAdmin
            .from('whatsapp_credentials')
            .update({
              status: 'meta_api_error',
              status_description: 'Erro interno ao solicitar código de verificação',
              metadata: {
                ...credential.metadata,
                sms_request_error: requestError.message,
                sms_request_error_type: 'internal_error'
              }
            })
            .eq('id', credential.id);
        }

        return res.status(500).json({
          success: false,
          error: 'Erro interno ao solicitar código de verificação'
        });
      }

    } catch (error) {
      logger.error(`[REQUEST_VERIFICATION_CODE] Erro interno: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Novo método para verificar status do rate limiting de SMS
  async getSmsRateLimitStatus(req, res) {
    try {
      const { phoneNumberId } = req.params;
      const clientId = req.clientId;

      if (!phoneNumberId) {
        return res.status(400).json({
          success: false,
          error: 'phoneNumberId é obrigatório'
        });
      }

      const stats = smsRateLimitService.getSmsStats(phoneNumberId, clientId);
      
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (err) {
      logger.error('[GET_SMS_RATE_LIMIT_STATUS] Erro:', err);
      return res.status(500).json({
        success: false,
        error: 'Erro ao verificar status do rate limiting'
      });
    }
  }
}

module.exports = new WhatsappCredentialController(); 