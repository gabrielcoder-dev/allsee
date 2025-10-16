-- ============================================
-- CONFIGURAÇÃO DO SUPABASE STORAGE
-- Sistema de Upload Direto para Arquivos Pesados
-- ============================================

-- 1. CRIAR BUCKET (Execute no Supabase Dashboard → Storage)
-- Ou use este SQL para criar programaticamente:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'arte-campanhas',
  'arte-campanhas',
  true,  -- Bucket público
  1073741824,  -- 1GB em bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- 2. POLÍTICAS DE ACESSO (RLS)

-- Permitir INSERT (upload) para usuários autenticados
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'arte-campanhas');

-- Permitir SELECT (leitura) para todos
CREATE POLICY "Acesso público para leitura"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'arte-campanhas');

-- Permitir DELETE para usuários autenticados (limpar chunks temporários)
CREATE POLICY "Usuários autenticados podem deletar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'arte-campanhas');

-- 3. VERIFICAR SE FOI CRIADO CORRETAMENTE

SELECT * FROM storage.buckets WHERE id = 'arte-campanhas';

-- 4. TESTAR POLÍTICAS

SELECT * FROM storage.policies WHERE bucket_id = 'arte-campanhas';

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 
-- 1. As tabelas arte_campanha e arte_troca_campanha JÁ EXISTEM
--    e NÃO PRECISAM ser alteradas!
-- 
-- 2. O campo caminho_imagem continua do tipo TEXT
--    Antes: armazenava base64 (ex: "data:image/jpeg;base64,/9j/4AAQ...")
--    Depois: armazena URL (ex: "https://xxx.supabase.co/storage/v1/object/public/arte-campanhas/123.jpg")
-- 
-- 3. O sistema é compatível com dados antigos em base64
--    (se ainda existirem registros antigos, eles continuam funcionando)
--
-- 4. Você pode deletar as tabelas temporárias de chunks se quiser:
--    - chunks_temp (antiga)
--    - chunks_temp_troca (antiga)
--    Mas não é obrigatório - o novo sistema não usa mais elas.

-- ============================================
-- OPCIONAL: LIMPAR TABELAS ANTIGAS DE CHUNKS
-- ============================================

-- Se quiser limpar as tabelas antigas de chunks (NÃO é obrigatório):
-- DROP TABLE IF EXISTS chunks_temp;
-- DROP TABLE IF EXISTS chunks_temp_troca;

-- ============================================
-- FIM DA CONFIGURAÇÃO
-- ============================================

