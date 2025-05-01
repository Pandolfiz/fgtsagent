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

// Email do usuário alvo
const targetUserEmail = 'luizfiorimr@gmail.com';

async function createAgentForUser() {
  try {
    console.log('=== CRIANDO AGENTE PARA O USUÁRIO ===');
    
    // 1. Verificar se o usuário existe
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      throw new Error(`Erro ao consultar usuários: ${userError.message}`);
    }
    
    const targetUser = userData.users.find(user => user.email === targetUserEmail);
    
    if (!targetUser) {
      throw new Error(`Usuário ${targetUserEmail} não encontrado.`);
    }
    
    console.log(`Usuário encontrado: ${targetUser.email} (ID: ${targetUser.id})`);
    
    // 2. Verificar organizações
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(10);
    
    if (orgError) {
      throw new Error(`Erro ao consultar organizações: ${orgError.message}`);
    }
    
    let userOrg;
    
    if (organizations && organizations.length > 0) {
      userOrg = organizations[0];
      console.log(`Usando organização: ${userOrg.name} (ID: ${userOrg.id})`);
    } else {
      throw new Error('Nenhuma organização encontrada.');
    }
    
    // 3. Verificar se o usuário é membro da organização
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', userOrg.id)
      .eq('user_id', targetUser.id);
      
    if (membersError) {
      console.error(`Erro ao consultar membros: ${membersError.message}`);
    }
    
    if (!members || members.length === 0) {
      console.log(`Adicionando usuário à organização: ${userOrg.name}`);
      
      // Adicionar usuário à organização
      const { error: addError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: userOrg.id,
          user_id: targetUser.id,
          role: 'admin'  // Definir como administrador
        });
        
      if (addError) {
        console.error(`Erro ao adicionar usuário à organização: ${addError.message}`);
      } else {
        console.log('Usuário adicionado à organização com sucesso.');
      }
    } else {
      console.log(`Usuário já é membro da organização: ${userOrg.name}`);
    }
    
    // 4. Verificar templates existentes
    const { data: templates, error: templateError } = await supabase
      .from('agent_templates')
      .select('*');
      
    if (templateError) {
      throw new Error(`Erro ao consultar templates: ${templateError.message}`);
    }
    
    if (!templates || templates.length === 0) {
      throw new Error('Nenhum template encontrado.');
    }
    
    console.log(`Templates disponíveis: ${templates.length}`);
    
    // 5. Verificar agentes existentes
    const { data: agents, error: agentsError } = await supabase
      .from('client_agents')
      .select('*')
      .eq('organization_id', userOrg.id);
      
    if (agentsError) {
      throw new Error(`Erro ao consultar agentes: ${agentsError.message}`);
    }
    
    console.log(`Agentes existentes: ${agents?.length || 0}`);
    
    // 6. Configurar função SQL para criar agentes (MOVIDO PARA ANTES DE USAR)
    console.log('Configurando função SQL para criar agentes...');
    
    try {
      const { error: fnError } = await supabase.rpc('create_sql_function', {
        p_function_name: 'create_agent_for_template',
        p_function_body: `
          DECLARE
            new_agent_id UUID;
          BEGIN
            INSERT INTO public.client_agents (
              name, 
              description, 
              template_id, 
              organization_id, 
              user_id
            ) VALUES (
              p_name,
              p_description,
              p_template_id,
              p_organization_id,
              p_user_id
            )
            RETURNING id INTO new_agent_id;
            
            RETURN new_agent_id;
          END;
        `,
        p_args: [
          { name: 'p_name', type: 'text' },
          { name: 'p_description', type: 'text' },
          { name: 'p_template_id', type: 'uuid' },
          { name: 'p_organization_id', type: 'uuid' },
          { name: 'p_user_id', type: 'uuid' }
        ]
      });
      
      if (fnError) {
        console.error(`Erro ao criar função SQL: ${fnError.message}`);
        
        // Tentar método alternativo se falhar
        console.log('Tentando criar função via SQL direto...');
        
        const sql = `
          CREATE OR REPLACE FUNCTION create_agent_for_template(
            p_name TEXT,
            p_description TEXT,
            p_template_id UUID,
            p_organization_id UUID,
            p_user_id UUID
          ) RETURNS UUID AS $$
          DECLARE
            new_agent_id UUID;
          BEGIN
            INSERT INTO public.client_agents (
              name, 
              description, 
              template_id, 
              organization_id, 
              user_id
            ) VALUES (
              p_name,
              p_description,
              p_template_id,
              p_organization_id,
              p_user_id
            )
            RETURNING id INTO new_agent_id;
            
            RETURN new_agent_id;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `;
        
        const { error: execError } = await supabase.rpc('exec_sql', { sql });
        
        if (execError) {
          console.error(`Erro ao executar SQL direto: ${execError.message}`);
        } else {
          console.log('Função SQL criada com sucesso via SQL direto!');
        }
      } else {
        console.log('Função SQL criada com sucesso!');
      }
    } catch (sqlError) {
      console.error(`Erro ao criar função SQL: ${sqlError.message}`);
    }
    
    // 7. Criar agentes para cada template se não existirem
    const createdAgents = [];
    
    for (const template of templates) {
      // Verificar se já existe um agente para este template
      const existingAgent = agents?.find(a => a.template_id === template.id);
      
      if (existingAgent) {
        console.log(`Agente para template "${template.name}" já existe (ID: ${existingAgent.id})`);
        createdAgents.push(existingAgent);
        continue;
      }
      
      // Criar agente com SQL direto para evitar problemas com o cache do esquema
      console.log(`Criando agente para template: ${template.name} (ID: ${template.id})`);
      
      try {
        const { data, error } = await supabase.rpc(
          'create_agent_for_template',
          {
            p_name: template.name,
            p_description: template.description || '',
            p_template_id: template.id,
            p_organization_id: userOrg.id,
            p_user_id: targetUser.id
          }
        );
        
        if (error) {
          console.error(`Erro ao criar agente via RPC: ${error.message}`);
          
          // Tentar inserção direta se a função RPC falhar
          console.log('Tentando inserção direta...');
          
          const { data: directData, error: directError } = await supabase
            .from('client_agents')
            .insert({
              name: template.name,
              description: template.description || '',
              template_id: template.id,
              organization_id: userOrg.id,
              user_id: targetUser.id
            })
            .select('id')
            .single();
            
          if (directError) {
            console.error(`Erro na inserção direta: ${directError.message}`);
          } else {
            console.log(`Agente criado com sucesso via inserção direta: ${directData.id}`);
            createdAgents.push({ id: directData.id, name: template.name });
          }
        } else {
          console.log(`Agente criado com sucesso: ${data}`);
          createdAgents.push({ id: data, name: template.name });
        }
      } catch (agentError) {
        console.error(`Erro ao criar agente: ${agentError.message}`);
      }
    }
    
    console.log('\n=== CONFIGURAÇÃO CONCLUÍDA ===');
    
    if (createdAgents.length > 0) {
      console.log(`\nO usuário ${targetUserEmail} agora tem acesso aos seguintes agentes:`);
      createdAgents.forEach(agent => {
        console.log(`- ${agent.name} (ID: ${agent.id})`);
      });
    } else {
      console.log(`Não foi possível criar agentes para o usuário ${targetUserEmail}.`);
    }
    
    console.log('\nReinicie o servidor para aplicar todas as configurações.');
    
  } catch (error) {
    console.error(`ERRO: ${error.message}`);
    process.exit(1);
  }
}

// Executar a função
createAgentForUser(); 