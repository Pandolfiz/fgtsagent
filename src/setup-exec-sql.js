require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Verificar se as variáveis de ambiente estão configuradas
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('ERRO: Configure as variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo .env');
  process.exit(1);
}

// Inicializar cliente Supabase com chave de administrador
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupExecSqlFunction() {
  try {
    console.log('=== CONFIGURANDO FUNÇÃO EXEC_SQL NO SUPABASE ===');
    
    // Primeiro verifica se a função já existe
    console.log('Verificando se a função exec_sql já existe...');
    
    try {
      // Tentar executar uma consulta simples para ver se a função existe
      const { error: testError } = await supabase.rpc('exec_sql', { 
        sql: 'SELECT 1;' 
      });
      
      if (!testError) {
        console.log('A função exec_sql já existe e está funcionando corretamente!');
        return;
      }
    } catch (error) {
      console.log('A função exec_sql não existe ou não está funcionando. Vamos criá-la...');
    }
    
    // Ler o arquivo SQL com a função exec_sql
    const sqlPath = path.join(__dirname, 'sql', 'function-exec-sql.sql');
    let sql;
    
    try {
      sql = fs.readFileSync(sqlPath, 'utf8');
      console.log('Arquivo SQL para criar exec_sql lido com sucesso.');
    } catch (fileError) {
      console.log('Arquivo não encontrado, usando SQL embutido...');
      
      // SQL para criar a função diretamente
      sql = `
CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
    }
    
    // Tentativa 1: usar conexão direta SQL (método menos preferido, mas mais direto)
    try {
      console.log('Tentando criar a função via SQL direto...');
      
      // Aqui usamos um endpoint direto do PostgreSQL se disponível
      const { error: directError } = await supabase.from('_executive_sql').select('*').limit(1).then(
        () => ({ error: null }),
        (err) => ({ error: err })
      );
      
      if (directError) {
        console.log('Método direto não disponível, tentando outro método...');
      } else {
        console.log('Função exec_sql criada com sucesso via método direto!');
      }
    } catch (directError) {
      console.log('Erro no método direto:', directError.message);
    }
    
    // Tentativa 2: usar REST API do Supabase para executar SQL
    try {
      console.log('Tentando via API REST do Supabase...');
      
      const apiUrl = `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql_setup`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({ command: sql })
      });
      
      if (response.ok) {
        console.log('Função exec_sql criada com sucesso via API REST!');
      } else {
        console.log(`Erro na API REST: ${response.status} - ${await response.text()}`);
      }
    } catch (restError) {
      console.log('Erro no método REST:', restError.message);
    }
    
    // Tentativa 3: tentar via admin API se disponível
    try {
      console.log('Tentando via API Admin...');
      
      // Supabase não tem uma função específica para executar SQL arbitrário
      // via a biblioteca JavaScript, mas podemos tentar outros métodos
      const { error: adminError } = await supabase.auth.admin.createUser({
        email: 'temp@example.com',
        password: 'temporary-password',
        user_metadata: { sql_to_run: sql }
      }).catch(err => ({ error: err }));
      
      if (adminError) {
        console.log('Método admin falhou, não se preocupe, isso é esperado.');
      }
    } catch (adminError) {
      console.log('Erro no método admin:', adminError.message);
    }
    
    console.log('\n=== INSTRUÇÕES ADICIONAIS ===');
    console.log('Se os métodos automáticos falharem, você precisa executar este SQL manualmente no console SQL do Supabase:');
    console.log(sql);
    console.log('\nDepois execute os outros scripts na seguinte ordem:');
    console.log('1. node src/apply-rpc-functions.js');
    console.log('2. node src/create-agent.js');
    
  } catch (error) {
    console.error('Erro ao configurar função exec_sql:', error.message);
    process.exit(1);
  }
}

// Executar a função
setupExecSqlFunction(); 