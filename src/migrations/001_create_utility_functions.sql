-- Função para verificar se uma tabela existe
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name TEXT)
RETURNS BOOLEAN 
SECURITY DEFINER 
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = table_name
  ) INTO table_exists;
  
  RETURN table_exists;
END;
$$;

-- Função para executar SQL dinâmico (apenas para administradores)
CREATE OR REPLACE FUNCTION public.execute_sql(sql_query TEXT)
RETURNS VOID 
SECURITY DEFINER 
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;

-- Criar tabela user_profiles se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles'
  ) THEN
    CREATE TABLE public.user_profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT UNIQUE,
      first_name TEXT,
      last_name TEXT,
      full_name TEXT,
      avatar_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Criar índice para buscas por email
    CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
    
    -- Comentário na tabela
    COMMENT ON TABLE public.user_profiles IS 'Perfis de usuários da plataforma';
  END IF;
END
$$; 