const EvolutionCredential = require('../models/evolutionCredential');
const logger = require('../utils/logger');
const EvolutionService = require('../services/evolutionService');

class EvolutionCredentialController {
  // Lista credenciais do cliente autenticado
  async list(req, res) {
    try {
      const clientId = req.clientId;
      const creds = await EvolutionCredential.findByClientId(clientId);
      
      // Se encontrou credenciais, buscar status das instâncias
      if (creds) {
        try {
          const service = EvolutionService.fromCredential(creds);
          const instances = await service.fetchInstances();
          
          // Atualizar status da credencial com base na instância encontrada
          if (instances && Array.isArray(instances)) {
            const instance = instances.find(i => i.instance?.instanceName === creds.instance_name);
            if (instance) {
              creds.status = instance.instance.status;
            }
          }
        } catch (err) {
          logger.warn('Erro ao buscar status das instâncias:', err.message);
          // Não falhar se não conseguir buscar status
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
      const payload = {
        client_id: req.clientId,
        phone: req.body.phone,
        instance_name: req.body.instance_name,
        partner_secret: req.body.partner_secret,
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
      // Merge campos permitidos
      const updates = ['phone', 'instance_name', 'partner_secret', 'metadata'];
      updates.forEach(field => {
        if (req.body[field] !== undefined) {
          existing[field] = req.body[field];
        }
      });
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
      const service = EvolutionService.fromCredential(existing);
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

  // Busca QR Code de uma instância
  async fetchQrCode(req, res) {
    try {
      const { id } = req.params;
      const credential = await EvolutionCredential.findById(id);
      if (!credential || credential.client_id !== req.user.id) {
        return res.status(404).json({ error: 'Credencial não encontrada' });
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
        return res.status(404).json({ error: 'QR Code não encontrado' });
      }
      // Atualizar metadata local com novo QR Code
      credential.metadata = {
        ...credential.metadata,
        evolution: {
          ...credential.metadata.evolution,
          qrcode: freshQr
        }
      };
      await credential.save();
      // Retornar apenas os campos relevantes
      return res.json({
        base64: freshQr.base64 || null,
        code: freshQr.code || null,
        pairingCode: freshQr.pairingCode || null
      });
    } catch (error) {
      console.error('Erro ao buscar QR Code:', error);
      return res.status(500).json({ error: error.message });
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
        return res.redirect('/evolution-credentials');
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
      return res.redirect('/evolution-credentials');
    } catch (err) {
      logger.error('EvolutionCredentialController.deleteInstance error:', err.message || err);
      req.flash('error', 'Erro interno ao excluir credencial');
      return res.redirect('/evolution-credentials');
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