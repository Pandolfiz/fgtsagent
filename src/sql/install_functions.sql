-- Script para instalar todas as funções do sistema
-- Execute este script no SQL Editor do Supabase

-- Carregar funções de perfil de usuário
\i 'functions/get_user_profile.sql'
\i 'functions/update_user_profile.sql'

-- Carregar outras funções conforme necessário

-- Verificar se as funções foram instaladas
SELECT 
  routine_name AS function_name,
  routine_type
FROM 
  information_schema.routines
WHERE 
  routine_type = 'FUNCTION' AND
  routine_schema = 'public' AND
  routine_name IN ('get_user_profile', 'update_user_profile');

-- Mensagem final
DO $$
BEGIN
  RAISE NOTICE 'Instalação de funções concluída.';
END $$; 