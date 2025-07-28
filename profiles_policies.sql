-- Políticas RLS para a tabela profiles
-- Execute este script no SQL Editor do Supabase APÓS criar a tabela profiles

-- 1. Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Política para SELECT - usuário pode ver apenas seu próprio profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- 3. Política para INSERT - usuário pode inserir apenas seu próprio profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Política para UPDATE - usuário pode atualizar apenas seu próprio profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 5. Política para DELETE - usuário pode deletar apenas seu próprio profile
CREATE POLICY "Users can delete own profile" ON public.profiles
    FOR DELETE USING (auth.uid() = id);

-- Verificar se as políticas foram criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles'; 