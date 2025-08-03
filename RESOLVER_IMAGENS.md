# 🔧 Resolver Problema das Imagens

## ❌ Problema
As imagens não estão aparecendo na tabela `anuncios` do banco de dados.

## ✅ Solução Passo a Passo

### **Passo 1: Configure o Bucket**
Execute este SQL no **Supabase Dashboard > SQL Editor**:

```sql
-- Configurar bucket "anuncios"
INSERT INTO storage.buckets (id, name, public)
VALUES ('anuncios', 'anuncios', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para upload e visualização
CREATE POLICY "Usuários autenticados podem fazer upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'anuncios'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Imagens públicas para visualização" ON storage.objects
FOR SELECT USING (
  bucket_id = 'anuncios'
);
```

### **Passo 2: Verifique se Funcionou**
Execute este SQL para verificar:

```sql
-- Verificar bucket
SELECT * FROM storage.buckets WHERE id = 'anuncios';

-- Verificar anúncios com imagens
SELECT 
  id,
  name,
  image,
  CASE 
    WHEN image IS NULL OR image = '' THEN '❌ SEM IMAGEM'
    WHEN image LIKE 'https://%' THEN '✅ COM IMAGEM'
    ELSE '⚠️ URL INVÁLIDA'
  END as status
FROM anuncios 
ORDER BY created_at DESC 
LIMIT 5;
```

### **Passo 3: Teste o Upload**
1. **Cadastre um novo totem** com imagem
2. **Abra o console** (F12) para ver os logs
3. **Verifique se aparece**:
   - ✅ "🚀 Iniciando upload de imagem"
   - ✅ "✅ Upload bem-sucedido"
   - ✅ "✅ URL pública gerada"
   - ✅ "🔗 Usando URL da imagem: [URL]"

### **Passo 4: Verifique o Resultado**
Execute este SQL para ver se a imagem foi salva:

```sql
-- Verificar último anúncio cadastrado
SELECT 
  id,
  name,
  image,
  created_at
FROM anuncios 
ORDER BY created_at DESC 
LIMIT 1;
```

## 🔍 Se Ainda Não Funcionar

### **Verifique se está logado**
- O upload só funciona para usuários autenticados
- Certifique-se de estar logado no sistema

### **Teste com imagem pequena**
- Use uma imagem menor que 1MB
- Formatos: JPG, PNG

### **Verifique o bucket manualmente**
No Supabase Dashboard > Storage:
- Deve existir bucket "anuncios"
- Deve estar marcado como "public"

## 🚀 Resultado Esperado
- ✅ Upload funciona sem erro
- ✅ URL da imagem aparece no console
- ✅ Imagem é salva na tabela `anuncios`
- ✅ Imagem carrega na listagem

---
**Arquivos criados:**
- `verificar_bucket_anuncios.sql` - Configurar bucket
- `verificar_imagens_anuncios.sql` - Verificar imagens 