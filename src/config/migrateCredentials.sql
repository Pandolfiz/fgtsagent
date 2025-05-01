-- Migração para criar a tabela credentials
-- Este arquivo pode ser executado diretamente no SQL Editor do Supabase

-- Verificar se a extensão uuid-ossp está disponível
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar a tabela credentials
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

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS credentials_organization_id_idx ON public.credentials (organization_id);
CREATE INDEX IF NOT EXISTS credentials_type_idx ON public.credentials (type);

-- Adicionar comentários
COMMENT ON TABLE public.credentials IS 'Armazena credenciais para acesso a APIs externas';
COMMENT ON COLUMN public.credentials.id IS 'Identificador único da credencial';
COMMENT ON COLUMN public.credentials.name IS 'Nome da credencial';
COMMENT ON COLUMN public.credentials.type IS 'Tipo da credencial (ex: google, microsoft)';
COMMENT ON COLUMN public.credentials.organization_id IS 'ID da organização proprietária';
COMMENT ON COLUMN public.credentials.data IS 'Dados específicos da credencial (tokens, etc)';
COMMENT ON COLUMN public.credentials.created_by IS 'ID do usuário que criou a credencial';

-- Adicionar políticas RLS (Row Level Security) se necessário
-- ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

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