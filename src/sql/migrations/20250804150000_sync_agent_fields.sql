-- Migration: Sincronização automática de agent_status e agent_state
-- Data: 2025-08-04 15:00:00

-- Função para sincronizar agent_status com agent_state
CREATE OR REPLACE FUNCTION sync_agent_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Se agent_state foi alterado, sincronizar agent_status
  IF TG_OP = 'UPDATE' AND (OLD.agent_state IS DISTINCT FROM NEW.agent_state) THEN
    CASE NEW.agent_state
      WHEN 'ai' THEN
        NEW.agent_status := 'full';
      WHEN 'human' THEN
        NEW.agent_status := 'half';
      ELSE
        NEW.agent_status := 'full'; -- padrão
    END CASE;
  END IF;
  
  -- Se agent_status foi alterado, sincronizar agent_state
  IF TG_OP = 'UPDATE' AND (OLD.agent_status IS DISTINCT FROM NEW.agent_status) THEN
    CASE NEW.agent_status
      WHEN 'full' THEN
        NEW.agent_state := 'ai';
      WHEN 'half', 'on demand' THEN
        NEW.agent_state := 'human';
      ELSE
        NEW.agent_state := 'ai'; -- padrão
    END CASE;
  END IF;
  
  -- Para INSERT, garantir sincronização inicial
  IF TG_OP = 'INSERT' THEN
    -- Se agent_state foi fornecido, determinar agent_status
    IF NEW.agent_state IS NOT NULL AND NEW.agent_status IS NULL THEN
      CASE NEW.agent_state
        WHEN 'ai' THEN
          NEW.agent_status := 'full';
        WHEN 'human' THEN
          NEW.agent_status := 'half';
        ELSE
          NEW.agent_status := 'full';
      END CASE;
    END IF;
    
    -- Se agent_status foi fornecido, determinar agent_state
    IF NEW.agent_status IS NOT NULL AND NEW.agent_state IS NULL THEN
      CASE NEW.agent_status
        WHEN 'full' THEN
          NEW.agent_state := 'ai';
        WHEN 'half', 'on demand' THEN
          NEW.agent_state := 'human';
        ELSE
          NEW.agent_state := 'ai';
      END CASE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para sincronizar campos antes de INSERT ou UPDATE
DROP TRIGGER IF EXISTS sync_agent_fields_trigger ON contacts;
CREATE TRIGGER sync_agent_fields_trigger
  BEFORE INSERT OR UPDATE OF agent_state, agent_status
  ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION sync_agent_fields();

-- Comentário explicativo
COMMENT ON FUNCTION sync_agent_fields() IS 'Sincroniza automaticamente agent_status e agent_state na tabela contacts';
COMMENT ON TRIGGER sync_agent_fields_trigger ON contacts IS 'Trigger para sincronização automática de campos de agente'; 