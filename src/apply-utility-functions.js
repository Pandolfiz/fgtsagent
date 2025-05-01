#!/usr/bin/env node
/**
 * Script para aplicar as funções utilitárias básicas no banco de dados
 */

require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

// Verificar se existe uma função para executar SQL arbitrário
async function checkExistingExecSql() {
  try {
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: 'SELECT 1' });
    return !error;
  } catch (e) {
    return false;
  }
}

async function applyUtilityFunctions() {
  try {
    logger.info('Aplicando funções utilitárias básicas...');
    
    // Ler arquivo de migração
    const filePath = path.resolve(__dirname, 'migrations', '001_create_utility_functions.sql');
    
    if (!fs.existsSync(filePath)) {
      logger.error(`Arquivo de migração não encontrado: ${filePath}`);
      console.error(`\nArquivo não encontrado: ${filePath}`);
      console.error('Verifique se o arquivo existe no diretório correto.');
      return false;
    }
    
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    logger.info('Conteúdo do arquivo SQL carregado');
    
    // Verificar se já existe uma função exec_sql
    const execSqlAvailable = await checkExistingExecSql();
    
    if (execSqlAvailable) {
      logger.info('Função exec_sql encontrada, usando-a para aplicar as funções');
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: sqlContent });
      
      if (error) {
        logger.error(`Erro ao aplicar funções utilitárias via exec_sql: ${error.message}`);
        throw new Error(`Falha ao criar funções: ${error.message}`);
      }
    } else {
      // Precisamos executar manualmente
      logger.info('Função exec_sql não disponível, aplicando funções manualmente...');
      
      // Criar função check_table_exists primeiro
      logger.info('Criando função check_table_exists...');
      const checkTableFn = `
        CREATE OR REPLACE FUNCTION public.check_table_exists(table_name TEXT)
        RETURNS BOOLEAN 
        SECURITY DEFINER 
        SET search_path = public
        LANGUAGE plpgsql
        AS $$
        DECLARE
          table_exists BOOLEAN;
        BEGIN
          SELECT EXISTS (
            SELECT FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename = table_name
          ) INTO table_exists;
          
          RETURN table_exists;
        END;
        $$;
      `;
      
      // Tentar o método de query básico
      const { error: error1 } = await supabaseAdmin.from('_temp_').select('*').limit(1).then(() => ({ error: null }), (e) => ({ error: e }));
      
      console.log('Não foi possível aplicar as funções utilitárias automaticamente.');
      console.log('Por favor, execute o seguinte SQL no console do Supabase para criar as funções necessárias:');
      console.log('\n' + checkTableFn);
      console.log('\n-- E depois a função para executar SQL:');
      console.log(`
CREATE OR REPLACE FUNCTION public.execute_sql(sql_query TEXT)
RETURNS VOID 
SECURITY DEFINER 
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;
      `);
      
      logger.warn('Função exec_sql não disponível e não foi possível executar SQL diretamente.');
      logger.info('Instruções fornecidas para execução manual das funções.');
      
      return false;
    }
    
    logger.info('Funções utilitárias aplicadas com sucesso!');
    return true;
  } catch (error) {
    logger.error(`Erro ao aplicar funções utilitárias: ${error.message}`);
    return false;
  }
}

// Se executado diretamente
if (require.main === module) {
  applyUtilityFunctions()
    .then(success => {
      if (success) {
        console.log('\n✅ Funções utilitárias aplicadas com sucesso!');
        console.log('Agora o sistema poderá criar e verificar tabelas automaticamente.');
        process.exit(0);
      } else {
        console.error('\n❌ Falha ao aplicar funções utilitárias!');
        console.error('Verifique os logs para mais detalhes.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { applyUtilityFunctions }; 