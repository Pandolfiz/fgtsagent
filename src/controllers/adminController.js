/**
 * Controlador para funções administrativas do sistema
 */
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Verifica a saúde do sistema
 */
exports.getSystemHealth = async (req, res) => {
  try {
    // Verificar conexão com Supabase
    const { data, error } = await supabaseAdmin.from('organizations').select('count', { count: 'exact' });
    
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
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error('Arquivo SQL de correção não encontrado');
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
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

// Busca o CPF de um lead pelo lead_id (admin/debug)
exports.getLeadCpfByLeadId = async (req, res) => {
  try {
    const { lead_id } = req.params;
    const { supabaseAdmin } = require('../config/supabase');
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('id, client_id, cpf')
      .eq('id', lead_id)
      .single();
    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Lead não encontrado', error });
    }
    return res.json({ success: true, cpf: data.cpf, lead: data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}; 