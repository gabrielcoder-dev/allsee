-- Policy para permitir exclusão de nichos customizados
-- Esta policy permite que usuários autenticados excluam nichos customizados

-- Habilitar RLS na tabela nichos_customizados (se ainda não estiver habilitado)
ALTER TABLE nichos_customizados ENABLE ROW LEVEL SECURITY;

-- Criar policy para DELETE
CREATE POLICY "Usuários autenticados podem excluir nichos customizados" ON nichos_customizados
FOR DELETE
TO authenticated
USING (true);

-- Alternativa: Se você quiser uma policy mais restritiva, pode usar:
-- CREATE POLICY "Usuários autenticados podem excluir nichos customizados" ON nichos_customizados
-- FOR DELETE
-- TO authenticated
-- USING (auth.uid() IS NOT NULL);

-- Para verificar se a policy foi criada corretamente:
-- SELECT * FROM pg_policies WHERE tablename = 'nichos_customizados'; 