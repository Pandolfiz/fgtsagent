-- Criar tabela de saldos consultados e simulados
CREATE TABLE IF NOT EXISTS public.balance (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  simulation NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.balance ENABLE ROW LEVEL SECURITY;

-- Permitir seleção apenas ao próprio usuário autenticado
CREATE POLICY select_balance ON public.balance
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Índice para otimizar consultas por usuário e data
CREATE INDEX IF NOT EXISTS idx_balance_user_created_at
  ON public.balance (user_id, created_at DESC); 