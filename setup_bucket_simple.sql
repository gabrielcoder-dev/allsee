-- Configuração simples do bucket para anúncios
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- 1. Criar bucket se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('anuncios', 'anuncios', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Política para permitir upload (usuários autenticados)
CREATE POLICY "Usuários autenticados podem fazer upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'anuncios'
  AND auth.role() = 'authenticated'
);

-- 3. Política para permitir visualização pública
CREATE POLICY "Imagens públicas para visualização" ON storage.objects
FOR SELECT USING (
  bucket_id = 'anuncios'
);

-- 4. Verificar se foi criado
SELECT * FROM storage.buckets WHERE id = 'anuncios'; 