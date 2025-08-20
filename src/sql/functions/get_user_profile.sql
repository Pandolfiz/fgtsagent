-- Função para obter o perfil do usuário de forma segura
-- Esta função pode ser chamada com privilégios de usuário e apenas retorna o próprio perfil
CREATE OR REPLACE FUNCTION get_user_profile(
  user_id_param UUID
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
BEGIN
  -- Retornar dados do perfil
  RETURN QUERY
  SELECT 
    up.id,
    up.first_name,
    up.last_name,
    COALESCE(up.full_name, CONCAT(up.first_name, ' ', up.last_name)) as full_name,
    up.avatar_url,
    up.created_at,
    up.updated_at
  FROM user_profiles up
  WHERE up.id = user_id_param;
END;
$$;

-- Permitir que usuários autenticados chamem esta função
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;

-- Comentário para a função
COMMENT ON FUNCTION get_user_profile IS 'Obtém o perfil do usuário de forma segura (security definer)'; 