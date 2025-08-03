-- Verificar imagens na tabela anuncios
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- 1. Verificar os últimos anúncios cadastrados
SELECT 
  id,
  name,
  image,
  created_at,
  CASE 
    WHEN image IS NULL OR image = '' THEN '❌ SEM IMAGEM'
    WHEN image LIKE 'https://%' THEN '✅ COM IMAGEM'
    ELSE '⚠️ URL INVÁLIDA'
  END as status_imagem
FROM anuncios 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Verificar quantos anúncios têm imagem
SELECT 
  COUNT(*) as total_anuncios,
  COUNT(CASE WHEN image IS NOT NULL AND image != '' THEN 1 END) as com_imagem,
  COUNT(CASE WHEN image IS NULL OR image = '' THEN 1 END) as sem_imagem
FROM anuncios;

-- 3. Verificar URLs das imagens
SELECT 
  id,
  name,
  image,
  LENGTH(image) as tamanho_url
FROM anuncios 
WHERE image IS NOT NULL AND image != ''
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Verificar se há anúncios com URLs inválidas
SELECT 
  id,
  name,
  image
FROM anuncios 
WHERE image IS NOT NULL 
  AND image != '' 
  AND (image NOT LIKE 'https://%' OR image NOT LIKE '%supabase%')
ORDER BY created_at DESC; 