require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Verificar variáveis de ambiente obrigatórias
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Erro: As variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_KEY são necessárias.');
  process.exit(1);
}

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function listTemplates() {
  try {
    console.log('=== LISTANDO TEMPLATES DISPONÍVEIS ===');
    
    // Consultar templates via API
    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Erro ao listar templates:', error);
      
      // Tentar consultar outras tabelas relacionadas a templates
      console.log('\nTentando identificar a tabela correta de templates...');
      
      const tablesToCheck = [
        'agent_templates',
        'client_templates',
        'template_definitions',
        'router_templates'
      ];
      
      for (const table of tablesToCheck) {
        console.log(`\nVerificando tabela: ${table}`);
        
        const { data, error: tableError } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (tableError) {
          console.log(`Tabela ${table} não encontrada: ${tableError.message}`);
        } else {
          console.log(`Tabela ${table} encontrada! Dados de exemplo:`);
          console.log(data);
          
          // Se encontrou a tabela, listar todos os registros
          const { data: allRecords, error: listError } = await supabase
            .from(table)
            .select('*')
            .order('created_at');
            
          if (listError) {
            console.error(`Erro ao listar registros da tabela ${table}:`, listError);
          } else {
            console.log(`\nLista completa de ${allRecords.length} registros na tabela ${table}:`);
            console.log(allRecords);
          }
        }
      }
      
    } else {
      console.log(`${templates.length} templates encontrados:`);
      templates.forEach((template, index) => {
        console.log(`\n${index + 1}. ${template.name || '[Sem nome]'}`);
        console.log(`   ID: ${template.id}`);
        console.log(`   Criado em: ${new Date(template.created_at).toLocaleString()}`);
        
        if (template.description) {
          console.log(`   Descrição: ${template.description}`);
        }
        
        // Se tiver configuração, mostrar resumo
        if (template.configuration) {
          console.log(`   Configuração: ${typeof template.configuration === 'object' ? 
            JSON.stringify(template.configuration).substring(0, 100) + '...' : 
            template.configuration}`);
        }
      });
    }
    
  } catch (error) {
    console.error('Erro não tratado:', error);
  }
}

// Executar função
listTemplates()
  .then(() => console.log('\n=== VERIFICAÇÃO DE TEMPLATES CONCLUÍDA ==='))
  .catch(err => console.error('Erro ao verificar templates:', err)); 