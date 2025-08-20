// Controlador para webhooks
const n8nIntegration = require('../services/n8nIntegration');
const { AppError } = require('../utils/errors');

exports.handleInteraction = async (req, res, next) => {
  try {
    const { agentId, userIdentifier, input, sessionId, metadata } = req.body;
    
    if (!agentId || !userIdentifier || !input) {
      throw new AppError('agentId, userIdentifier e input são obrigatórios', 400);
    }
    
    // Verificar se o agente pertence à organização da API key
    if (agentId && req.organization) {
      const organizationId = req.organization.id;
      
      // req.organization é definido pelo middleware apiKeyMiddleware
      if (req.organization.agentIds && !req.organization.agentIds.includes(agentId)) {
        throw new AppError('Agente não pertence a esta organização', 403);
      }
    }
    
    const result = await n8nIntegration.handleInteraction(
      agentId,
      input,
      userIdentifier,
      {
        sessionId,
        ...metadata,
        source: 'api'
      }
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        id: result.id,
        response: result.response
      }
    });
  } catch (error) {
    next(error);
  }
};