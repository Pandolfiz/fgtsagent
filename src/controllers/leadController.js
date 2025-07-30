const logger = require('../utils/logger');
const { supabaseAdmin } = require('../config/supabase');
const { optimizedSelect, optimizedLeadsWithProposals } = require('../utils/supabaseOptimized');

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
      logger.info(`[LEADS-OPTIMIZED] Buscando leads completos para cliente: ${clientId}`);

      // Usar query otimizada com cache
      const { data: leads, error } = await optimizedSelect(
        supabaseAdmin,
        'leads',
        'id, name, cpf, email, phone, status, data, rg, mother_name, birth, marital_status, cep, numero, pix_key, balance, simulation, balance_error, updated_at',
        { 
          eq: { client_id: clientId },
          order: { column: 'updated_at', ascending: false },
          limit: 1000
        },
        5000, // 5s timeout
        true // usar cache
      );

      if (error) {
        logger.error(`[LEADS-OPTIMIZED] Erro ao buscar leads: ${error.message}`);
        throw error;
      }

      // Buscar propostas otimizadas
      const { data: proposals, error: proposalsError } = await optimizedSelect(
        supabaseAdmin,
        'proposals',
        'lead_id',
        { eq: { client_id: clientId } },
        3000, // 3s timeout
        true // usar cache
      );

      if (proposalsError) {
        logger.error(`[LEADS-OPTIMIZED] Erro ao buscar propostas: ${proposalsError.message}`);
      }

      // Criar um Set com os lead_ids que têm propostas
      const leadsWithProposals = new Set();
      if (proposals) {
        proposals.forEach(proposal => {
          if (proposal.lead_id) {
            leadsWithProposals.add(proposal.lead_id);
          }
        });
      }

      // Adicionar informação sobre propostas aos leads
      const leadsWithProposalInfo = leads ? leads.map(lead => ({
        ...lead,
        hasProposals: leadsWithProposals.has(lead.id)
      })) : [];

      logger.info(`[LEADS-OPTIMIZED] Retornando ${leadsWithProposalInfo?.length || 0} leads completos`);
      return res.json({ success: true, data: leadsWithProposalInfo || [] });
    } catch (err) {
      logger.error('LeadController.listComplete error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const clientId = req.user.id;
      
      logger.info(`[LEADS] Buscando lead ${id} para cliente ${clientId}`);
      
      // Buscar o lead com todos os dados já sincronizados
      const { data: lead, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', id)
        .eq('client_id', clientId)
        .single();
        
      if (error) {
        logger.error(`[LEADS] Erro ao buscar lead ${id}:`, error.message);
        throw error;
      }
      
      if (!lead) {
        logger.warn(`[LEADS] Lead ${id} não encontrado para cliente ${clientId}`);
        return res.status(404).json({ success: false, message: 'Lead não encontrado' });
      }
      
      logger.info(`[LEADS] Lead ${id} encontrado com sucesso`);
      return res.json({ success: true, data: lead });
    } catch (err) {
      logger.error('LeadController.getById error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create(req, res) {
    try {
      const clientId = req.user.id;
      
      // Preparar payload tratando campos vazios
      const payload = {
        client_id: clientId,
        name: req.body.name || null,
        cpf: req.body.cpf || null,
        email: req.body.email || null,
        phone: req.body.phone || null,
        status: req.body.status || null,
        data: req.body.data || {},
        // Campos adicionais da tabela leads
        rg: req.body.rg || null,
        nationality: req.body.nationality || null,
        is_pep: req.body.is_pep || false,
        birth: req.body.birth || null,
        marital_status: req.body.marital_status || null,
        person_type: req.body.person_type || null,
        mother_name: req.body.mother_name || null,
        // Endereço
        cep: req.body.cep || null,
        estado: req.body.estado || null,
        cidade: req.body.cidade || null,
        bairro: req.body.bairro || null,
        rua: req.body.rua || null,
        numero: req.body.numero || null,
        // Campos financeiros
        balance: req.body.balance || null,
        pix: req.body.pix || null,
        pix_key: req.body.pix_key || null,
        simulation: req.body.simulation || null,
        balance_error: req.body.balance_error || null,
        proposal_error: req.body.proposal_error || null,
        parcelas: req.body.parcelas || null,
        // Outros campos
        provider: req.body.provider || 'cartos'
      };

      // Remover campos vazios para evitar erros de tipo
      Object.keys(payload).forEach(key => {
        if (payload[key] === '' || payload[key] === undefined) {
          payload[key] = null;
        }
      });

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
      
      logger.info(`[LEADS] Atualizando lead ${id} para cliente ${clientId}`);
      
      const { data: existing, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', id)
        .eq('client_id', clientId)
        .single();
        
      if (error) {
        logger.error(`[LEADS] Erro ao buscar lead ${id}:`, error.message);
        throw error;
      }
      
      if (!existing) {
        logger.warn(`[LEADS] Lead ${id} não encontrado para cliente ${clientId}`);
        return res.status(404).json({ success: false, message: 'Lead não encontrado' });
      }
      
      const updateData = {};
      ['name','cpf','email','phone','status','data','rg','nationality','is_pep','birth','marital_status','person_type','mother_name','cep','estado','cidade','bairro','rua','numero','balance','pix','pix_key','simulation','balance_error','proposal_error','parcelas','provider'].forEach(field => {
        if (req.body[field] !== undefined) {
          // Tratar campos vazios
          if (req.body[field] === '' || req.body[field] === undefined) {
            updateData[field] = null;
          } else {
            updateData[field] = req.body[field];
          }
        }
      });
      
      logger.info(`[LEADS] Dados para atualização:`, updateData);
      
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('leads')
        .update(updateData)
        .eq('id', id)
        .eq('client_id', clientId)
        .select()
        .single();
        
      if (updateError) {
        logger.error(`[LEADS] Erro ao atualizar lead ${id}:`, updateError.message);
        throw updateError;
      }
      
      logger.info(`[LEADS] Lead ${id} atualizado com sucesso`);
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

  async getProposals(req, res) {
    try {
      const { id } = req.params;
      const clientId = req.user.id;
      
      logger.info(`[LEADS] Buscando propostas para lead ${id} do cliente ${clientId}`);
      
      // Verificar se o lead existe e pertence ao cliente
      const { data: lead, error: leadError } = await supabaseAdmin
        .from('leads')
        .select('id, name')
        .eq('id', id)
        .eq('client_id', clientId)
        .single();

      if (leadError || !lead) {
        logger.warn(`[LEADS] Lead ${id} não encontrado para cliente ${clientId}`);
        return res.status(404).json({ success: false, message: 'Lead não encontrado' });
      }

      // Buscar propostas da tabela proposals
      const { data: proposals, error } = await supabaseAdmin
        .from('proposals')
        .select('*')
        .eq('lead_id', id)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error(`[LEADS] Erro ao buscar propostas para lead ${id}:`, error.message);
        throw error;
      }
      
      logger.info(`[LEADS] Encontradas ${proposals?.length || 0} propostas para lead ${id}`);
      return res.json({ success: true, data: proposals || [] });
    } catch (err) {
      logger.error('LeadController.getProposals error:', err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new LeadController(); 