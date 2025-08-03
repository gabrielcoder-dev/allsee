-- Corrigir URLs de imagens que podem estar com problema
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- 1. Verificar anúncios com URLs inválidas
SELECT 
  id,
  name,
  image,
  created_at
FROM anuncios 
WHERE image IS NOT NULL 
  AND image != '' 
  AND (image NOT LIKE 'https://%' OR image NOT LIKE '%supabase%')
ORDER BY created_at DESC;

-- 2. Atualizar URLs que podem estar com problema
-- (Execute apenas se necessário)
UPDATE anuncios 
SET image = NULL 
WHERE image IS NOT NULL 
  AND image != '' 
  AND (image NOT LIKE 'https://%' OR image NOT LIKE '%supabase%');

-- 3. Verificar anúncios sem imagem após correção
SELECT 
  id,
  name,
  image,
  created_at
FROM anuncios 
WHERE image IS NULL OR image = ''
ORDER BY created_at DESC;

-- 4. Verificar se há anúncios com URLs duplicadas ou inválidas
SELECT 
  image,
  COUNT(*) as quantidade
FROM anuncios 
WHERE image IS NOT NULL AND image != ''
GROUP BY image
HAVING COUNT(*) > 1;

-- 5. Limpar URLs vazias ou inválidas
UPDATE anuncios 
SET image = NULL 
WHERE image = '' OR image IS NULL;

-- 6. Verificar estrutura da tabela
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'anuncios' 
  AND column_name = 'image'; 