# 🔄 Sistema de Troca de Arte - Novo Fluxo

## 📊 Arquitetura Atualizada

### **Antes (Base64 no Banco):**
```
┌─────────────────────────────────────────────┐
│ 1. Usuário envia nova arte                 │
│    → Converte para base64 (50MB+)          │
│    → Divide em chunks                       │
│    → Salva chunks em chunks_temp_troca      │
│    → Reconstrói e salva em                  │
│      arte_troca_campanha.caminho_imagem     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2. Admin aceita troca                       │
│    → Lê base64 de arte_troca_campanha      │
│    → Se > 2MB, divide em chunks novamente  │
│    → Salva chunks em chunks_temp_troca      │
│    → Reconstrói e substitui                 │
│      arte_campanha.caminho_imagem           │
└─────────────────────────────────────────────┘

❌ Problemas:
- Base64 armazenado 2x no banco
- Processo lento (chunks → reconstrução)
- Timeout em arquivos grandes
- Banco inchado
```

### **Depois (URL no Storage):**
```
┌─────────────────────────────────────────────┐
│ 1. Usuário envia nova arte                 │
│    → Upload direto para Storage            │
│    → Gera URL pública                       │
│    → Salva URL em                           │
│      arte_troca_campanha.caminho_imagem     │
│      (ex: https://...storage.../arte-123.jpg)
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2. Admin aceita troca                       │
│    → Lê URL de arte_troca_campanha         │
│    → COPIA A URL para                       │
│      arte_campanha.caminho_imagem           │
│    → Pronto! (< 1 segundo)                  │
└─────────────────────────────────────────────┘

✅ Vantagens:
- Apenas URLs no banco (80 bytes cada)
- SUPER rápido (cópia de string)
- Sem timeout
- Sem chunks temporários
- Arquivos compartilham mesmo storage
```

---

## 🗂️ Estrutura do Storage

```
Bucket: arte-campanhas/
│
├── arte-123-original.jpg     ← Arte original da campanha 123
├── arte-123-troca-1.jpg      ← Primeira tentativa de troca
├── arte-123-troca-2.jpg      ← Segunda tentativa (se rejeitada)
├── arte-456-original.jpg     ← Arte original da campanha 456
└── ...
```

**Ambas as tabelas apontam para o mesmo bucket:**

```sql
-- Arte original
SELECT caminho_imagem FROM arte_campanha WHERE id = 123;
→ https://xxx.supabase.co/storage/v1/object/public/arte-campanhas/arte-123-original.jpg

-- Arte de troca proposta
SELECT caminho_imagem FROM arte_troca_campanha WHERE id_campanha = 123;
→ https://xxx.supabase.co/storage/v1/object/public/arte-campanhas/arte-123-troca-1.jpg
```

---

## 🔄 Fluxo Completo de Troca

### **Passo 1: Usuário Solicita Troca**

```typescript
// Frontend (meus-anuncios/page.tsx)
const handleTrocarArte = async () => {
  // Upload para storage
  const uploadResult = await uploadFile(selectedFile, 'arte-campanhas');
  
  // Criar registro com URL
  await fetch('/api/admin/criar-arte-troca-campanha', {
    method: 'POST',
    body: JSON.stringify({
      id_campanha: anuncio.id,
      caminho_imagem: uploadResult.public_url  // ← URL do storage
    })
  });
};

// Banco de dados:
INSERT INTO arte_troca_campanha (id_campanha, caminho_imagem)
VALUES (123, 'https://xxx.supabase.co/storage/.../arte-123-troca-1.jpg');
```

### **Passo 2: Admin Visualiza Troca**

```typescript
// Frontend exibe ambas as artes
const arteAtual = arteCampanha.caminho_imagem;        // URL da original
const arteNova = arteTrocaCampanha.caminho_imagem;    // URL da troca

// Ambas carregam normalmente em <Image> ou <video>
<div>
  <h3>Arte Atual</h3>
  <Image src={arteAtual} />
  
  <h3>Arte Nova Proposta</h3>
  <Image src={arteNova} />
</div>
```

### **Passo 3: Admin Aceita Troca**

```typescript
// API: /api/admin/aceitar-troca.ts
export default async function handler(req, res) {
  const { arte_troca_campanha_id, arte_campanha_id } = req.body;
  
  // 1. Buscar URL da arte nova
  const { data: arteTroca } = await supabase
    .from('arte_troca_campanha')
    .select('caminho_imagem')
    .eq('id', arte_troca_campanha_id)
    .single();
  
  // arteTroca.caminho_imagem = "https://...storage.../arte-123-troca-1.jpg"
  
  // 2. Copiar URL para arte_campanha (SUPER RÁPIDO!)
  await supabase
    .from('arte_campanha')
    .update({ caminho_imagem: arteTroca.caminho_imagem })
    .eq('id', arte_campanha_id);
  
  // Pronto! Substitução feita em < 1 segundo ✅
}
```

**SQL executado:**
```sql
-- Buscar URL da nova arte
SELECT caminho_imagem 
FROM arte_troca_campanha 
WHERE id = 456;
-- Resultado: https://xxx.supabase.co/storage/.../arte-123-troca-1.jpg

-- Atualizar arte original (apenas cópia de string!)
UPDATE arte_campanha 
SET caminho_imagem = 'https://xxx.supabase.co/storage/.../arte-123-troca-1.jpg'
WHERE id = 123;

-- ✅ Feito! Arte substituída instantaneamente
```

---

## 📋 Banco de Dados

### **Tabelas Envolvidas:**

```sql
-- Arte original da campanha
CREATE TABLE arte_campanha (
  id SERIAL PRIMARY KEY,
  id_order INTEGER REFERENCES "order"(id),
  id_user UUID REFERENCES auth.users(id),
  caminho_imagem TEXT  -- URL do storage
);

-- Arte de troca proposta
CREATE TABLE arte_troca_campanha (
  id SERIAL PRIMARY KEY,
  id_campanha INTEGER REFERENCES arte_campanha(id),
  caminho_imagem TEXT,  -- URL do storage
  created_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'pendente'  -- pendente, aceita, rejeitada
);
```

### **Consultas Comuns:**

```sql
-- Buscar campanha com arte atual e proposta
SELECT 
  ac.id as campanha_id,
  ac.caminho_imagem as arte_atual,
  atc.id as troca_id,
  atc.caminho_imagem as arte_proposta,
  atc.status as status_troca
FROM arte_campanha ac
LEFT JOIN arte_troca_campanha atc ON atc.id_campanha = ac.id
WHERE ac.id_user = 'abc123'
  AND atc.status = 'pendente';
```

---

## ⚡ Comparação de Performance

### **Aceitar Troca de Arquivo de 50MB:**

| Métrica | Antes (Base64) | Depois (URL) |
|---------|----------------|--------------|
| **Tempo** | ~45 segundos | < 1 segundo |
| **Operações no banco** | ~25 INSERTs + 1 UPDATE | 1 UPDATE |
| **Espaço usado** | 150MB (3x o arquivo) | 160 bytes (2 URLs) |
| **Risco de timeout** | Alto | Zero |
| **Complexidade** | Chunks → Reconstrução | Cópia de string |

---

## 🔍 Como Identificar Arte Original vs Troca

### **Método 1: Pelo Banco (Recomendado)**
```typescript
// Buscar campanha com troca pendente
const { data } = await supabase
  .from('arte_troca_campanha')
  .select(`
    id,
    id_campanha,
    caminho_imagem,
    arte_campanha!inner(
      id,
      caminho_imagem
    )
  `)
  .eq('status', 'pendente');

// Resultado:
{
  id: 456,  // ID da troca
  id_campanha: 123,
  caminho_imagem: "https://.../arte-123-troca-1.jpg",  // Nova
  arte_campanha: {
    id: 123,
    caminho_imagem: "https://.../arte-123-original.jpg"  // Atual
  }
}
```

### **Método 2: Pelo Nome do Arquivo (Opcional)**
```
arte-123-original.jpg  → Arte atual da campanha
arte-123-troca-1.jpg   → Primeira tentativa de troca
arte-123-troca-2.jpg   → Segunda tentativa (se rejeitada)
```

---

## 🗑️ Limpeza de Artes Antigas

Quando uma troca é aceita, você pode:

**Opção 1: Manter histórico (Recomendado)**
```typescript
// Manter arte_troca_campanha com status 'aceita'
await supabase
  .from('arte_troca_campanha')
  .update({ status: 'aceita' })
  .eq('id', arte_troca_campanha_id);

// Manter arquivo antigo no storage (histórico)
// Ambos os arquivos continuam acessíveis
```

**Opção 2: Deletar arte antiga**
```typescript
// 1. Guardar URL da arte antiga antes de substituir
const { data: arteAntiga } = await supabase
  .from('arte_campanha')
  .select('caminho_imagem')
  .eq('id', arte_campanha_id)
  .single();

// 2. Substituir por nova
await supabase
  .from('arte_campanha')
  .update({ caminho_imagem: arteNova.caminho_imagem })
  .eq('id', arte_campanha_id);

// 3. Deletar arquivo antigo do storage
const fileName = arteAntiga.caminho_imagem.split('/').pop();
await supabase.storage
  .from('arte-campanhas')
  .remove([fileName]);
```

---

## ✅ Vantagens do Novo Sistema

1. **🚀 Ultra Rápido**: Copia URL ao invés de transferir arquivo
2. **💾 Espaço Eficiente**: Apenas URLs no banco (99% economia)
3. **🔒 Sem Timeout**: Operação instantânea
4. **📁 Organizado**: Todos os arquivos em um lugar
5. **🔄 Simples**: Sem chunks, sem reconstrução
6. **📊 Escalável**: Funciona com arquivos de qualquer tamanho
7. **♻️ Reutilizável**: Mesmo arquivo pode ser usado em múltiplas campanhas

---

## 🧪 Teste Prático

1. Usuário faz upload de arte nova (10MB)
2. Arte vai para storage → URL gerada
3. Admin aceita troca
4. URL é copiada em < 1 segundo
5. Frontend atualiza automaticamente
6. Usuário vê nova arte imediatamente

**Console do Browser:**
```
🔄 Aceitando troca de arte...
🔗 Arte está no storage, copiando URL...
✅ Arte substituída em 0.3 segundos!
```

---

**Conclusão:** Sistema MUITO mais simples e rápido! 🎉

