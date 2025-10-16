# Sistema de Upload Direto para Supabase Storage

## 📋 Visão Geral

Sistema implementado para fazer upload de arquivos pesados (imagens e vídeos) diretamente do browser para o **Supabase Storage**, sem passar pelo banco de dados. 

### ✅ Vantagens
- **Sem limite de 5MB da Vercel**: Envia chunks diretamente para o storage
- **Mais rápido**: Não precisa armazenar base64 gigante no banco
- **Mais eficiente**: Armazena apenas URL pública no banco
- **Streaming real**: Chunks são enviados em paralelo conforme disponíveis

## 🏗️ Arquitetura

### Fluxo de Upload

```
Browser → API Chunks → Supabase Storage → URL pública → Banco de dados
  |
  └─→ Divide em chunks de 4MB
      └─→ Envia 3 chunks em paralelo
          └─→ Monta arquivo no storage
              └─→ Salva apenas URL no banco
```

### Componentes Criados

#### 1. **API de Upload** (`/api/admin/upload-direto-storage.ts`)
- **Ação `init`**: Inicia upload e gera ID único
- **Ação `chunk`**: Recebe e armazena chunks temporários no storage
- **Ação `finalize`**: Monta arquivo final e gera URL pública
- **Ação `abort`**: Cancela upload e limpa chunks

#### 2. **Hook React** (`/hooks/useDirectStorageUpload.ts`)
- Divide arquivo em chunks de 4MB
- Envia 3 chunks em paralelo
- Monitora progresso em tempo real
- Suporte a retry automático
- Timeout configurável por chunk

#### 3. **Componentes Atualizados**
- ✅ `PagamantosPart.tsx` - Upload de arte da campanha
- ✅ `meus-anuncios/page.tsx` - Troca de arte

## 🚀 Configuração Necessária

### 1. Criar Bucket no Supabase

Acesse o Supabase Dashboard e crie o bucket:

```sql
-- No Storage do Supabase, criar bucket público:
-- Nome: arte-campanhas
-- Público: true
-- File size limit: 1GB
-- Allowed MIME types: image/*, video/*
```

**Ou via SQL:**

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('arte-campanhas', 'arte-campanhas', true);
```

### 2. Configurar Políticas de Acesso (RLS)

```sql
-- Permitir INSERT para usuários autenticados
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'arte-campanhas');

-- Permitir SELECT público
CREATE POLICY "Acesso público para leitura"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'arte-campanhas');

-- Permitir DELETE para usuários autenticados (limpar chunks)
CREATE POLICY "Usuários autenticados podem deletar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'arte-campanhas');
```

### 3. Variáveis de Ambiente

Certifique-se de ter:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_key_aqui  # Opcional, para permissões admin
```

## 💻 Como Usar

### No Frontend

```typescript
import { useDirectStorageUpload } from '@/hooks/useDirectStorageUpload';

const { uploadFile, progress, isUploading, error } = useDirectStorageUpload({
  chunkSizeMB: 4,         // Tamanho de cada chunk
  parallelUploads: 3,      // Chunks enviados em paralelo
  chunkTimeout: 10000,     // Timeout por chunk (10s)
  maxRetries: 3,           // Tentativas por chunk
  onProgress: (progress) => {
    console.log(`Progresso: ${progress.percentage}%`);
  }
});

// Fazer upload
const handleUpload = async (file: File) => {
  const result = await uploadFile(file, 'arte-campanhas');
  
  if (result) {
    console.log('URL pública:', result.public_url);
    // Salvar URL no banco ao invés de base64
  }
};
```

### Exemplo Completo

```typescript
const Component = () => {
  const { uploadFile, progress, isUploading, error } = useDirectStorageUpload();
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async () => {
    if (!file) return;

    // Upload para storage
    const result = await uploadFile(file, 'arte-campanhas');
    
    if (!result) {
      console.error('Erro:', error);
      return;
    }

    // Salvar apenas URL no banco
    await fetch('/api/admin/criar-arte-campanha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_order: orderId,
        caminho_imagem: result.public_url,  // URL ao invés de base64
        id_user: userId
      })
    });
  };

  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => setFile(e.target.files?.[0] || null)} 
      />
      
      {isUploading && (
        <div>
          <p>Progresso: {progress.percentage}%</p>
          <p>Chunks: {progress.chunksUploaded}/{progress.totalChunks}</p>
        </div>
      )}
      
      <button onClick={handleSubmit} disabled={isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar'}
      </button>
    </div>
  );
};
```

## 📊 Monitoramento

O sistema fornece logs detalhados no console:

```
🚀 Iniciando upload direto: { fileName, fileSize, fileType, bucket }
📦 Arquivo dividido em X chunks
✅ Upload iniciado: { upload_id, file_path }
📤 Enviando chunk 1/10 (10%)...
✅ Chunk 1/10 enviado com sucesso
🔧 Finalizando upload...
✅ Upload finalizado: { public_url, file_size_mb }
```

## 🔧 Configurações Avançadas

### Ajustar Performance

```typescript
const { uploadFile } = useDirectStorageUpload({
  chunkSizeMB: 8,          // Chunks maiores = menos requisições
  parallelUploads: 5,      // Mais paralelo = mais rápido (mas mais memória)
  chunkTimeout: 15000,     // Timeout maior para conexões lentas
  maxRetries: 5            // Mais tentativas = mais resiliente
});
```

### Cancelar Upload

```typescript
const { uploadFile, abortUpload, isUploading } = useDirectStorageUpload();

// Cancelar durante upload
if (isUploading) {
  await abortUpload();
}
```

## ⚠️ Limites e Considerações

1. **Tamanho máximo**: 1GB por arquivo (configurável no bucket)
2. **Tipos permitidos**: Imagens (jpg, png, gif, webp) e Vídeos (mp4, mov, avi, webm)
3. **Chunks temporários**: São automaticamente limpos após finalização
4. **Conexão instável**: Sistema possui retry automático

## 🗄️ Estrutura do Storage

```
arte-campanhas/
├── temp/                    # Chunks temporários (automaticamente limpos)
│   ├── 1234567890.jpg.chunk.0
│   ├── 1234567890.jpg.chunk.1
│   └── ...
└── 1234567890.jpg          # Arquivo final
```

## 🔄 Migração do Sistema Antigo

### Antes (Base64 no Banco)
```typescript
// ❌ Armazenava base64 gigante no banco
caminho_imagem: "data:image/jpeg;base64,/9j/4AAQSkZJRg..." // 50MB+
```

### Depois (URL Pública)
```typescript
// ✅ Armazena apenas URL pública
caminho_imagem: "https://xxx.supabase.co/storage/v1/object/public/arte-campanhas/123.jpg"
```

### Benefícios da Migração
- 📉 Tamanho do banco reduzido em ~95%
- ⚡ Queries mais rápidas
- 💰 Menor custo de armazenamento
- 🚀 Loading de páginas mais rápido
- 🔒 Melhor controle de acesso via bucket policies

## 🐛 Troubleshooting

### Erro: "Upload não encontrado"
- **Causa**: Upload foi cancelado ou expirou
- **Solução**: Reiniciar o upload

### Erro: "Chunks faltando"
- **Causa**: Conexão instável durante upload
- **Solução**: Sistema retenta automaticamente

### Erro: "Bucket não existe"
- **Causa**: Bucket 'arte-campanhas' não foi criado
- **Solução**: Criar bucket no Supabase Dashboard

### Upload muito lento
- **Causa**: Conexão lenta ou chunks muito pequenos
- **Solução**: Aumentar `chunkSizeMB` e `parallelUploads`

## 📝 TODO para Produção

- [ ] Configurar CDN (Cloudflare) na frente do Supabase Storage
- [ ] Implementar job de limpeza de chunks órfãos (>24h)
- [ ] Adicionar compressão de imagens antes do upload
- [ ] Implementar thumbnails automáticos
- [ ] Configurar lifecycle rules para arquivos antigos

## 📚 Referências

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Resumable Uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
- [Storage RLS Policies](https://supabase.com/docs/guides/storage/security/access-control)

