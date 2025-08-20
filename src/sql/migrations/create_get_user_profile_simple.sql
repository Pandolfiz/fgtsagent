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