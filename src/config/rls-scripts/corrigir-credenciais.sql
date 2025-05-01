-- Script para corrigir permissões nas tabelas de credenciais
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se as tabelas existem
DO $$
BEGIN
  -- Verificar tabela credentials
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credentials') THEN
    -- Garantir que RLS está ativado
    ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
    
    -- Remover políticas existentes para evitar duplicatas
    DROP POLICY IF EXISTS "Usuários podem ver credenciais de suas organizações" ON public.credentials;
    DROP POLICY IF EXISTS "Usuários podem criar credenciais em suas organizações" ON public.credentials;
    DROP POLICY IF EXISTS "Usuários podem atualizar credenciais de suas organizações" ON public.credentials;
    DROP POLICY IF EXISTS "Usuários podem excluir credenciais de suas organizações" ON public.credentials;
    DROP POLICY IF EXISTS "API Key pode acessar todas as credenciais" ON public.credentials;
    DROP POLICY IF EXISTS "Permitir inserção sem autenticação para callback OAuth2" ON public.credentials;
    DROP POLICY IF EXISTS "Service Role pode acessar todas as credenciais" ON public.credentials;
    
    -- Criar políticas para a tabela credentials
    CREATE POLICY "Usuários podem ver credenciais de suas organizações"
      ON public.credentials
      FOR SELECT
      USING (
        organization_id IN (
          SELECT unnest(auth.jwt() -> 'app_metadata' -> 'organizations')::uuid
        )
      );

    CREATE POLICY "Usuários podem criar credenciais em suas organizações"
      ON public.credentials
      FOR INSERT
      WITH CHECK (
        organization_id IN (
          SELECT unnest(auth.jwt() -> 'app_metadata' -> 'organizations')::uuid
        )
      );

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

    CREATE POLICY "Usuários podem excluir credenciais de suas organizações"
      ON public.credentials
      FOR DELETE
      USING (
        organization_id IN (
          SELECT unnest(auth.jwt() -> 'app_metadata' -> 'organizations')::uuid
        )
      );

    CREATE POLICY "Service Role pode acessar todas as credenciais"
      ON public.credentials
      USING (
        (current_setting('request.jwt.claims', true)::jsonb)->>'role' = 'service_role'
      );
    
    RAISE NOTICE 'Políticas para a tabela credentials atualizadas com sucesso!';
  ELSE
    RAISE NOTICE 'A tabela credentials não existe!';
  END IF;

  -- Verificar tabela n8n_credentials
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'n8n_credentials') THEN
    -- Garantir que RLS está ativado
    ALTER TABLE public.n8n_credentials ENABLE ROW LEVEL SECURITY;
    
    -- Remover políticas existentes para evitar duplicatas
    DROP POLICY IF EXISTS "Usuários podem ver credenciais n8n de suas organizações" ON public.n8n_credentials;
    DROP POLICY IF EXISTS "Usuários podem criar credenciais n8n em suas organizações" ON public.n8n_credentials;
    DROP POLICY IF EXISTS "Usuários podem atualizar credenciais n8n de suas organizações" ON public.n8n_credentials;
    DROP POLICY IF EXISTS "Usuários podem excluir credenciais n8n de suas organizações" ON public.n8n_credentials;
    DROP POLICY IF EXISTS "API Key pode acessar todas as credenciais n8n" ON public.n8n_credentials;
    DROP POLICY IF EXISTS "Service role pode acessar todas as credenciais n8n" ON public.n8n_credentials;
    DROP POLICY IF EXISTS "Anon pode inserir credenciais n8n via RPC" ON public.n8n_credentials;
    
    -- Criar políticas para a tabela n8n_credentials
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

    CREATE POLICY "Usuários podem atualizar credenciais n8n de suas organizações"
      ON public.n8n_credentials
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

    CREATE POLICY "Usuários podem excluir credenciais n8n de suas organizações"
      ON public.n8n_credentials
      FOR DELETE
      USING (
        organization_id IN (
          SELECT unnest(auth.jwt() -> 'app_metadata' -> 'organizations')::uuid
        )
      );

    CREATE POLICY "Service role pode acessar todas as credenciais n8n"
      ON public.n8n_credentials
      USING (
        (current_setting('request.jwt.claims', true)::jsonb)->>'role' = 'service_role'
      );
    
    RAISE NOTICE 'Políticas para a tabela n8n_credentials atualizadas com sucesso!';
  ELSE
    RAISE NOTICE 'A tabela n8n_credentials não existe!';
  END IF;
END $$; 