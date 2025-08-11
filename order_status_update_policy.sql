-- Policy para permitir atualização do status da tabela 'order'
-- Esta policy permite que o service role atualize o status de "pendente" para "pago"
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se RLS está habilitado na tabela order
ALTER TABLE "order" ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas de UPDATE (se existirem)
DROP POLICY IF EXISTS "Service role can update orders" ON "order";
DROP POLICY IF EXISTS "Users can update own orders" ON "order";

-- 3. Criar política específica para atualização de status pelo service role
CREATE POLICY "Service role can update order status" ON "order"
    FOR UPDATE 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 4. Criar política para usuários atualizarem seus próprios orders (opcional)
CREATE POLICY "Users can update own orders" ON "order"
    FOR UPDATE 
    TO authenticated
    USING (auth.uid()::text = id_user)
    WITH CHECK (auth.uid()::text = id_user);

-- 5. Verificar se a coluna status existe, se não, criar
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

-- 6. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_order_status ON "order"(status);
CREATE INDEX IF NOT EXISTS idx_order_user_status ON "order"(id_user, status);

-- 7. Verificar se as políticas foram criadas corretamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'order'
ORDER BY policyname;

-- 8. Verificar estrutura da tabela order
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'order' 
ORDER BY ordinal_position;

-- 9. Teste: Verificar orders com status pendente
SELECT 
    id,
    id_user,
    status,
    created_at
FROM "order" 
WHERE status = 'pendente'
ORDER BY created_at DESC
LIMIT 5;
