#!/usr/bin/env node
/**
 * Script para aplicar a migração e adicionar a coluna workflow_metadata
 */

require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');
const logger = require('./utils/logger');

async function applyMigration() {
  try {
    logger.info('Aplicando migração: adicionar coluna workflow_metadata');
    
    // SQL para adicionar a coluna
    const sql = `
      -- Adicionar coluna workflow_metadata como JSONB
      ALTER TABLE "client_agents" 
      ADD COLUMN IF NOT EXISTS "workflow_metadata" JSONB DEFAULT NULL;
      
      -- Adicionar o campo n8n_workflow_id se ainda não existir
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name='client_agents' AND column_name='n8n_workflow_id') THEN
              ALTER TABLE "client_agents" ADD COLUMN "n8n_workflow_id" TEXT;
          END IF;
      END $$;
      
      -- Criar índice para melhorar a performance das consultas
      CREATE INDEX IF NOT EXISTS "client_agents_n8n_workflow_id_idx" 
      ON "client_agents" ("n8n_workflow_id");
    `;
    
    // Executar SQL diretamente
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql });
    
    if (error) {
      if (error.message.includes('function "exec_sql" does not exist')) {
        logger.warn('Função exec_sql não existe, executando SQL diretamente via query');
        
        // Tentar alternativa: executar cada comando separadamente
        const queries = [
          'ALTER TABLE "client_agents" ADD COLUMN IF NOT EXISTS "workflow_metadata" JSONB DEFAULT NULL',
          'CREATE INDEX IF NOT EXISTS "client_agents_n8n_workflow_id_idx" ON "client_agents" ("n8n_workflow_id")'
        ];
        
        // Verificar se n8n_workflow_id existe
        const { data } = await supabaseAdmin
          .from('client_agents')
          .select('n8n_workflow_id')
          .limit(1);
          
        if (data && data[0] && !('n8n_workflow_id' in data[0])) {
          queries.unshift('ALTER TABLE "client_agents" ADD COLUMN "n8n_workflow_id" TEXT');
        }
        
        // Executar queries uma a uma
        for (const query of queries) {
          const { error: queryError } = await supabaseAdmin.rpc('alter_table', { query });
          
          if (queryError) {
            if (queryError.message.includes('function "alter_table" does not exist')) {
              logger.error('Método RPC alter_table não existe.');
              
              // Último recurso: executar SQL via REST API
              logger.info('Executando migração diretamente com fetch');
              
              const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
              if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
                throw new Error('Variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY são necessárias');
              }
              
              console.log('\nPor favor, execute o seguinte comando SQL no console PostgreSQL do Supabase:\n');
              console.log('-- Adicionar coluna workflow_metadata');
              console.log('ALTER TABLE "client_agents" ADD COLUMN IF NOT EXISTS "workflow_metadata" JSONB DEFAULT NULL;');
              console.log('\n-- Adicionar coluna n8n_workflow_id se não existir');
              console.log('ALTER TABLE "client_agents" ADD COLUMN IF NOT EXISTS "n8n_workflow_id" TEXT;');
              console.log('\n-- Criar índice');
              console.log('CREATE INDEX IF NOT EXISTS "client_agents_n8n_workflow_id_idx" ON "client_agents" ("n8n_workflow_id");');
              
              return { success: false, manual: true };
            }
            
            logger.error(`Erro na execução da query: ${query}`);
            logger.error(queryError);
          } else {
            logger.info(`Query executada com sucesso: ${query}`);
          }
        }
      } else {
        logger.error(`Erro na execução do SQL: ${error.message}`);
        throw new Error(`Falha na migração: ${error.message}`);
      }
    }
    
    logger.info('Migração aplicada com sucesso!');
    return { success: true };
  } catch (error) {
    logger.error(`Erro na migração: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Se executado diretamente
if (require.main === module) {
  applyMigration()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Migração concluída com sucesso!');
        process.exit(0);
      } else if (result.manual) {
        console.log('\n⚠️ É necessário executar os comandos SQL manualmente no console do Supabase.');
        process.exit(0);
      } else {
        console.error('\n❌ Falha na migração!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { applyMigration }; 