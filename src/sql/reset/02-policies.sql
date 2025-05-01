-- Arquivo de políticas de segurança RLS para as tabelas

-- Habilitar RLS em todas as tabelas
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_agents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_variables" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_interactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_usage_logs" ENABLE ROW LEVEL SECURITY;

-- 1. Políticas para user_profiles
DROP POLICY IF EXISTS "Usuários podem visualizar seus próprios perfis" ON "user_profiles";
DROP POLICY IF EXISTS "Usuários podem editar seus próprios perfis" ON "user_profiles";

CREATE POLICY "Usuários podem visualizar seus próprios perfis"
  ON "user_profiles" FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem editar seus próprios perfis"
  ON "user_profiles" FOR UPDATE
  USING (auth.uid() = id);

-- 2. Políticas para organizations
DROP POLICY IF EXISTS "Organizações visíveis para membros" ON "organizations";
DROP POLICY IF EXISTS "Criação de organização" ON "organizations";
DROP POLICY IF EXISTS "Edição de organização por administradores" ON "organizations";
DROP POLICY IF EXISTS "Exclusão de organização por proprietários" ON "organizations";

CREATE POLICY "Organizações visíveis para membros"
  ON "organizations" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Criação de organização"
  ON "organizations" FOR INSERT
  WITH CHECK (true);  -- Qualquer usuário autenticado pode criar organização

CREATE POLICY "Edição de organização por administradores"
  ON "organizations" FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = id 
      AND user_id = auth.uid()
      AND (role = 'admin' OR role = 'owner')
    )
  );

CREATE POLICY "Exclusão de organização por proprietários"
  ON "organizations" FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = id 
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- 3. Políticas para organization_members
DROP POLICY IF EXISTS "Membros visíveis para membros da mesma organização" ON "organization_members";
DROP POLICY IF EXISTS "Membros podem se adicionar à organização" ON "organization_members";
DROP POLICY IF EXISTS "Administradores podem adicionar membros" ON "organization_members";
DROP POLICY IF EXISTS "Administradores podem atualizar membros" ON "organization_members";
DROP POLICY IF EXISTS "Administradores podem remover membros" ON "organization_members";

CREATE POLICY "Membros visíveis para membros da mesma organização"
  ON "organization_members" FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Membros podem se adicionar à organização"
  ON "organization_members" FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "Administradores podem adicionar membros"
  ON "organization_members" FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND (role = 'admin' OR role = 'owner')
    )
  );

CREATE POLICY "Administradores podem atualizar membros"
  ON "organization_members" FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND (role = 'admin' OR role = 'owner')
    )
  );

CREATE POLICY "Administradores podem remover membros"
  ON "organization_members" FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND (role = 'admin' OR role = 'owner')
    )
    OR user_id = auth.uid() -- usuário pode remover a si mesmo
  );

-- 4. Políticas para agent_templates
DROP POLICY IF EXISTS "Templates visíveis para todos" ON "agent_templates";
DROP POLICY IF EXISTS "Somente admin pode gerenciar templates" ON "agent_templates";

CREATE POLICY "Templates visíveis para todos"
  ON "agent_templates" FOR SELECT
  USING (true);

CREATE POLICY "Somente admin pode gerenciar templates"
  ON "agent_templates" FOR ALL
  USING (
    -- Verificar se o usuário é um superadmin através de uma lista fixa
    auth.uid() IN (
      '40c879e0-4a0b-498b-bfcf-5f18bdb9ec5b', -- Adicione IDs específicos de super admins
      'c3fb573b-5bad-4069-967d-403cafcc3370'  -- ID do usuário atual de teste
    )
  );

-- 5. Políticas para client_agents
DROP POLICY IF EXISTS "Usuários podem ver agentes de suas organizações" ON "client_agents";
DROP POLICY IF EXISTS "Usuários podem criar agentes em suas organizações" ON "client_agents";
DROP POLICY IF EXISTS "Usuários podem editar agentes que criaram" ON "client_agents";
DROP POLICY IF EXISTS "Admins podem editar qualquer agente da organização" ON "client_agents";
DROP POLICY IF EXISTS "Usuários podem excluir agentes que criaram" ON "client_agents";
DROP POLICY IF EXISTS "Admins podem excluir qualquer agente da organização" ON "client_agents";

CREATE POLICY "Usuários podem ver agentes de suas organizações"
  ON "client_agents" FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar agentes em suas organizações"
  ON "client_agents" FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem editar agentes que criaram"
  ON "client_agents" FOR UPDATE
  USING (
    created_by = auth.uid()
  );

CREATE POLICY "Admins podem editar qualquer agente da organização"
  ON "client_agents" FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND (role = 'admin' OR role = 'owner')
    )
  );

CREATE POLICY "Usuários podem excluir agentes que criaram"
  ON "client_agents" FOR DELETE
  USING (
    created_by = auth.uid()
  );

CREATE POLICY "Admins podem excluir qualquer agente da organização"
  ON "client_agents" FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND (role = 'admin' OR role = 'owner')
    )
  );

-- 6. Políticas para agent_variables
DROP POLICY IF EXISTS "Usuários podem ver variáveis de agentes de suas organizações" ON "agent_variables";
DROP POLICY IF EXISTS "Usuários podem gerenciar variáveis de agentes de suas organizações" ON "agent_variables";

CREATE POLICY "Usuários podem ver variáveis de agentes de suas organizações"
  ON "agent_variables" FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM client_agents
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem gerenciar variáveis de agentes de suas organizações"
  ON "agent_variables" FOR ALL
  USING (
    agent_id IN (
      SELECT id FROM client_agents
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- 7. Políticas para agent_interactions
DROP POLICY IF EXISTS "Usuários podem ver interações de agentes de suas organizações" ON "agent_interactions";
DROP POLICY IF EXISTS "Usuários podem criar interações com agentes de suas organizações" ON "agent_interactions";

CREATE POLICY "Usuários podem ver interações de agentes de suas organizações"
  ON "agent_interactions" FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM client_agents
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem criar interações com agentes de suas organizações"
  ON "agent_interactions" FOR INSERT
  WITH CHECK (
    agent_id IN (
      SELECT id FROM client_agents
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
    AND user_id = auth.uid()
  );

-- 8. Políticas para agent_usage_logs
DROP POLICY IF EXISTS "Usuários podem ver logs de uso de agentes de suas organizações" ON "agent_usage_logs";
DROP POLICY IF EXISTS "Sistema pode registrar logs de uso" ON "agent_usage_logs";

CREATE POLICY "Usuários podem ver logs de uso de agentes de suas organizações"
  ON "agent_usage_logs" FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM client_agents
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Sistema pode registrar logs de uso"
  ON "agent_usage_logs" FOR INSERT
  WITH CHECK (true);  -- Permitir que o sistema registre logs via service role 