-- Verificar as URLs das imagens dos últimos anúncios cadastrados
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- 1. Verificar os últimos 10 anúncios cadastrados
SELECT 
  id,
  name,
  image,
  created_at,
  CASE 
    WHEN image IS NULL OR image = '' THEN '❌ SEM IMAGEM'
    WHEN image LIKE 'https://%' THEN '✅ URL VÁLIDA'
    ELSE '⚠️ URL INVÁLIDA'
  END as status_imagem,
  LENGTH(image) as tamanho_url
FROM anuncios 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Verificar se há anúncios sem imagem
SELECT 
  COUNT(*) as total_anuncios,
  COUNT(CASE WHEN image IS NULL OR image = '' THEN 1 END) as sem_imagem,
  COUNT(CASE WHEN image IS NOT NULL AND image != '' THEN 1 END) as com_imagem
FROM anuncios;

-- 3. Verificar URLs que podem estar com problema
SELECT 
  id,
  name,
  image,
  created_at
FROM anuncios 
WHERE image IS NOT NULL 
  AND image != '' 
  AND (image NOT LIKE 'https://%' OR image NOT LIKE '%supabase%')
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Verificar se o bucket existe
SELECT * FROM storage.buckets WHERE id = 'anuncios';

-- 5. Verificar políticas do bucket
SELECT * FROM storage.policies WHERE bucket_id = 'anuncios'; 