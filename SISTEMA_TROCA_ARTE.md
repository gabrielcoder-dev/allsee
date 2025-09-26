# Sistema de Troca de Arte com Upload em Chunks

## 📋 Visão Geral

Este sistema implementa a mesma lógica de upload em chunks para o sistema de troca de arte, permitindo upload de imagens e vídeos de até 1GB de forma eficiente e sem bloqueio da interface.

## 🗂️ Arquivos Criados/Modificados

### **Novos Endpoints API:**
- `src/pages/api/admin/criar-arte-troca-campanha.ts` - Cria registro de arte de troca
- `src/pages/api/admin/upload-chunk-troca.ts` - Processa chunks de arte de troca
- `src/pages/api/admin/aceitar-troca.ts` - Substitui caminho_imagem entre tabelas

### **Tabela de Banco:**
- `database/chunks_temp_troca_table.sql` - Tabela temporária para chunks de troca

### **Componentes Atualizados:**
- `src/app/(private)/meus-anuncios/page.tsx` - Upload de troca com chunks
- `src/Components/ReplacementAdmin.tsx` - Aceitar troca via novo endpoint
- `middleware.ts` - Incluído novos endpoints

## 🔄 Fluxo do Sistema

### **1. Upload de Troca (Meus Anúncios):**
```
Usuário seleciona arquivo → Compressão (imagens) → Criação registro vazio → Upload em background
```

### **2. Aprovação (Admin):**
```
Admin clica "Aceitar" → Busca IDs → Chama endpoint → Substitui caminho_imagem
```

## 🚀 Como Usar

### **Para Usuários (Meus Anúncios):**
1. Acesse `/meus-anuncios`
2. Clique em "Trocar arte" em um anúncio aprovado
3. Selecione nova imagem/vídeo (até 1GB)
4. Clique "Trocar Arte"
5. Upload acontece em background - interface não trava

### **Para Admins (Dashboard):**
1. Acesse `/dashboard` → "Aprovação de Pedidos"
2. Visualize arte de troca enviada
3. Clique "Aprovar" para aceitar a troca
4. Arte substitui a original automaticamente

## 📊 Logs do Sistema

### **Upload de Troca:**
```
📤 Preparando upload de troca em background
✅ Registro de troca criado para upload em background, ID: XX
🚀 Iniciando upload de troca em background...
📦 Background Troca: Dividindo em X chunks
✅ Background Troca: Chunk 1/X enviado
✅ Upload de troca em background concluído
```

### **Aprovação:**
```
🔄 Aceitando troca de arte: { orderId: XX }
📥 IDs encontrados: { arte_troca_campanha_id: XX, arte_campanha_id: XX }
✅ Troca aceita com sucesso
```

## ⚙️ Configuração Necessária

### **1. Criar Tabela de Chunks:**
Execute o SQL em `database/chunks_temp_troca_table.sql` no Supabase:

```sql
CREATE TABLE IF NOT EXISTS chunks_temp_troca (
  id SERIAL PRIMARY KEY,
  arte_troca_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_data TEXT NOT NULL,
  total_chunks INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(arte_troca_id, chunk_index)
);
```

### **2. Políticas RLS:**
```sql
CREATE POLICY "Permitir operações em chunks_temp_troca" ON chunks_temp_troca
FOR ALL USING (true);
```

## 🔧 Características Técnicas

### **Upload Otimizado:**
- ✅ **Compressão de imagens**: Reduz tamanho automaticamente
- ✅ **Chunks de 1MB**: Evita limite de payload do Vercel
- ✅ **Upload completo antes do checkout**: Garante que arquivo seja salvo
- ✅ **Delay de 100ms**: Entre chunks para upload mais rápido
- ✅ **Armazenamento temporário**: Chunks salvos no banco

### **Substituição de Arte:**
- ✅ **Endpoint dedicado**: `/api/admin/aceitar-troca`
- ✅ **Validação de IDs**: Verifica existência das tabelas
- ✅ **Logs detalhados**: Para debugging
- ✅ **Limpeza automática**: Remove chunks temporários

## 🎯 Vantagens

1. **Upload Garantido**: Arquivo é salvo completamente antes do checkout
2. **Arquivos Grandes**: Suporte até 1GB
3. **Confiabilidade**: Chunks salvos no banco
4. **Performance**: Compressão automática de imagens
5. **Logs Claros**: Debugging facilitado
6. **Consistência**: Mesma lógica do upload principal
7. **Upload Rápido**: Delay reduzido para 100ms entre chunks

## 🚨 Pontos de Atenção

- **Tabela temporária**: `chunks_temp_troca` deve existir
- **Políticas RLS**: Configuradas corretamente
- **Limite de tamanho**: 1GB máximo por arquivo
- **Formato suportado**: Imagens (JPG, PNG, GIF) e vídeos (MP4, MOV, AVI)

## 🔍 Troubleshooting

### **Erro "Chunks faltando":**
- Verificar se tabela `chunks_temp_troca` existe
- Verificar políticas RLS
- Verificar logs do console

### **Upload não funciona:**
- Verificar tamanho do arquivo (máx 1GB)
- Verificar formato do arquivo
- Verificar logs de erro no console

### **Aprovação falha:**
- Verificar se arte de troca existe
- Verificar se arte original existe
- Verificar logs do endpoint `/api/admin/aceitar-troca`
