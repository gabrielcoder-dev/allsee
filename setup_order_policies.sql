-- Configuração de políticas RLS para a tabela 'order'
-- Execute este script no SQL Editor do Supabase

-- Habilitar RLS na tabela order (se ainda não estiver habilitado)
ALTER TABLE "order" ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas seus próprios orders
CREATE POLICY "Users can view own orders" ON "order"
    FOR SELECT USING (auth.uid()::text = id_user);

-- Política para permitir que usuários insiram seus próprios orders
CREATE POLICY "Users can insert own orders" ON "order"
    FOR INSERT WITH CHECK (auth.uid()::text = id_user);

-- Política para permitir que usuários atualizem seus próprios orders
CREATE POLICY "Users can update own orders" ON "order"
    FOR UPDATE USING (auth.uid()::text = id_user);

-- Política para permitir que o webhook atualize orders (usando service role)
-- Esta política permite que o service role atualize qualquer order
CREATE POLICY "Service role can update orders" ON "order"
    FOR UPDATE USING (auth.role() = 'service_role');

-- Política para permitir que admins vejam todos os orders
CREATE POLICY "Admins can view all orders" ON "order"
    FOR SELECT USING (auth.role() = 'service_role');

-- Verificar se a coluna status existe, se não, criar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order' AND column_name = 'status'
    ) THEN
        ALTER TABLE "order" ADD COLUMN status TEXT DEFAULT 'pendente';
    END IF;
END $$;

-- Criar índice para melhor performance nas consultas por status
CREATE INDEX IF NOT EXISTS idx_order_status ON "order"(status);
CREATE INDEX IF NOT EXISTS idx_order_user_status ON "order"(id_user, status);

-- Verificar estrutura da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'order' 
ORDER BY ordinal_position;
