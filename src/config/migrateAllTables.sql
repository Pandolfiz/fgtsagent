-- Migração para criar todas as tabelas do sistema
-- Este arquivo pode ser executado diretamente no SQL Editor do Supabase

-- Verificar se a extensão uuid-ossp está disponível
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar a tabela credentials (OAuth2 e outras integrações genéricas)
CREATE TABLE IF NOT EXISTS public.credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  organization_id UUID NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar a tabela n8n_credentials (integrações específicas do n8n)
CREATE TABLE IF NOT EXISTS public.n8n_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  credential_type TEXT NOT NULL,
  node_type TEXT NOT NULL,
  n8n_credential_id TEXT,
  organization_id UUID NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de associação entre agentes e credenciais
CREATE TABLE IF NOT EXISTS public.agent_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL,
  credential_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(agent_id, credential_id)
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS credentials_organization_id_idx ON public.credentials (organization_id);
CREATE INDEX IF NOT EXISTS credentials_type_idx ON public.credentials (type);

CREATE INDEX IF NOT EXISTS n8n_credentials_organization_id_idx ON public.n8n_credentials (organization_id);
CREATE INDEX IF NOT EXISTS n8n_credentials_type_idx ON public.n8n_credentials (type);
CREATE INDEX IF NOT EXISTS n8n_credentials_n8n_credential_id_idx ON public.n8n_credentials (n8n_credential_id);

CREATE INDEX IF NOT EXISTS agent_credentials_agent_id_idx ON public.agent_credentials (agent_id);
CREATE INDEX IF NOT EXISTS agent_credentials_credential_id_idx ON public.agent_credentials (credential_id);
CREATE INDEX IF NOT EXISTS agent_credentials_organization_id_idx ON public.agent_credentials (organization_id);

-- Adicionar comentários
COMMENT ON TABLE public.credentials IS 'Armazena credenciais OAuth2 e outras integrações genéricas';
COMMENT ON TABLE public.n8n_credentials IS 'Armazena credenciais específicas para uso com o n8n';
COMMENT ON TABLE public.agent_credentials IS 'Associação entre agentes e credenciais';

-- Criar RPC para verificar se uma tabela existe
CREATE OR REPLACE FUNCTION public.check_table_exists(p_table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE  table_schema = 'public'
    AND    table_name = p_table_name
  ) INTO table_exists;
  
  RETURN table_exists;
END;
$$; 