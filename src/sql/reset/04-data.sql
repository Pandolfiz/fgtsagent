-- Arquivo para inserir dados iniciais no banco

-- 1. Inserir uma organização demo
INSERT INTO organizations (id, name, slug, description)
VALUES 
  ('abe777e1-9fb8-4edf-9b1a-e41a980c9d8d', 'Organização Demo', 'demo-org', 'Organização para demonstração')
ON CONFLICT (id) DO NOTHING;

-- 2. Inserir o usuário como membro proprietário da organização demo (usar ID do usuário atual)
INSERT INTO organization_members (organization_id, user_id, role)
VALUES 
  ('abe777e1-9fb8-4edf-9b1a-e41a980c9d8d', 'c3fb573b-5bad-4069-967d-403cafcc3370', 'owner')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 3. Inserir templates de agentes
INSERT INTO agent_templates (id, name, description, configuration)
VALUES 
  ('f8d9a841-7da9-4e74-b922-8c8c132a9d9c', 'Assistente Geral', 'Um assistente IA para responder perguntas gerais', '{"model": "gpt-4", "system_prompt": "Você é um assistente IA útil e amigável."}'),
  ('b5a6c4e2-3d7f-4c8a-9e1b-0f2d3a5b6c7d', 'Assistente de Vendas', 'Um assistente IA especializado em vendas', '{"model": "gpt-4", "system_prompt": "Você é um assistente de vendas especializado."}'),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Assistente de Suporte', 'Um assistente IA para auxiliar no suporte técnico', '{"model": "gpt-4", "system_prompt": "Você é um assistente de suporte técnico."}')
ON CONFLICT (id) DO NOTHING;

-- 4. Inserir alguns agentes de exemplo para o usuário atual
INSERT INTO client_agents (name, description, template_id, organization_id, created_by, is_active)
VALUES 
  ('Assistente Pessoal', 'Meu assistente para tarefas diárias', 'f8d9a841-7da9-4e74-b922-8c8c132a9d9c', 'abe777e1-9fb8-4edf-9b1a-e41a980c9d8d', 'c3fb573b-5bad-4069-967d-403cafcc3370', true),
  ('Assistente de Vendas', 'Ajuda com estratégias de vendas', 'b5a6c4e2-3d7f-4c8a-9e1b-0f2d3a5b6c7d', 'abe777e1-9fb8-4edf-9b1a-e41a980c9d8d', 'c3fb573b-5bad-4069-967d-403cafcc3370', true),
  ('Suporte Técnico', 'Auxílio com problemas técnicos', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'abe777e1-9fb8-4edf-9b1a-e41a980c9d8d', 'c3fb573b-5bad-4069-967d-403cafcc3370', false);

-- 5. Inserir algumas interações de exemplo
INSERT INTO agent_interactions (agent_id, user_id, user_message, agent_response, created_at)
SELECT 
  id, 
  'c3fb573b-5bad-4069-967d-403cafcc3370', 
  'Olá, como você pode me ajudar?', 
  'Olá! Posso ajudar com diversas tarefas, como responder perguntas, organizar informações e auxiliar em tarefas diárias. Como posso ajudar hoje?',
  NOW() - INTERVAL '1 day'
FROM client_agents
WHERE name = 'Assistente Pessoal' AND created_by = 'c3fb573b-5bad-4069-967d-403cafcc3370'
LIMIT 1;

INSERT INTO agent_interactions (agent_id, user_id, user_message, agent_response, created_at)
SELECT 
  id, 
  'c3fb573b-5bad-4069-967d-403cafcc3370', 
  'Quais são as melhores estratégias de vendas?', 
  'Existem várias estratégias eficazes de vendas, como: 1) Entender bem seu público-alvo, 2) Focar nos benefícios em vez de apenas características, 3) Construir relacionamentos de longo prazo com clientes, 4) Utilizar social proof e depoimentos, e 5) Oferecer soluções personalizadas para as necessidades específicas. Posso detalhar alguma dessas estratégias?',
  NOW() - INTERVAL '2 days'
FROM client_agents
WHERE name = 'Assistente de Vendas' AND created_by = 'c3fb573b-5bad-4069-967d-403cafcc3370'
LIMIT 1; 