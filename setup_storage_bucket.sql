-- Configuração do bucket de storage para anúncios
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- 1. Criar bucket se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('anuncios', 'anuncios', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Política para permitir upload de imagens (apenas usuários autenticados)
CREATE POLICY "Usuários autenticados podem fazer upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'anuncios' 
  AND auth.role() = 'authenticated'
);

-- 3. Política para permitir visualização pública das imagens
CREATE POLICY "Imagens públicas para visualização" ON storage.objects
FOR SELECT USING (
  bucket_id = 'anuncios'
);

-- 4. Política para permitir atualização (apenas o proprietário)
CREATE POLICY "Proprietário pode atualizar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'anuncios' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Política para permitir exclusão (apenas o proprietário)
CREATE POLICY "Proprietário pode deletar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'anuncios' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 6. Verificar se o bucket foi criado
SELECT * FROM storage.buckets WHERE id = 'anuncios';

-- 7. Verificar políticas criadas
SELECT * FROM storage.policies WHERE bucket_id = 'anuncios'; 