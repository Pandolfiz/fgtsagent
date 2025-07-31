-- Adicionar campo CPF/CNPJ à tabela user_profiles
-- Esta migração adiciona um campo para armazenar CPF ou CNPJ do usuário

-- Adicionar coluna cpf_cnpj se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'cpf_cnpj'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN cpf_cnpj VARCHAR(14);
        
        -- Adicionar comentário à coluna
        COMMENT ON COLUMN user_profiles.cpf_cnpj IS 'CPF (11 dígitos) ou CNPJ (14 dígitos) do usuário, apenas números';
        
        -- Criar índice para melhorar performance de consultas
        CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf_cnpj ON user_profiles(cpf_cnpj);
        
        RAISE NOTICE 'Coluna cpf_cnpj adicionada à tabela user_profiles';
    ELSE
        RAISE NOTICE 'Coluna cpf_cnpj já existe na tabela user_profiles';
    END IF;
END $$;

-- Verificar se a coluna foi criada corretamente
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'cpf_cnpj'; 
-- Esta migração adiciona um campo para armazenar CPF ou CNPJ do usuário

-- Adicionar coluna cpf_cnpj se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'cpf_cnpj'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN cpf_cnpj VARCHAR(14);
        
        -- Adicionar comentário à coluna
        COMMENT ON COLUMN user_profiles.cpf_cnpj IS 'CPF (11 dígitos) ou CNPJ (14 dígitos) do usuário, apenas números';
        
        -- Criar índice para melhorar performance de consultas
        CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf_cnpj ON user_profiles(cpf_cnpj);
        
        RAISE NOTICE 'Coluna cpf_cnpj adicionada à tabela user_profiles';
    ELSE
        RAISE NOTICE 'Coluna cpf_cnpj já existe na tabela user_profiles';
    END IF;
END $$;

-- Verificar se a coluna foi criada corretamente
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'cpf_cnpj'; 