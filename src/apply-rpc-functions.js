require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const logger = require('./utils/logger');

// Inicializar o cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function applySQLFunctions() {
  try {
    console.log('=== APLICANDO FUNÇÕES RPC NO SUPABASE ===');
    
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'sql', 'fix-rpc-functions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Separar funções para executar individualmente
    const functions = sql.split(';');
    
    for (const func of functions) {
      const trimmedFunc = func.trim();
      if (!trimmedFunc) continue;
      
      try {
        // Adicionar ponto e vírgula de volta
        const functionSQL = trimmedFunc + ';';
        
        console.log(`\nExecutando função: ${functionSQL.substring(0, 50)}...`);
        
        // Executar a função via RPC
        const { error } = await supabase.rpc('exec_sql', { sql: functionSQL });
        
        if (error) {
          console.error(`Erro ao executar função: ${error.message}`);
          console.log('Tentando método alternativo...');
          
          // Método alternativo: executar SQL direto
          const { error: rawError } = await supabase.from('rpc').select('*').execute(functionSQL);
          
          if (rawError) {
            console.error(`Erro no método alternativo: ${rawError.message}`);
          } else {
            console.log('Função executada com sucesso via método alternativo!');
          }
        } else {
          console.log('Função executada com sucesso!');
        }
      } catch (fnError) {
        console.error(`Erro ao processar função: ${fnError.message}`);
      }
    }
    
    // Verificar se as funções foram criadas
    console.log('\nVerificando funções criadas...');
    
    const { data: functions1, error: error1 } = await supabase.rpc('get_user_memberships', { user_id_param: '00000000-0000-0000-0000-000000000000' });
    console.log(`get_user_memberships: ${error1 ? 'ERRO: ' + error1.message : 'OK'}`);
    
    const { data: functions2, error: error2 } = await supabase.rpc('get_user_agents', { user_id_param: '00000000-0000-0000-0000-000000000000' });
    console.log(`get_user_agents: ${error2 ? 'ERRO: ' + error2.message : 'OK'}`);
    
    const { data: functions3, error: error3 } = await supabase.rpc('get_dashboard_stats', { user_id_param: '00000000-0000-0000-0000-000000000000' });
    console.log(`get_dashboard_stats: ${error3 ? 'ERRO: ' + error3.message : 'OK'}`);
    
    console.log('\n=== PRÓXIMOS PASSOS ===');
    console.log('1. Reinicie o servidor com: npm run dev');
    console.log('2. Acesse o dashboard para testar as alterações');
    
  } catch (error) {
    console.error('Erro ao aplicar funções RPC:', error);
  }
}

// Executar o script
applySQLFunctions(); 