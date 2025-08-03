# 🔧 Solução Simples - Problema das Imagens

## ❌ Problema
Erro ao fazer upload da imagem: "Erro ao fazer upload da imagem. Verifique se o arquivo é válido."

## ✅ Solução Rápida

### **Passo 1: Configure o Bucket**
1. Acesse o **Supabase Dashboard**
2. Vá para **SQL Editor**
3. Execute este SQL:

```sql
-- Configuração simples do bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('anuncios', 'anuncios', true)
ON CONFLICT (id) DO NOTHING;

-- Política para upload
CREATE POLICY "Usuários autenticados podem fazer upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'anuncios'
  AND auth.role() = 'authenticated'
);

-- Política para visualização
CREATE POLICY "Imagens públicas para visualização" ON storage.objects
FOR SELECT USING (
  bucket_id = 'anuncios'
);
```

### **Passo 2: Teste o Upload**
1. Tente **cadastrar um novo totem** com imagem
2. Use uma imagem **menor que 5MB**
3. Formatos aceitos: **JPG, PNG, GIF, WebP**

### **Passo 3: Verifique os Logs**
Abra o console do navegador (F12) e verifique se aparece:
- ✅ "🚀 Iniciando upload de imagem"
- ✅ "✅ Upload bem-sucedido"
- ✅ "✅ URL pública gerada"

## 🔍 Se Ainda Não Funcionar

### **Verifique se está logado**
- Certifique-se de estar logado no sistema
- O upload só funciona para usuários autenticados

### **Teste com Imagem Menor**
- Use uma imagem de menos de 1MB
- Formatos: JPG, PNG

### **Verifique o Bucket**
No Supabase Dashboard > Storage:
- Deve existir um bucket chamado "anuncios"
- Deve estar marcado como "public"

## 🚀 Resultado Esperado
- ✅ Upload funciona sem erro
- ✅ Imagem aparece no totem cadastrado
- ✅ Imagem carrega na listagem

---
**Arquivo criado:** `setup_bucket_simple.sql` 