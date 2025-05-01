require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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

// Email do usuário alvo e IDs
const targetUserEmail = 'luizfiorimr@gmail.com';
const userId = 'c3fb573b-5bad-4069-967d-403cafcc3370'; // ID obtido dos logs
const orgId = 'abe777e1-9fb8-4edf-9b1a-e41a980c9d8d'; // ID obtido dos logs

async function createAgentViaSQL() {
  try {
    console.log('=== CRIANDO AGENTE VIA SQL DIRETO ===');
    
    // 1. Verificar se o usuário existe
    console.log(`Verificando usuário ${targetUserEmail}...`);
    
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      throw new Error(`Erro ao consultar usuários: ${userError.message}`);
    }
    
    const targetUser = userData.users.find(user => user.email === targetUserEmail);
    
    if (!targetUser) {
      throw new Error(`Usuário ${targetUserEmail} não encontrado.`);
    }
    
    console.log(`Usuário encontrado: ${targetUser.email} (ID: ${targetUser.id})`);
    
    // 2. Verificar templates disponíveis
    console.log('\nConsultando templates disponíveis...');
    
    const { data: templates, error: templateError } = await supabase
      .from('agent_templates')
      .select('id, name, description')
      .limit(10);
    
    if (templateError) {
      throw new Error(`Erro ao consultar templates: ${templateError.message}`);
    }
    
    if (!templates || templates.length === 0) {
      throw new Error('Nenhum template encontrado.');
    }
    
    console.log(`Templates disponíveis: ${templates.length}`);
    
    templates.forEach((template, index) => {
      console.log(`  ${index + 1}. ${template.name} (ID: ${template.id})`);
    });
    
    // 3. Criar agentes via SQL direto para cada template
    console.log('\nCriando agentes diretamente via SQL...');
    
    let createdAgents = [];
    
    for (const template of templates) {
      console.log(`\nProcessando template: ${template.name} (ID: ${template.id})`);
      
      // Remover agente existente com o mesmo template_id (se houver)
      const deleteSQL = `
        DELETE FROM client_agents 
        WHERE template_id = '${template.id}' 
        AND organization_id = '${orgId}';
      `;
      
      try {
        const { error: deleteError } = await supabase.rpc('exec_sql', { 
          sql: deleteSQL 
        });
        
        if (deleteError) {
          console.error(`Erro ao remover agente existente: ${deleteError.message}`);
        }
      } catch (deleteError) {
        console.error(`Erro ao remover agente existente: ${deleteError.message}`);
      }
      
      // Criar novo agente
      const insertSQL = `
        INSERT INTO client_agents (
          name, 
          description, 
          template_id, 
          organization_id, 
          created_by,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          '${template.name}',
          '${(template.description || '').replace(/'/g, "''")}',
          '${template.id}',
          '${orgId}',
          '${userId}',
          true,
          now(),
          now()
        ) RETURNING id;
      `;
      
      try {
        const { data, error: insertError } = await supabase.rpc('exec_sql', { 
          sql: insertSQL 
        });
        
        if (insertError) {
          console.error(`Erro ao criar agente: ${insertError.message}`);
        } else {
          console.log(`Agente criado com sucesso via SQL para template: ${template.name}`);
          createdAgents.push({
            name: template.name,
            templateId: template.id
          });
        }
      } catch (insertError) {
        console.error(`Erro ao criar agente: ${insertError.message}`);
      }
    }
    
    // 4. Verificar permissões da tabela
    console.log('\nConfigurando permissões da tabela client_agents...');
    
    const permissionsSQL = `
      -- Garantir que o RLS está desativado (para desenvolvimento)
      ALTER TABLE client_agents DISABLE ROW LEVEL SECURITY;
      
      -- Garantir que o usuário anon tem acesso à tabela
      GRANT SELECT, INSERT, UPDATE, DELETE ON client_agents TO anon;
      GRANT SELECT, INSERT, UPDATE, DELETE ON client_agents TO authenticated;
      GRANT SELECT, INSERT, UPDATE, DELETE ON client_agents TO service_role;
      
      -- Garantir acesso à sequência de ID (se houver)
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
    `;
    
    try {
      const { error: permError } = await supabase.rpc('exec_sql', { 
        sql: permissionsSQL 
      });
      
      if (permError) {
        console.error(`Erro ao configurar permissões: ${permError.message}`);
      } else {
        console.log('Permissões configuradas com sucesso!');
      }
    } catch (permError) {
      console.error(`Erro ao configurar permissões: ${permError.message}`);
    }
    
    // 5. Relatório final
    console.log('\n=== RESUMO ===');
    
    if (createdAgents.length > 0) {
      console.log(`Agentes criados com sucesso para o usuário ${targetUserEmail}:`);
      createdAgents.forEach((agent, index) => {
        console.log(`  ${index + 1}. ${agent.name}`);
      });
    } else {
      console.log(`Não foi possível criar agentes para o usuário ${targetUserEmail}.`);
    }
    
    console.log('\nVerifique o console do Supabase para confirmar se os agentes foram criados corretamente.');
    console.log('Se ainda houver problemas, você pode precisar ajustar as permissões do banco de dados.');
    
  } catch (error) {
    console.error(`ERRO: ${error.message}`);
    process.exit(1);
  }
}

// Executar a função
createAgentViaSQL(); 