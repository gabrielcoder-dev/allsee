# ⚠️ Limites da Vercel - Upload System

## 🚨 Limite de Body Size

### Vercel Hobby Plan
- **Body size limit**: 4.5MB
- **Função serverless timeout**: 10 segundos

### Vercel Pro Plan
- **Body size limit**: 4.5MB (padrão, configurável)
- **Função serverless timeout**: 60 segundos

## 📦 Cálculo de Chunk Size

### Overhead do FormData
Quando enviamos um arquivo via FormData, há overhead adicional:
- **Boundaries**: ~200-300 bytes
- **Headers**: ~150-200 bytes por campo
- **Content-Disposition**: ~100 bytes
- **Total overhead**: ~500-1000 bytes por requisição

### Cálculo Seguro

```
Limite Vercel: 4.5MB
- Overhead FormData: ~0.5MB
- Margem de segurança: ~0.5MB
= Chunk máximo: 3.5MB
```

**Configuração atual**: 2.5MB por chunk
- Arquivo: 2.5MB
- FormData overhead: ~0.5MB
- **Total enviado**: ~3MB ✅ SEGURO

## 🎯 Limites Configurados

### Cliente (`useDirectStorageUpload.ts`)
```typescript
chunkSizeMB = 2.5 // 2.5MB por chunk
```

### Servidor (`upload-direto-storage.ts`)
```typescript
maxFileSize: 4 * 1024 * 1024 // 4MB máximo
```

### Validação no servidor
```typescript
if (chunkSizeMB > 4) {
  // Rejeitar chunk muito grande
}
```

## 📊 Performance com Chunks de 2.5MB

| Arquivo | Chunks | Lotes (4 paralelos) | Tempo Estimado |
|---------|--------|---------------------|----------------|
| 10MB | 4 | 1 | ~5-8s |
| 20MB | 8 | 2 | ~10-15s |
| 30MB | 12 | 3 | ~15-22s |
| 50MB | 20 | 5 | ~25-40s |

## ⚡ Otimizações Aplicadas

1. **Upload Binário** (sem base64)
   - Economia de 37% no tráfego
   - Chunk de 2.5MB = 2.5MB enviado (não 3.4MB!)

2. **4 Uploads Paralelos**
   - Reduz tempo total pela metade
   - Balance entre velocidade e carga do servidor

3. **Timeout Adaptativo**
   - 20s por chunk (suficiente até para 3G)
   - Retry automático (3 tentativas)

4. **Validação Rigorosa**
   - Cliente: limite de 2.5MB por chunk
   - Servidor: limite de 4MB (com margem)
   - Formidable: limite de 4MB (rejeita antes de processar)

## 🔧 Configuração da Vercel

Se você tiver Vercel Pro, pode aumentar o limite em `vercel.json`:

```json
{
  "functions": {
    "api/admin/upload-direto-storage.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

**Nota**: O limite de body size NÃO é configurável via `vercel.json`. É um hard limit de 4.5MB.

## 🐛 Erros Comuns

### "413 Payload Too Large"
- **Causa**: Chunk + FormData overhead > 4.5MB
- **Solução**: Reduzir `chunkSizeMB` para 2MB ou menos

### "504 Gateway Timeout"
- **Causa**: Upload de chunk demorou > 10s (Hobby) ou > 60s (Pro)
- **Solução**: Chunks menores ou upgrade para Pro

### "Error: maxFileSize exceeded"
- **Causa**: Arquivo excede limite do formidable (4MB)
- **Solução**: Já está correto, é proteção adicional

## 📝 Recomendações

### Para Hobby Plan (gratuito)
```typescript
chunkSizeMB: 2.5,    // Seguro para 4.5MB limit
parallelUploads: 4,  // 4 simultâneos
chunkTimeout: 15000  // 15s (hobby tem 10s limite, mas chunks são rápidos)
```

### Para Pro Plan
```typescript
chunkSizeMB: 3,      // Pode aumentar um pouco
parallelUploads: 6,  // Mais paralelos
chunkTimeout: 30000  // 30s (mais margem)
```

## ✅ Sistema Atual: OTIMIZADO

Nossa configuração atual de **2.5MB por chunk** é:
- ✅ Segura para Vercel Hobby
- ✅ Rápida (4 paralelos)
- ✅ Confiável (retry automático)
- ✅ Eficiente (binário, sem base64)

**Resultado**: Vídeos de até 50MB em ~30-40 segundos! 🚀

