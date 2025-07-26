const logger = require('../utils/logger');
const EvolutionService = require('../services/evolutionService');
const WhatsappService = require('../services/whatsappService');
const config = require('../config');
const { supabaseAdmin } = require('../config/supabase');

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
        metadata: req.body.metadata || {}
      };
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
        const { error: updateError } = await supabaseAdmin
          .from('whatsapp_credentials')
          .update({ 
            status: statusResult.status,
            metadata: {
              ...credential.metadata,
              last_status_check: new Date().toISOString(),
              meta_status: statusResult.data
            }
          })
          .eq('id', id);
        
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
}

module.exports = new WhatsappCredentialController(); 