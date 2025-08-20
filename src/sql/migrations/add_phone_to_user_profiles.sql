-- Adicionar coluna phone à tabela user_profiles se não existir
DO $$
BEGIN
    -- Verificar se a coluna já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='user_profiles' AND column_name='phone'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN phone TEXT;
        
        -- Adicionar o comentário à coluna
        COMMENT ON COLUMN user_profiles.phone IS 'Número de telefone do usuário no formato (XX) XXXXX-XXXX';
    END IF;
END
$$; 