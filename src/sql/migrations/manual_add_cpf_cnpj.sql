-- Script SQL para adicionar coluna CPF/CNPJ manualmente
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar coluna CPF/CNPJ
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(14);

-- 2. Adicionar comentário à coluna
COMMENT ON COLUMN user_profiles.cpf_cnpj IS 'CPF (11 dígitos) ou CNPJ (14 dígitos) do usuário, apenas números';

-- 3. Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf_cnpj ON user_profiles(cpf_cnpj);

-- 4. Verificar se a coluna foi criada
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'cpf_cnpj';

-- 5. Verificar estrutura completa da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position; 
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar coluna CPF/CNPJ
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(14);

-- 2. Adicionar comentário à coluna
COMMENT ON COLUMN user_profiles.cpf_cnpj IS 'CPF (11 dígitos) ou CNPJ (14 dígitos) do usuário, apenas números';

-- 3. Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf_cnpj ON user_profiles(cpf_cnpj);

-- 4. Verificar se a coluna foi criada
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'cpf_cnpj';

-- 5. Verificar estrutura completa da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position; 