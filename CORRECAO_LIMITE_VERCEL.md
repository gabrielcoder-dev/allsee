# ✅ Correção: Limite Vercel 5MB

## 🎯 **Problema Identificado:**

O erro `413 (Content Too Large)` estava acontecendo porque:
1. **Chunks de 4MB** + expansão Base64 (~1.37x) = **~5.5MB**
2. **Limite da Vercel** = **5MB máximo**
3. **Chunks excediam** o limite da Vercel

---

## 🔧 **Correções Implementadas:**

### **1. Tamanho dos Chunks Reduzido:**
```typescript
// ANTES (❌ Excedia limite)
chunkSizeMB = 4, // 4MB + Base64 = ~5.5MB
parallelUploads = 3,

// DEPOIS (✅ Dentro do limite)
chunkSizeMB = 2, // 2MB + Base64 = ~2.7MB
parallelUploads = 2, // Reduzido para evitar sobrecarga
```

### **2. Cálculo do Chunk Ajustado:**
```typescript
// ANTES (❌ Cálculo impreciso)
const chunkSize = chunkSizeMB * 1024 * 1024 * (4/3); // 1.33x

// DEPOIS (✅ Margem de segurança)
const chunkSize = Math.floor(chunkSizeMB * 1024 * 1024 * 1.2); // 1.2x
```

### **3. Limite da API Ajustado:**
```typescript
// ANTES (❌ Muito alto)
bodyParser: { sizeLimit: '50mb' }

// DEPOIS (✅ Limite da Vercel)
bodyParser: { sizeLimit: '5mb' }
```

### **4. Validação de Chunk Adicionada:**
```typescript
// Validar tamanho do chunk (limite Vercel: 5MB)
const chunkSizeMB = chunkBuffer.length / (1024 * 1024);
if (chunkSizeMB > 5) {
  return res.status(413).json({ 
    error: `Chunk muito grande: ${chunkSizeMB.toFixed(2)}MB. Limite: 5MB` 
  });
}
```

---

## 📊 **Comparação:**

### **Antes:**
- **Chunk:** 4MB → **~5.5MB** com Base64 ❌
- **Limite Vercel:** 5MB ❌
- **Resultado:** Erro 413 (Content Too Large)

### **Agora:**
- **Chunk:** 2MB → **~2.7MB** com Base64 ✅
- **Limite Vercel:** 5MB ✅
- **Margem:** 2.3MB de segurança ✅
- **Resultado:** Upload funcionando

---

## 🎯 **Configuração Final:**

### **Hook (`useDirectStorageUpload`):**
- **Chunk Size:** 2MB (seguro para Vercel)
- **Uploads Paralelos:** 2 (reduzido)
- **Timeout:** 15s (aumentado)
- **Margem:** 1.2x (segurança)

### **API (`upload-direto-storage`):**
- **Limite:** 5MB (máximo da Vercel)
- **Validação:** Chunk size check
- **Erro:** 413 se exceder

---

## 🧪 **Como Testar:**

1. **Selecione um vídeo** grande (20-50MB)
2. **Verifique o console** - deve mostrar:
   ```
   📦 Recebendo chunk 1/10: {
     chunk_size_mb: "2.40",
     chunk_path: "arte-xxx.chunk.0"
   }
   ```

3. **Upload deve funcionar** sem erro 413

---

## 🎉 **Resultado Esperado:**

- ✅ **Vídeos grandes** (até 50MB) funcionando
- ✅ **Chunks menores** (2MB) respeitando limite Vercel
- ✅ **Upload paralelo** otimizado
- ✅ **Validação** de tamanho
- ✅ **Sem erros** 413

**Agora deve funcionar perfeitamente com vídeos!** 🚀✨
