-- Script para configurar policies do webhook no Supabase
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Habilitar RLS na tabela order
ALTER TABLE "order" ENABLE ROW LEVEL SECURITY;

-- 2. Remover policies antigas (se existirem)
DROP POLICY IF EXISTS "Service role can update order status" ON "order";
DROP POLICY IF EXISTS "Users can update own orders" ON "order";
DROP POLICY IF EXISTS "Service role can update orders" ON "order";

-- 3. Criar policy para service role atualizar qualquer order
CREATE POLICY "Service role can update order status" ON "order"
    FOR UPDATE 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 4. Criar policy para service role inserir orders
CREATE POLICY "Service role can insert orders" ON "order"
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

-- 5. Criar policy para service role selecionar orders
CREATE POLICY "Service role can select orders" ON "order"
    FOR SELECT 
    TO service_role
    USING (true);

-- 6. Verificar se a coluna status existe, se não, criar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order' AND column_name = 'status'
    ) THEN
        ALTER TABLE "order" ADD COLUMN status TEXT DEFAULT 'pendente';
        RAISE NOTICE 'Coluna status criada com valor padrão "pendente"';
    ELSE
        RAISE NOTICE 'Coluna status já existe';
    END IF;
END $$;

-- 7. Verificar se a coluna updated_at existe, se não, criar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE "order" ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Coluna updated_at criada';
    ELSE
        RAISE NOTICE 'Coluna updated_at já existe';
    END IF;
END $$;

-- 8. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_order_status ON "order"(status);
CREATE INDEX IF NOT EXISTS idx_order_user_status ON "order"(id_user, status);
CREATE INDEX IF NOT EXISTS idx_order_external_reference ON "order"(external_reference);

-- 9. Verificar se as policies foram criadas
SELECT 
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'order'
ORDER BY policyname;

-- 10. Verificar estrutura da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'order' 
ORDER BY ordinal_position;

-- 11. Teste: Verificar orders existentes
SELECT 
    id,
    id_user,
    status,
    external_reference,
    created_at,
    updated_at
FROM "order" 
ORDER BY created_at DESC
LIMIT 10;
