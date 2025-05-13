const { supabaseAdmin } = require('../config/supabase');
const EvolutionCredential = require('../models/evolutionCredential');
const { AppError } = require('../utils/errors');

// Obtém o modo atual do agente para o cliente autenticado
exports.getCurrentMode = async (req, res) => {
  try {
    const clientId = req.user.id;
    
    // Buscar contatos do cliente para determinar o modo atual
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('agent_status')
      .eq('client_id', clientId)
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
      throw error;
    }
    
    // Determinar o modo atual, padrão é 'full' se não houver contatos
    const currentMode = data?.agent_status || 'full';
    
    return res.status(200).json({
      success: true,
      data: { mode: currentMode }
    });
  } catch (err) {
    console.error('Erro ao obter modo atual do agente:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Erro ao obter modo atual do agente'
    });
  }
};

// Atualiza o modo do agente para o cliente autenticado e ajusta contacts
exports.updateMode = async (req, res) => {
  try {
    const { mode } = req.body;
    const validModes = ['full', 'half', 'on demand'];
    if (!validModes.includes(mode)) {
      throw new AppError(`Modo inválido. Opções válidas: ${validModes.join(', ')}`, 400);
    }
    const clientId = req.user.id;
    
    // Montar payload de atualização de contacts
    const updates = { agent_status: mode };
    if (mode === 'on demand') {
      // Em on demand, forçar agent_state como human para todos
      updates.agent_state = 'human';
    } else {
      // Em full ou half, definir agent_state como ai
      updates.agent_state = 'ai';
    }
    
    // Atualizar todos os contatos do cliente (usando client_id)
    const { error } = await supabaseAdmin
      .from('contacts')
      .update(updates)
      .eq('client_id', clientId);
    
    if (error) throw error;
    
    // Para fins de log, contar quantos registros foram atualizados
    const { count, error: countError } = await supabaseAdmin
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId);
    
    if (!countError) {
      console.log(`Atualizados ${count} contatos para modo ${mode} (cliente ${clientId})`);
    }
    
    // Verificar se é uma API request (possui header Accept: application/json)
    const isApiRequest = req.xhr || req.headers.accept?.includes('application/json') || req.path.startsWith('/api/');
    
    if (isApiRequest) {
      // Resposta para API
      return res.status(200).json({
        success: true,
        data: { mode, affectedContacts: count || 'desconhecido' },
        message: `Modo do agente atualizado para '${mode}'`
      });
    } else {
      // Feedback para o usuário na web UI
      req.flash('success', `Modo do agente atualizado para '${mode}'`);
      return res.redirect('/agents');
    }
  } catch (err) {
    console.error('Erro ao atualizar modo do agente:', err);
    
    // Verificar se é uma API request
    const isApiRequest = req.xhr || req.headers.accept?.includes('application/json') || req.path.startsWith('/api/');
    
    if (isApiRequest) {
      // Resposta de erro para API
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Erro ao atualizar modo do agente'
      });
    } else {
      // Feedback de erro para web UI
      req.flash('error', err.message || 'Erro ao atualizar modo do agente');
      return res.redirect('/agents');
    }
  }
}; 