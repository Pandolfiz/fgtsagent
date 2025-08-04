const contactService = require('../services/contactService');
const { AppError } = require('../utils/errors');

// ✅ ATUALIZADO: Atualiza o agent_state de um contato (ai/human) com sincronização automática
exports.updateState = async (req, res) => {
  try {
    const remoteJid = req.params.remoteJid;
    const { agent_state, agent_status } = req.body;
    
    if (!agent_state) {
      throw new AppError('O campo agent_state é obrigatório', 400);
    }
    
    // ✅ SINCRONIZAÇÃO AUTOMÁTICA: Backend coordena a sincronização
    const updated = await contactService.updateState({ 
      remote_jid: remoteJid, 
      agent_state,
      agent_status // Opcional - será determinado automaticamente se não fornecido
    });
    
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Erro ao atualizar agent_state:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Erro interno do servidor' });
  }
}; 