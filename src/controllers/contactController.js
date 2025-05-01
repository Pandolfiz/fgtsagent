const contactService = require('../services/contactService');
const { AppError } = require('../utils/errors');

// Atualiza o agent_state de um contato (ai/human)
exports.updateState = async (req, res) => {
  try {
    const remoteJid = req.params.remoteJid;
    const { agent_state } = req.body;
    if (!agent_state) {
      throw new AppError('O campo agent_state é obrigatório', 400);
    }
    const updated = await contactService.updateState({ remote_jid: remoteJid, agent_state });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Erro ao atualizar agent_state:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Erro interno do servidor' });
  }
}; 