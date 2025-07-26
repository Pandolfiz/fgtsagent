const logger = require('../utils/logger');
const EvolutionService = require('../services/evolutionService');
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
      
      const oldId = existing.id;
      const newId = apiRes.instance.instanceId;
      // ... (restante igual ao controller original)
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
      const service = EvolutionService.fromCredential(existing);
      const data = await service.restartInstance();
      // Opcional: atualizar metadata ou status no banco, se necessário
      return res.json({ success: true, data });
    } catch (err) {
      logger.error('WhatsappCredentialController.restartInstance error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new WhatsappCredentialController(); 