-- Verificar problemas de tamanho nas imagens existentes
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- 1. Verificar anúncios com URLs de imagem
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
WHERE image IS NOT NULL AND image != ''
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Verificar se há URLs muito longas (pode indicar problema)
SELECT 
  id,
  name,
  image,
  LENGTH(image) as tamanho_url,
  CASE 
    WHEN LENGTH(image) > 500 THEN '⚠️ URL MUITO LONGA'
    WHEN LENGTH(image) > 200 THEN '✅ URL NORMAL'
    ELSE '❌ URL MUITO CURTA'
  END as status_tamanho
FROM anuncios 
WHERE image IS NOT NULL AND image != ''
ORDER BY LENGTH(image) DESC 
LIMIT 10;

-- 3. Verificar URLs que podem estar corrompidas
SELECT 
  id,
  name,
  image,
  created_at
FROM anuncios 
WHERE image IS NOT NULL 
  AND image != '' 
  AND (
    image NOT LIKE 'https://%' 
    OR image NOT LIKE '%supabase%'
    OR image LIKE '%undefined%'
    OR image LIKE '%null%'
    OR image LIKE '%error%'
  )
ORDER BY created_at DESC;

-- 4. Verificar anúncios recentes sem imagem
SELECT 
  id,
  name,
  image,
  created_at
FROM anuncios 
WHERE (image IS NULL OR image = '')
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 5. Contar anúncios por status de imagem
SELECT 
  CASE 
    WHEN image IS NULL OR image = '' THEN 'Sem imagem'
    WHEN image LIKE 'https://%' THEN 'Com URL válida'
    ELSE 'Com URL inválida'
  END as status,
  COUNT(*) as quantidade
FROM anuncios 
GROUP BY 
  CASE 
    WHEN image IS NULL OR image = '' THEN 'Sem imagem'
    WHEN image LIKE 'https://%' THEN 'Com URL válida'
    ELSE 'Com URL inválida'
  END;

-- 6. Verificar se há anúncios duplicados com a mesma imagem
SELECT 
  image,
  COUNT(*) as quantidade,
  STRING_AGG(name, ', ') as nomes
FROM anuncios 
WHERE image IS NOT NULL AND image != ''
GROUP BY image
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC; 