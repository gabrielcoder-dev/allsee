-- Script para adicionar a coluna nicho na tabela anuncios
-- Execute este script no SQL Editor do Supabase

-- Adicionar a coluna nicho na tabela anuncios
ALTER TABLE public.anuncios 
ADD COLUMN IF NOT EXISTS nicho TEXT CHECK (nicho IN ('restaurante', 'academia', 'comercio', 'outro'));

-- Verificar se a coluna foi adicionada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'anuncios' AND column_name = 'nicho';