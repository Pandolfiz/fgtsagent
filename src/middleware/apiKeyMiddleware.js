// Middleware para autenticação por API key
const { supabaseAdmin } = require('../services/database');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

async function apiKeyMiddleware(req, res, next) {
  try {
    // Verificar API key no cabeçalho
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      throw new AppError('API key não fornecida', 401);
    }
    
    // Buscar organização pela API key
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('api_key', apiKey)
      .single();
    
    if (error || !data) {
      throw new AppError('API key inválida', 401);
    }
    
    // Buscar agentes da organização
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from('client_agents')
      .select('id')
      .eq('organization_id', data.id)
      .eq('is_active', true);
    
    if (agentsError) {
      logger.error(`Erro ao buscar agentes: ${agentsError.message}`);
    }
    
    // Anexar informações da organização à requisição
    req.organization = {
      id: data.id,
      name: data.name,
      agentIds: agents ? agents.map(agent => agent.id) : []
    };
    
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      });
    }
    
    logger.error(`Erro no middleware de API key: ${error.message}`);
    
    return res.status(500).json({
      status: 'error',
      message: 'Erro interno no servidor'
    });
  }
}

module.exports = apiKeyMiddleware;