// Script para aplicar a função RPC get_user_profile
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Obter credenciais do ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Verificar se as credenciais existem
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: SUPABASE_URL e SUPABASE_SERVICE_KEY são necessários no arquivo .env');
  process.exit(1);
}

// Criar cliente Supabase com acesso administrativo
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function aplicarSQL() {
  try {
    // Ler o conteúdo do arquivo SQL
    const sqlFilePath = path.join(__dirname, 'sql', 'create-get-user-profile.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Conteúdo SQL carregado:');
    console.log('----------------------------------------');
    console.log(sqlContent);
    console.log('----------------------------------------');
    
    // Opção 1: Tentar aplicar via função exec_sql
    console.log('\nTentando aplicar via RPC exec_sql...');
    try {
      const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sqlContent });
      
      if (error) {
        console.error(`Erro ao executar via RPC: ${error.message}`);
      } else {
        console.log('SQL aplicado com sucesso via RPC!');
        return true;
      }
    } catch (error) {
      console.error(`Exceção ao executar via RPC: ${error.message}`);
    }
    
    // Opção 2: Tentar executar diretamente via REST API (precisa estar habilitado no projeto)
    console.log('\nTentando aplicar via API REST...');
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql_query: sqlContent })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('SQL aplicado com sucesso via REST API!');
        return true;
      } else {
        console.error(`Erro ao executar via REST API: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      console.error(`Exceção ao executar via REST API: ${error.message}`);
    }
    
    // Opção 3: Sugerir execução manual
    console.log('\nNão foi possível aplicar o SQL automaticamente.');
    console.log('Por favor, execute o conteúdo SQL abaixo no console SQL do Supabase:');
    console.log('----------------------------------------');
    console.log(sqlContent);
    console.log('----------------------------------------');
    
    return false;
  } catch (error) {
    console.error(`Erro ao processar arquivo SQL: ${error.message}`);
    return false;
  }
}

// Executar script
console.log('Iniciando aplicação da função RPC get_user_profile...');

aplicarSQL()
  .then(resultado => {
    if (resultado) {
      console.log('\nFunção RPC aplicada com sucesso!');
    } else {
      console.log('\nExecute o SQL manualmente conforme instruções acima.');
    }
    process.exit(resultado ? 0 : 1);
  })
  .catch(error => {
    console.error(`\nErro não tratado: ${error.message}`);
    process.exit(1);
  }); 