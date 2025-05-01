-- Políticas de Segurança de Linha (RLS) para a tabela credentials
-- Execute este script no SQL Editor do Supabase

-- Ativar RLS na tabela credentials
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir SELECT para credenciais da sua organização
CREATE POLICY "Usuários podem ver credenciais de suas organizações"
  ON public.credentials
  FOR SELECT
  USING (
    organization_id IN (
      SELECT unnest(auth.jwt() -> 'app_metadata' -> 'organizations')::uuid
    )
  );

-- Criar política para permitir INSERT de credenciais
CREATE POLICY "Usuários podem criar credenciais em suas organizações"
  ON public.credentials
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT unnest(auth.jwt() -> 'app_metadata' -> 'organizations')::uuid
    )
  );

-- Criar política para permitir UPDATE de credenciais da sua organização
CREATE POLICY "Usuários podem atualizar credenciais de suas organizações"
  ON public.credentials
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT unnest(auth.jwt() -> 'app_metadata' -> 'organizations')::uuid
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT unnest(auth.jwt() -> 'app_metadata' -> 'organizations')::uuid
    )
  );

-- Criar política para permitir DELETE de credenciais da sua organização
CREATE POLICY "Usuários podem excluir credenciais de suas organizações"
  ON public.credentials
  FOR DELETE
  USING (
    organization_id IN (
      SELECT unnest(auth.jwt() -> 'app_metadata' -> 'organizations')::uuid
    )
  );

-- Política especial para autenticação de serviço - Permitir acesso via API key
CREATE POLICY "API Key pode acessar todas as credenciais"
  ON public.credentials
  USING (
    (current_setting('request.jwt.claims', true)::jsonb)->>'role' = 'service_role'
  );

-- Política alternativa para permitir inserção sem autenticação (para o callback OAuth2)
CREATE POLICY "Permitir inserção sem autenticação para callback OAuth2"
  ON public.credentials
  FOR INSERT
  WITH CHECK (true);

-- Aplicar as mesmas políticas para as outras tabelas relacionadas
-- Para a tabela n8n_credentials
ALTER TABLE public.n8n_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver credenciais n8n de suas organizações"
  ON public.n8n_credentials
  FOR SELECT
  USING (
    organization_id IN (
      SELECT unnest(auth.jwt() -> 'app_metadata' -> 'organizations')::uuid
    )
  );

CREATE POLICY "Usuários podem criar credenciais n8n em suas organizações"
  ON public.n8n_credentials
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT unnest(auth.jwt() -> 'app_metadata' -> 'organizations')::uuid
    )
  );

CREATE POLICY "API Key pode acessar todas as credenciais n8n"
  ON public.n8n_credentials
  USING (
    (current_setting('request.jwt.claims', true)::jsonb)->>'role' = 'service_role'
  );

-- Para a tabela agent_credentials
ALTER TABLE public.agent_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver associações de credenciais de suas organizações"
  ON public.agent_credentials
  FOR SELECT
  USING (
    organization_id IN (
      SELECT unnest(auth.jwt() -> 'app_metadata' -> 'organizations')::uuid
    )
  );

CREATE POLICY "Usuários podem criar associações de credenciais em suas organizações"
  ON public.agent_credentials
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT unnest(auth.jwt() -> 'app_metadata' -> 'organizations')::uuid
    )
  );

CREATE POLICY "API Key pode acessar todas as associações de credenciais"
  ON public.agent_credentials
  USING (
    (current_setting('request.jwt.claims', true)::jsonb)->>'role' = 'service_role'
  ); 