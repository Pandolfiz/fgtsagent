-- Função para atualizar perfil do usuário de forma segura
-- Esta função pode ser chamada com privilégios de administrador
CREATE OR REPLACE FUNCTION update_user_profile(
  user_id_param UUID,
  first_name_param TEXT DEFAULT NULL,
  last_name_param TEXT DEFAULT NULL,
  full_name_param TEXT DEFAULT NULL,
  avatar_url_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  profile_exists BOOLEAN;
BEGIN
  -- Verificar se o perfil existe
  SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id = user_id_param) INTO profile_exists;
  
  IF profile_exists THEN
    -- Atualizar perfil existente
    UPDATE user_profiles
    SET 
      first_name = COALESCE(first_name_param, first_name),
      last_name = COALESCE(last_name_param, last_name),
      full_name = COALESCE(full_name_param, full_name),
      avatar_url = COALESCE(avatar_url_param, avatar_url),
      updated_at = NOW()
    WHERE id = user_id_param;
  ELSE
    -- Criar novo perfil
    INSERT INTO user_profiles (
      id,
      first_name,
      last_name,
      full_name,
      avatar_url,
      created_at,
      updated_at
    ) VALUES (
      user_id_param,
      first_name_param,
      last_name_param,
      full_name_param,
      avatar_url_param,
      NOW(),
      NOW()
    );
  END IF;
  
  -- Retornar dados atualizados
  RETURN QUERY
  SELECT 
    up.id,
    up.first_name,
    up.last_name,
    up.full_name,
    up.avatar_url,
    up.created_at,
    up.updated_at
  FROM user_profiles up
  WHERE up.id = user_id_param;
END;
$$;

-- Permitir que usuários autenticados chamem esta função
GRANT EXECUTE ON FUNCTION update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Comentário para a função
COMMENT ON FUNCTION update_user_profile IS 'Atualiza o perfil do usuário de forma segura (security definer)'; 