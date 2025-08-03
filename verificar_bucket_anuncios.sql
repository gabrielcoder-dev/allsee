-- Verificar e configurar o bucket "anuncios"
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- 1. Verificar se o bucket existe
SELECT * FROM storage.buckets WHERE id = 'anuncios';

-- 2. Se não existir, criar o bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('anuncios', 'anuncios', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Imagens públicas para visualização" ON storage.objects;
DROP POLICY IF EXISTS "Proprietário pode atualizar" ON storage.objects;
DROP POLICY IF EXISTS "Proprietário pode deletar" ON storage.objects;

-- 4. Criar políticas corretas
CREATE POLICY "Usuários autenticados podem fazer upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'anuncios'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Imagens públicas para visualização" ON storage.objects
FOR SELECT USING (
  bucket_id = 'anuncios'
);

CREATE POLICY "Proprietário pode atualizar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'anuncios'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Proprietário pode deletar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'anuncios'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Verificar se foi criado corretamente
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets 
WHERE id = 'anuncios';

-- 6. Verificar políticas criadas
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'; 