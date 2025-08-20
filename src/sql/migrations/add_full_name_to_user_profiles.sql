-- Adicionar coluna full_name à tabela user_profiles se não existir
DO $$
BEGIN
    IF NOT EXISTS(
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='user_profiles' AND column_name='full_name'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN full_name TEXT;
        
        -- Atualiza os registros existentes
        UPDATE user_profiles 
        SET full_name = CONCAT(first_name, ' ', last_name)
        WHERE first_name IS NOT NULL OR last_name IS NOT NULL;
    END IF;
END $$; 