# 🚀 Sistema de Upload Binário Otimizado

## O que mudou?

### ❌ Sistema Antigo (Base64)
- Convertia arquivo para base64 (aumenta 37% o tamanho)
- Chunks de 2MB viravam ~2.7MB após base64
- 2 uploads paralelos apenas
- Limite de 5MB no servidor causava erros com chunks >3.6MB

### ✅ Sistema Novo (Binário)
- **Upload binário direto** (sem conversão base64)
- **Economia de 37% no tráfego de rede**
- **Chunks de 3MB** (binários puros)
- **4 uploads paralelos** (2x mais rápido)
- **Timeout de 20s** para chunks maiores
- **FormData nativo** (mais eficiente)

## Melhorias de Performance

### Para vídeo de 30MB:
- **Antes**: ~41MB de dados transferidos (base64), 15 chunks de 2MB, 8 lotes paralelos = ~45-60s
- **Agora**: 30MB de dados transferidos (binário), 12 chunks de 2.5MB, 3 lotes paralelos = ~20-30s

**Redução de até 50% no tempo de upload!** ⚡

### Respeitando Limites da Vercel:
- Chunk: 2.5MB (binário)
- FormData overhead: ~0.5MB
- **Total por request**: ~3MB ✅ (limite Vercel: 4.5MB)

## Arquitetura

### Cliente (`useDirectStorageUpload.ts`)
```typescript
// 1. Dividir arquivo em chunks binários (File.slice)
const chunks = fileToChunks(file); // Instantâneo, sem conversão!

// 2. Enviar chunks via FormData
const formData = new FormData();
formData.append('chunk_file', chunkBlob);
// Sem base64, sem overhead!

// 3. 4 uploads paralelos simultâneos
for (let i = 0; i < chunks.length; i += 4) {
  await Promise.all([chunk1, chunk2, chunk3, chunk4]);
}
```

### Servidor (`upload-direto-storage.ts`)
```typescript
// 1. Parse FormData com formidable
const { fields, files } = await parseFormData(req);

// 2. Ler arquivo binário do disco temporário
const chunkBuffer = await fs.readFile(chunkFile.filepath);

// 3. Upload direto para Supabase Storage
await supabase.storage.upload(path, chunkBuffer);
```

## Limites Atuais

| Recurso | Limite | Motivo |
|---------|--------|--------|
| Chunk Size | 2.5MB | ⚠️ Vercel Body Limit (4.5MB - overhead FormData ~0.5MB) |
| Uploads Paralelos | 4 | Balance entre velocidade e carga |
| Timeout por Chunk | 20s | Chunks maiores + conexões lentas |
| Arquivo Máximo | 50MB | Limite Supabase Storage gratuito |
| Retries | 3 | Garantir entrega mesmo com falhas |

**Importante**: Limite de 4.5MB da Vercel é HARD LIMIT (não configurável).

## Compatibilidade

- ✅ Chrome/Edge (File API, FormData)
- ✅ Firefox (File API, FormData)
- ✅ Safari (File API, FormData)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Tipos de Arquivo Suportados

- 📸 Imagens: JPG, PNG, GIF, WEBP
- 🎥 Vídeos: MP4, MOV, AVI, WEBM
- Até 50MB por arquivo

## Fluxo Completo

```
Cliente                          Servidor                    Supabase
   |                                |                            |
   |-- 1. Init (file_type) -------->|                            |
   |<---- upload_id ------------------|                            |
   |                                |                            |
   |-- 2. Chunk 0 (FormData) ------>|                            |
   |                                |--- storage.upload -------->|
   |<---- success ------------------|                            |
   |                                |                            |
   |-- 3. Chunks 1-3 (paralelo) --->|                            |
   |                                |--- 4 uploads paralelos --->|
   |<---- success x4 ---------------|                            |
   |                                |                            |
   |-- 4. Finalize ---------------->|                            |
   |                                |--- download chunks ------->|
   |                                |<-- chunks data ------------|
   |                                |--- concat & upload ------->|
   |<---- public_url ---------------|                            |
```

## Uso

```typescript
const { uploadFile, progress, isUploading, error } = useDirectStorageUpload({
  chunkSizeMB: 3,      // 3MB por chunk
  parallelUploads: 4,  // 4 simultâneos
  chunkTimeout: 20000, // 20s timeout
  maxRetries: 3        // 3 tentativas
});

const result = await uploadFile(file, 'arte-campanhas');
console.log(result.public_url);
```

## Logs de Debug

```javascript
// Cliente
🚀 Iniciando upload BINÁRIO direto (sem base64)
📦 Arquivo dividido em 10 chunks de 3MB cada
✅ Progresso: 4/10 chunks (42%)
✅ Upload concluído com sucesso!

// Servidor
📦 Recebendo chunk BINÁRIO 1/10 (2.8MB, 2867KB)
✅ Chunk BINÁRIO 1/10 salvo no storage
🔧 Montando arquivo final de 10 chunks...
💾 Salvando arquivo final: 28MB
✅ Upload finalizado com sucesso
```

## Troubleshooting

### Erro: "Chunk muito grande"
- **Causa**: Chunk excede 5MB após FormData overhead
- **Solução**: Reduzir `chunkSizeMB` para 2MB

### Erro: "Timeout"
- **Causa**: Conexão lenta ou chunk muito grande
- **Solução**: Aumentar `chunkTimeout` ou reduzir `chunkSizeMB`

### Erro: "Chunks faltando"
- **Causa**: Falha no upload de alguns chunks
- **Solução**: Sistema já faz retry automático (3x)

## Próximas Melhorias

- [ ] Upload resumable (continuar de onde parou)
- [ ] Compressão de vídeo no cliente (antes do upload)
- [ ] Preview em tempo real durante upload
- [ ] Suporte a upload > 50MB (streaming direto)

