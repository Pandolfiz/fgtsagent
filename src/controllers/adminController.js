/**
 * Controlador para funções administrativas do sistema
 */
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

/**
 * Verifica a saúde do sistema
 */
exports.getSystemHealth = async (req, res) => {
  try {
    // Verificar conexão com Supabase com timeout
    const { data, error } = await withTimeout(
      supabaseAdmin.from('organizations').select('count', { count: 'exact' }),
      10000, // 10 segundos timeout para health check
      'Health check - organizations count'
    );
    
    if (error) {
      throw new Error(`Erro ao conectar com Supabase: ${error.message}`);
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        database: 'connected',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error(`Erro na verificação de saúde do sistema: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: `Erro na verificação de saúde: ${error.message}`
    });
  }
};

/**
 * Corrige políticas de segurança no banco de dados
 */
exports.fixDatabasePolicies = async (req, res) => {
  try {
    // Ler arquivo SQL com correções
    const sqlFilePath = path.join(__dirname, '..', 'sql', 'fix-org-members-policies.sql');
    
    if (!fsSync.existsSync(sqlFilePath)) {
      throw new Error('Arquivo SQL de correção não encontrado');
    }
    
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
    
    // Executar SQL via função RPC
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { 
      sql: sqlContent
    });
    
    if (error) {
      throw new Error(`Erro ao executar SQL: ${error.message}`);
    }
    
    logger.info('Políticas de segurança do banco de dados corrigidas com sucesso');
    
    res.status(200).json({
      status: 'success',
      message: 'Políticas de segurança do banco de dados corrigidas com sucesso'
    });
  } catch (error) {
    logger.error(`Erro ao corrigir políticas de segurança: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: `Erro ao corrigir políticas: ${error.message}`
    });
  }
};

// Busca o CPF de um lead pelo lead_id (admin/debug) - OTIMIZADO
exports.getLeadCpfByLeadId = async (req, res) => {
  logger.warn(`[CPF-OPTIMIZED] Entrou no controller getLeadCpfByLeadId`);
  try {
    const { lead_id } = req.params;
    logger.info(`[CPF-OPTIMIZED] Recebido lead_id: ${lead_id}`);
    
    // Validar se o lead_id é um UUID válido
    if (!lead_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lead_id)) {
      logger.warn(`[CPF-OPTIMIZED] Tentativa de buscar lead com ID inválido: ${lead_id}`);
      return res.status(400).json({ 
        success: false, 
        message: 'ID do lead inválido. Deve ser um UUID válido.',
        lead_id 
      });
    }

    const { supabaseAdmin } = require('../config/supabase');
    const { withTimeout } = require('../utils/supabaseOptimized');
    
    logger.info(`[CPF-OPTIMIZED] Buscando CPF para lead: ${lead_id}`);
    
    const query = supabaseAdmin
      .from('leads')
      .select('id, client_id, cpf')
      .eq('id', lead_id)
      .single();
      
    const { data, error } = await withTimeout(query, 3000, `CPF query for lead ${lead_id}`);
      
    if (error) {
      logger.error(`[CPF-OPTIMIZED] Erro ao buscar lead ${lead_id}: ${error.message}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Lead não encontrado no banco de dados', 
        error: error.message,
        lead_id 
      });
    }
    
    if (!data) {
      logger.warn(`[CPF-OPTIMIZED] Lead não encontrado: ${lead_id}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Lead não encontrado', 
        lead_id 
      });
    }
    
    logger.info(`[CPF-OPTIMIZED] CPF encontrado para lead ${lead_id}: ${data.cpf ? 'SIM' : 'NÃO'}`);
    return res.json({ success: true, cpf: data.cpf, lead: data });
  } catch (err) {
    logger.error(`[CPF-OPTIMIZED] Erro interno ao buscar CPF do lead ${req.params.lead_id}: ${err.message}`);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor', 
      error: err.message 
    });
  }
}; 