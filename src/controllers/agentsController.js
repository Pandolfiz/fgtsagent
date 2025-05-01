const { supabaseAdmin } = require('../config/supabase');
const EvolutionCredential = require('../models/evolutionCredential');
const { AppError } = require('../utils/errors');

// Atualiza o modo do agente para o cliente autenticado e ajusta contacts
exports.updateMode = async (req, res) => {
  try {
    const { mode } = req.body;
    const validModes = ['full', 'half', 'on demand'];
    if (!validModes.includes(mode)) {
      throw new AppError(`Modo inválido. Opções válidas: ${validModes.join(', ')}`, 400);
    }
    const clientId = req.user.id;
    // Buscar todas as instâncias do cliente
    const instances = await EvolutionCredential.findAllByClientId(clientId);
    const instanceIds = instances.map(inst => inst.id);
    // Montar payload de atualização de contacts
    const updates = { agent_status: mode };
    if (mode === 'on demand') {
      // Em on demand, forçar agent_state como human para todos
      updates.agent_state = 'human';
    } else {
      // Em full ou half, definir agent_state como ai
      updates.agent_state = 'ai';
    }
    // Atualizar todos os contatos das instâncias do cliente
    const { error } = await supabaseAdmin
      .from('contacts')
      .update(updates)
      .in('instance_id', instanceIds);
    if (error) throw error;
    // Feedback para o usuário
    req.flash('success', `Modo do agente atualizado para '${mode}'`);
    res.redirect('/agents');
  } catch (err) {
    console.error('Erro ao atualizar modo do agente:', err);
    req.flash('error', err.message || 'Erro ao atualizar modo do agente');
    res.redirect('/agents');
  }
}; 