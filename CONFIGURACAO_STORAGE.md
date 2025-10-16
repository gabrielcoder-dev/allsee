# ⚙️ Configuração do Supabase Storage

## 📋 Passo a Passo

### 1️⃣ Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto: **allsee**
3. No menu lateral, clique em **Storage**

### 2️⃣ Criar o Bucket

**Via Interface (Recomendado):**

1. Clique em **"Create a new bucket"**
2. Preencha:
   ```
   Name: arte-campanhas
   Public bucket: ✅ (marcar checkbox)
   File size limit: 1024 MB (1GB)
   Allowed MIME types: 
     - image/jpeg
     - image/jpg  
     - image/png
     - image/gif
     - image/webp
     - video/mp4
     - video/mov
     - video/avi
     - video/webm
   ```
3. Clique em **"Create bucket"**

**Via SQL (Alternativa):**

Se preferir, execute o arquivo `database/setup_storage.sql` no SQL Editor do Supabase.

### 3️⃣ Configurar Políticas de Acesso

1. No Storage, clique no bucket **arte-campanhas**
2. Vá na aba **"Policies"**
3. Clique em **"New Policy"**

**Política 1: Permitir Upload (Usuários Autenticados)**
```
Policy name: Usuários autenticados podem fazer upload
Allowed operation: INSERT
Target roles: authenticated
WITH CHECK expression: bucket_id = 'arte-campanhas'
```

**Política 2: Permitir Leitura (Público)**
```
Policy name: Acesso público para leitura
Allowed operation: SELECT
Target roles: public
USING expression: bucket_id = 'arte-campanhas'
```

**Política 3: Permitir Deleção (Usuários Autenticados)**
```
Policy name: Usuários autenticados podem deletar
Allowed operation: DELETE
Target roles: authenticated
USING expression: bucket_id = 'arte-campanhas'
```

**Ou execute via SQL:**

```sql
-- Copie e cole no SQL Editor do Supabase

CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'arte-campanhas');

CREATE POLICY "Acesso público para leitura"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'arte-campanhas');

CREATE POLICY "Usuários autenticados podem deletar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'arte-campanhas');
```

### 4️⃣ Verificar Configuração

Execute no SQL Editor:

```sql
-- Verificar bucket
SELECT * FROM storage.buckets WHERE id = 'arte-campanhas';

-- Verificar políticas
SELECT * FROM storage.policies WHERE bucket_id = 'arte-campanhas';
```

Deve retornar:
- ✅ 1 bucket com nome "arte-campanhas"
- ✅ 3 políticas configuradas

## ✅ Pronto!

Agora você pode testar o upload:

1. Acesse a página de pagamento
2. Selecione uma imagem **maior que 5MB**
3. Complete o formulário e envie
4. Observe o console do browser - verá o progresso em tempo real!

## 🔍 Como Verificar se Está Funcionando

### No Console do Browser:
```
🚀 Iniciando upload direto para storage...
📦 Arquivo dividido em 3 chunks
✅ Upload iniciado: { upload_id: "123-abc", file_path: "temp/123.jpg" }
📤 Enviando chunk 1/3 (33%)...
✅ Chunk 1/3 enviado com sucesso
📤 Enviando chunk 2/3 (66%)...
✅ Chunk 2/3 enviado com sucesso
📤 Enviando chunk 3/3 (100%)...
✅ Chunk 3/3 enviado com sucesso
🔧 Finalizando upload...
✅ Upload finalizado: { public_url: "https://..." }
```

### No Supabase Storage:
1. Acesse Storage → arte-campanhas
2. Você verá os arquivos enviados
3. URLs públicas estarão acessíveis

### No Banco de Dados:
```sql
SELECT id, caminho_imagem FROM arte_campanha ORDER BY id DESC LIMIT 1;
```

Deve retornar uma **URL** ao invés de base64:
```
caminho_imagem: https://xxx.supabase.co/storage/v1/object/public/arte-campanhas/1234567890.jpg
```

## ❓ Problemas Comuns

### Erro: "Bucket not found"
**Solução:** Criar o bucket conforme passo 2

### Erro: "Permission denied"
**Solução:** Configurar políticas de acesso conforme passo 3

### Erro: "File too large"
**Solução:** Aumentar limite do bucket para 1GB (1024MB)

### Upload não inicia
**Solução:** Verificar se `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão configurados

## 📊 Comparação: Antes vs Depois

### Antes (Base64 no Banco)
```sql
caminho_imagem: data:image/jpeg;base64,/9j/4AAQSkZJRg... (50MB no banco!)
```

### Depois (URL Pública)
```sql
caminho_imagem: https://xxx.supabase.co/storage/v1/object/public/arte-campanhas/123.jpg
```

**Economia:** ~99% menos espaço no banco! 🎉

## 🗑️ Limpeza Opcional

Se quiser remover as tabelas antigas de chunks (não é obrigatório):

```sql
-- OPCIONAL - apenas se tiver certeza que não precisa mais
DROP TABLE IF EXISTS chunks_temp;
DROP TABLE IF EXISTS chunks_temp_troca;
```

## 📝 Próximos Passos

Após configurar, você pode:

1. ✅ Testar upload de imagens grandes
2. ✅ Testar troca de arte nos anúncios
3. ✅ Monitorar uso do storage no dashboard
4. ✅ (Opcional) Configurar CDN para melhor performance

## 🆘 Precisa de Ajuda?

Confira a documentação completa em `UPLOAD_DIRETO_STORAGE.md`

