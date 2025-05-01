-- Script para corrigir permissões RLS na tabela n8n_credentials
-- Execute este script no SQL Editor do Supabase

-- Verificar se a tabela existe
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'n8n_credentials') THEN
    -- Remover políticas existentes (para evitar duplicatas)
    DROP POLICY IF EXISTS "Usuários podem ver credenciais n8n de suas organizações" ON public.n8n_credentials;
    DROP POLICY IF EXISTS "Usuários podem criar credenciais n8n em suas organizações" ON public.n8n_credentials;
    DROP POLICY IF EXISTS "API Key pode acessar todas as credenciais n8n" ON public.n8n_credentials;
    DROP POLICY IF EXISTS "Service role pode acessar todas as credenciais n8n" ON public.n8n_credentials;

    -- Garantir que RLS está ativado
    ALTER TABLE public.n8n_credentials ENABLE ROW LEVEL SECURITY;

    -- Recriação das políticas com permissões corretas
    -- Política para permitir SELECT para credenciais n8n da sua organização
    CREATE POLICY "Usuários podem ver credenciais n8n de suas organizações"
      ON public.n8n_credentials
      FOR SELECT
      USING (
        organization_id IN (
          SELECT unnest(auth.jwt() -> 'app_metadata' -> 'organizations')::uuid
        )
      );

    -- Política para permitir INSERT de credenciais n8n
    CREATE POLICY "Usuários podem criar credenciais n8n em suas organizações"
      ON public.n8n_credentials
      FOR INSERT
      WITH CHECK (
        organization_id IN (
          SELECT unnest(auth.jwt() -> 'app_metadata' -> 'organizations')::uuid
        )
      );

    -- Política para permitir UPDATE de credenciais n8n da sua organização
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

    -- Política para permitir DELETE de credenciais n8n da sua organização
    CREATE POLICY "Usuários podem excluir credenciais n8n de suas organizações"
      ON public.n8n_credentials
      FOR DELETE
      USING (
        organization_id IN (
          SELECT unnest(auth.jwt() -> 'app_metadata' -> 'organizations')::uuid
        )
      );

    -- Política específica para service_role (essencial para APIs e scripts)
    CREATE POLICY "Service role pode acessar todas as credenciais n8n"
      ON public.n8n_credentials
      USING (
        (current_setting('request.jwt.claims', true)::jsonb)->>'role' = 'service_role'
      );

    -- Política alternativa para anon key com insert via funções seguras
    CREATE POLICY "Anon pode inserir credenciais n8n via RPC"
      ON public.n8n_credentials
      FOR INSERT
      WITH CHECK (
        (SELECT current_setting('role', false) = ANY(array['rpc', 'supabase_functions_admin']))
      );

    RAISE NOTICE 'Políticas RLS para n8n_credentials atualizadas com sucesso!';
  ELSE
    RAISE NOTICE 'A tabela n8n_credentials não existe. Execute primeiro o script migrateAllTables.sql.';
  END IF;
END $$; 