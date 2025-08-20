-- Criar função get_user_profile para recuperar perfil do usuário de forma segura
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id_param UUID)
RETURNS SETOF public.user_profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM public.user_profiles 
    WHERE id = user_id_param
    LIMIT 1;
$$;

-- Comentário na função
COMMENT ON FUNCTION public.get_user_profile IS 'Recupera o perfil do usuário de forma segura (security definer)';

-- Criar gatilho para atualizar perfil quando auth.users for atualizado
DO $$
BEGIN
  -- Verifique se a tabela user_profiles existe
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
  ) THEN
    -- Criar ou substituir a função para inserir/atualizar perfil
    CREATE OR REPLACE FUNCTION public.handle_user_update()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        -- Inserir novo perfil quando um usuário é criado
        INSERT INTO public.user_profiles (id, email, first_name, last_name, full_name, avatar_url)
        VALUES (
          NEW.id,
          NEW.email,
          NEW.raw_user_meta_data->>'first_name',
          NEW.raw_user_meta_data->>'last_name',
          NEW.raw_user_meta_data->>'full_name',
          NEW.raw_user_meta_data->>'avatar_url'
        )
        ON CONFLICT (id) DO NOTHING;
        
      ELSIF TG_OP = 'UPDATE' THEN
        -- Atualizar perfil quando um usuário é atualizado
        UPDATE public.user_profiles
        SET 
          email = NEW.email,
          first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', first_name),
          last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', last_name),
          full_name = COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            CASE
              WHEN NEW.raw_user_meta_data->>'first_name' IS NOT NULL OR NEW.raw_user_meta_data->>'last_name' IS NOT NULL
              THEN CONCAT(
                COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
                CASE WHEN NEW.raw_user_meta_data->>'first_name' IS NOT NULL AND NEW.raw_user_meta_data->>'last_name' IS NOT NULL THEN ' ' ELSE '' END,
                COALESCE(NEW.raw_user_meta_data->>'last_name', '')
              )
              ELSE full_name
            END
          ),
          avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
      END IF;
      
      RETURN NEW;
    END;
    $$;

    -- Criar gatilho se ainda não existir
    DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
    CREATE TRIGGER on_auth_user_updated
      AFTER INSERT OR UPDATE ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_user_update();
    
    RAISE NOTICE 'Trigger on_auth_user_updated criado com sucesso.';
  ELSE
    RAISE WARNING 'Tabela user_profiles não encontrada. O trigger não será criado.';
  END IF;
END
$$; 