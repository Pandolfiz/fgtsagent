-- Script SQL para criar índice de performance para CPF/CNPJ
-- Execute este script no SQL Editor do Supabase

-- 1. Criar índice para melhorar performance de consultas por CPF/CNPJ
CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf_cnpj ON user_profiles(cpf_cnpj);

-- 2. Adicionar comentário à coluna
COMMENT ON COLUMN user_profiles.cpf_cnpj IS 'CPF (11 dígitos) ou CNPJ (14 dígitos) do usuário, apenas números';

-- 3. Verificar se o índice foi criado
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'user_profiles' 
AND indexname = 'idx_user_profiles_cpf_cnpj';

-- 4. Verificar estrutura completa da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- 5. Verificar se há dados na coluna
SELECT 
    COUNT(*) as total_profiles,
    COUNT(cpf_cnpj) as profiles_with_cpf_cnpj,
    COUNT(*) - COUNT(cpf_cnpj) as profiles_without_cpf_cnpj
FROM user_profiles; 
-- Execute este script no SQL Editor do Supabase

-- 1. Criar índice para melhorar performance de consultas por CPF/CNPJ
CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf_cnpj ON user_profiles(cpf_cnpj);

-- 2. Adicionar comentário à coluna
COMMENT ON COLUMN user_profiles.cpf_cnpj IS 'CPF (11 dígitos) ou CNPJ (14 dígitos) do usuário, apenas números';

-- 3. Verificar se o índice foi criado
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'user_profiles' 
AND indexname = 'idx_user_profiles_cpf_cnpj';

-- 4. Verificar estrutura completa da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- 5. Verificar se há dados na coluna
SELECT 
    COUNT(*) as total_profiles,
    COUNT(cpf_cnpj) as profiles_with_cpf_cnpj,
    COUNT(*) - COUNT(cpf_cnpj) as profiles_without_cpf_cnpj
FROM user_profiles; 