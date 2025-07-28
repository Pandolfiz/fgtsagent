const logger = require('../utils/logger');
const { supabaseAdmin } = require('../config/supabase');

class LeadController {
  async list(req, res) {
    try {
      const clientId = req.user.id;
      const { data: leads, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('client_id', clientId);
      if (error) throw error;
      return res.json({ success: true, data: leads });
    } catch (err) {
      logger.error('LeadController.list error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async listComplete(req, res) {
    try {
      const clientId = req.user.id;
      logger.info(`[LEADS] Buscando leads completos para cliente: ${clientId}`);

      // Buscar todos os leads do cliente
      const { data: leads, error: leadsError } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('client_id', clientId);

      if (leadsError) throw leadsError;

      // Buscar dados de balance para todos os leads
      const { data: balanceData, error: balanceError } = await supabaseAdmin
        .from('balance')
        .select('*')
        .eq('client_id', clientId);

      if (balanceError) {
        logger.error(`Erro ao buscar dados de balance: ${balanceError.message}`);
      }

      // Buscar dados de proposals para todos os leads
      const { data: proposalsData, error: proposalsError } = await supabaseAdmin
        .from('proposals')
        .select('*')
        .eq('client_id', clientId);

      if (proposalsError) {
        logger.error(`Erro ao buscar dados de proposals: ${proposalsError.message}`);
      }

      // Criar mapas para lookup rápido
      const balanceMap = {};
      const proposalsMap = {};

      // Mapear o balance mais recente para cada lead
      if (balanceData) {
        balanceData.forEach(balance => {
          if (balance.lead_id) {
            if (!balanceMap[balance.lead_id] || 
                new Date(balance.updated_at) > new Date(balanceMap[balance.lead_id].updated_at)) {
              balanceMap[balance.lead_id] = balance;
            }
          }
        });
      }

      // Mapear a proposta mais recente para cada lead
      if (proposalsData) {
        proposalsData.forEach(proposal => {
          if (proposal.lead_id) {
            if (!proposalsMap[proposal.lead_id] || 
                new Date(proposal.created_at) > new Date(proposalsMap[proposal.lead_id].created_at)) {
              proposalsMap[proposal.lead_id] = proposal;
            }
          }
        });
      }

      // Combinar os dados
      const completeLeads = leads.map(lead => {
        const balance = balanceMap[lead.id];
        const proposal = proposalsMap[lead.id];

        return {
          ...lead,
          balance: balance?.balance || null,
          simulation: balance?.simulation || null,
          error_reason: balance?.error_reason || null,
          balance_updated_at: balance?.updated_at || null,
          proposal_id: proposal?.proposal_id || null,
          proposal_status: proposal?.status || null,
          proposal_value: proposal?.value || proposal?.amount || null,
          proposal_created_at: proposal?.created_at || null,
          formalization_link: proposal?.formalization_link || proposal?.link_formalizacao || null,
          pix_key: proposal?.pix_key || proposal?.chave_pix || null,
          status_detail: proposal?.status_detail || proposal?.status_detalhado || null,
          updated_at: balance?.updated_at || lead.updated_at || lead.created_at
        };
      });

      logger.info(`[LEADS] Retornando ${completeLeads.length} leads completos`);
      return res.json({ success: true, data: completeLeads });
    } catch (err) {
      logger.error('LeadController.listComplete error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const clientId = req.user.id;
      
      const { data: lead, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      if (!lead || String(lead.client_id).trim() !== String(clientId).trim()) {
        console.log('[DEBUG] Lead não encontrado ou client_id não bate');
        return res.status(404).json({ success: false, message: 'Lead não encontrado' });
      }
      return res.json({ success: true, data: lead });
    } catch (err) {
      logger.error('LeadController.getById error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create(req, res) {
    try {
      const clientId = req.user.id;
      const payload = {
        client_id: clientId,
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        status: req.body.status,
        data: req.body.data || {}
      };
      const { data: saved, error } = await supabaseAdmin
        .from('leads')
        .insert([payload])
        .select();
      if (error) throw error;
      return res.status(201).json({ success: true, data: saved });
    } catch (err) {
      logger.error('LeadController.create error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const clientId = req.user.id;
      
      const { data: existing, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      if (!existing || existing.client_id !== clientId) {
        return res.status(404).json({ success: false, message: 'Lead não encontrado' });
      }
      
      const updateData = {};
      ['name','email','phone','status','data'].forEach(field => {
        if (req.body[field] !== undefined) updateData[field] = req.body[field];
      });
      
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('leads')
        .update(updateData)
        .eq('id', id)
        .select();
      if (updateError) throw updateError;
      return res.json({ success: true, data: updated });
    } catch (err) {
      logger.error('LeadController.update error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const clientId = req.user.id;
      
      const { data: existing, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      if (!existing || existing.client_id !== clientId) {
        return res.status(404).json({ success: false, message: 'Lead não encontrado' });
      }
      const { error: deleteError } = await supabaseAdmin
        .from('leads')
        .delete()
        .eq('id', id);
      if (deleteError) {
        logger.error('LeadController.delete error:', deleteError.message || deleteError);
        return res.status(500).json({ success: false, message: deleteError.message });
      }
      return res.json({ success: true, message: 'Lead excluído com sucesso' });
    } catch (err) {
      logger.error('LeadController.delete error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async repeatQuery(req, res) {
    try {
      const { id } = req.params;
      const clientId = req.user.id;
      
      logger.info(`[LEADS] Repetindo consulta para lead ${id} do cliente ${clientId}`);

      // Verificar se o lead existe e pertence ao cliente
      const { data: lead, error: leadError } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', id)
        .eq('client_id', clientId)
        .single();

      if (leadError || !lead) {
        return res.status(404).json({ success: false, message: 'Lead não encontrado' });
      }

      // Aqui você pode implementar a lógica para repetir a consulta
      // Por exemplo, chamar a API da V8 ou outro serviço
      // Por enquanto, vamos apenas simular uma atualização
      
      // Criar um novo registro de balance com timestamp atual
      const { error: balanceError } = await supabaseAdmin
        .from('balance')
        .insert([{
          lead_id: id,
          client_id: clientId,
          balance: null, // Será preenchido pela consulta real
          simulation: null, // Será preenchido pela consulta real
          error_reason: null,
          updated_at: new Date().toISOString()
        }]);

      if (balanceError) {
        logger.error(`Erro ao criar registro de balance: ${balanceError.message}`);
        return res.status(500).json({ success: false, message: 'Erro ao processar consulta' });
      }

      logger.info(`[LEADS] Consulta repetida com sucesso para lead ${id}`);
      return res.json({ success: true, message: 'Consulta iniciada com sucesso' });
    } catch (err) {
      logger.error('LeadController.repeatQuery error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new LeadController(); 