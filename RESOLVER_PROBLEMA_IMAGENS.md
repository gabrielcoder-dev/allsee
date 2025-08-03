# 🔧 Resolver Problema das Imagens

## ❌ Problema Identificado

As imagens não estão aparecendo nos anúncios. Isso pode ser causado por:

1. **Bucket de storage não configurado**
2. **Políticas de segurança incorretas**
3. **URLs inválidas**
4. **Problemas de CORS**

## ✅ Soluções

### 1. Configurar o Bucket de Storage

Execute o seguinte SQL no **Supabase Dashboard > SQL Editor**:

```sql
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
```

### 2. Verificar Configuração Manual

1. **Acesse o Supabase Dashboard**
2. **Vá para Storage > Buckets**
3. **Verifique se existe um bucket chamado "anuncios"**
4. **Se não existir, crie-o:**
   - Nome: `anuncios`
   - Público: ✅ Sim
   - Política RLS: ✅ Sim

### 3. Verificar Políticas de Segurança

1. **Vá para Storage > Policies**
2. **Verifique se existem as políticas:**
   - "Usuários autenticados podem fazer upload"
   - "Imagens públicas para visualização"
   - "Proprietário pode atualizar"
   - "Proprietário pode deletar"

### 4. Testar Upload

1. **Abra o console do navegador (F12)**
2. **Tente cadastrar um novo totem com imagem**
3. **Verifique os logs no console:**
   - ✅ "🚀 Iniciando upload de imagem"
   - ✅ "📦 Buckets encontrados"
   - ✅ "✅ Bucket 'anuncios' encontrado"
   - ✅ "✅ Upload bem-sucedido"
   - ✅ "✅ URL pública gerada"

### 5. Verificar URLs

1. **Copie uma URL de imagem do banco de dados**
2. **Cole no navegador**
3. **Verifique se a imagem carrega**

### 6. Debug no Console

Os logs agora mostram:
- 🚀 Início do upload
- 🔍 Verificação de buckets
- 📦 Buckets disponíveis
- ✅/❌ Status de cada etapa
- 🌐 Teste de acesso à URL

## 🔍 Verificações Adicionais

### Se o problema persistir:

1. **Verifique as variáveis de ambiente:**
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

2. **Teste a conexão com Supabase:**
   ```javascript
   const { data, error } = await supabase.storage.listBuckets();
   console.log('Buckets:', data);
   console.log('Erro:', error);
   ```

3. **Verifique se o usuário está autenticado:**
   ```javascript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('Usuário:', user);
   ```

## 📞 Suporte

Se o problema persistir após seguir estas instruções:

1. **Verifique os logs no console do navegador**
2. **Teste o upload de uma imagem pequena (< 1MB)**
3. **Verifique se o arquivo é uma imagem válida (JPG, PNG, etc.)**
4. **Confirme que o bucket "anuncios" existe e é público**

---

**Arquivos modificados:**
- `src/Components/ModalCreateAnuncios.tsx` - Melhorado upload com logs detalhados
- `src/Components/MiniAnuncioCard.tsx` - Melhorado tratamento de erro de imagem
- `src/Components/GetAnunciosAdmin.tsx` - Melhorado tratamento de erro de imagem
- `setup_storage_bucket.sql` - SQL para configurar o bucket 