// Arquivo de rotas
const express = require('express');
const router = express.Router();
const apiRoutes = require('./apiRoutes');
const authRoutes = require('./authRoutes');
const agentRoutes = require('./agentRoutes');
const webhookRoutes = require('./webhookRoutes');
const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

// Rota raiz que agora apenas retorna status da API
router.get('/api/status', (req, res) => {
  res.json({
    message: 'API do sistema de agentes IA',
    version: '1.0.0',
    status: 'online'
  });
});

// Rota de teste para listar templates
router.get('/test-templates', async (req, res) => {
  try {
    logger.info('Testando listagem de templates');
    
    // Buscar apenas templates que têm n8n_workflow_id (que vieram do n8n)
    const { data: templates, error: templatesError } = await supabase
      .from('agent_templates')
      .select('*')
      .not('n8n_workflow_id', 'is', null);
      
    if (templatesError) {
      logger.error(`Erro ao buscar templates: ${templatesError.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar templates'
      });
    }
    
    // Filtrar templates que tenham a tag 'sub'
    const filteredTemplates = templates?.filter(template => {
      let configuration = {};
      try {
        if (template.configuration) {
          configuration = typeof template.configuration === 'string' 
            ? JSON.parse(template.configuration) 
            : template.configuration;
        }
      } catch (e) {
        logger.error(`Erro ao parsear configuração do template ${template.id}: ${e.message}`);
        return true; // Em caso de erro, manter o template
      }
      
      // Verificar se o template tem tags e se uma delas é 'sub'
      const tags = configuration.tags || [];
      return !tags.some(tag => tag.name && tag.name.toLowerCase() === 'sub');
    }) || [];
    
    logger.info(`Encontrados ${filteredTemplates.length} templates do n8n (excluindo subworkflows)`);
    
    return res.status(200).json({
      success: true,
      message: 'Templates recuperados com sucesso',
      data: filteredTemplates || []
    });
  } catch (error) {
    logger.error('Erro ao testar listagem de templates:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao testar listagem de templates'
    });
  }
});

// Rotas de health (públicas) - DEVE vir ANTES das rotas principais
router.use('/api/health', require('./healthRoutes'));

// Rotas principais
router.use('/api', apiRoutes);
router.use('/auth', authRoutes);
router.use('/agents', agentRoutes);
router.use('/webhooks', webhookRoutes);

// Rotas para credenciais genéricas
router.use('/credentials', require('./credentialsRoutes'));

// Rotas de clientes
router.use('/api/clients', require('./clientRoutes'));

// Rotas de EvolutionCredentials
router.use('/api/whatsapp-credentials', require('./whatsappCredentialRoutes'));

// Rotas de Leads
router.use('/api/leads', require('./leadRoutes'));

// Rotas de KnowledgeBase
router.use('/api/knowledge-base', require('./knowledgeBaseRoutes'));

// Rotas do Stripe
router.use('/api/stripe', require('./stripeRoutes'));

// Rotas de configurações
// router.use('/api/settings', require('./settingsRoutes'));

// Rotas de consentimentos LGPD
router.use('/api/consent', require('./consentRoutes'));

// Rotas de feedback
router.use('/api/feedback', require('./feedbackRoutes'));

module.exports = router; 