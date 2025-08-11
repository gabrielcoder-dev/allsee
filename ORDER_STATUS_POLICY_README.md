# 🔄 Policy para Atualização de Status - Tabela Order

## 📋 Descrição
Esta policy permite que o webhook do Mercado Pago atualize o status dos orders de "pendente" para "pago" quando um pagamento for aprovado.

## 🗄️ Configuração do Banco de Dados

### **Passo 1: Aplicar a Policy SQL**

1. **Acesse o Supabase Dashboard**
2. **Vá para SQL Editor**
3. **Execute o código do arquivo `order_status_update_policy.sql`**

### **Passo 2: Verificar se Funcionou**

Execute este SQL para verificar se as políticas foram criadas:

```sql
-- Verificar políticas criadas
SELECT 
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'order'
ORDER BY policyname;
```

## 🔧 Como Funciona

### **1. Service Role (Webhook)**
- ✅ Pode atualizar **qualquer order** na tabela
- ✅ Usado pelo webhook do Mercado Pago
- ✅ Permite mudança de status de "pendente" → "pago"

### **2. Usuários Autenticados**
- ✅ Podem atualizar **apenas seus próprios orders**
- ✅ Baseado no campo `id_user`
- ✅ Restrição de segurança

### **3. Estrutura da Tabela**
```sql
-- Coluna status (criada automaticamente se não existir)
status TEXT DEFAULT 'pendente'

-- Valores possíveis:
-- 'pendente' - Order criado, aguardando pagamento
-- 'pago' - Pagamento aprovado pelo Mercado Pago
-- 'cancelado' - Pagamento cancelado (opcional)
-- 'reembolsado' - Pagamento reembolsado (opcional)
```

## 🚀 Funcionamento do Webhook

### **Fluxo Completo:**
1. **Usuário cria order** → Status = "pendente"
2. **Mercado Pago processa pagamento**
3. **Webhook recebe notificação**
4. **Service role atualiza status** → "pendente" → "pago"
5. **Order marcado como pago**

### **Código do Webhook:**
```typescript
// Função que atualiza o status
export async function atualizarStatusOrder(id: string, novoStatus: string) {
  const { data, error } = await supabase
    .from('order')
    .update({ status: novoStatus })
    .eq('id', id)
    .select('id, status');
  
  return data;
}
```

## 🔒 Segurança

### **Políticas Implementadas:**
- ✅ **RLS habilitado** na tabela `order`
- ✅ **Service role** pode atualizar qualquer order
- ✅ **Usuários autenticados** só podem atualizar seus próprios orders
- ✅ **Índices criados** para melhor performance

### **Validações:**
- ✅ Verifica se a coluna `status` existe
- ✅ Cria coluna automaticamente se necessário
- ✅ Define valor padrão "pendente"
- ✅ Cria índices para consultas rápidas

## 🧪 Teste da Policy

### **1. Verificar Orders Pendentes:**
```sql
SELECT 
    id,
    id_user,
    status,
    created_at
FROM "order" 
WHERE status = 'pendente'
ORDER BY created_at DESC
LIMIT 5;
```

### **2. Simular Atualização Manual:**
```sql
-- Atualizar um order específico (apenas para teste)
UPDATE "order" 
SET status = 'pago' 
WHERE id = 'SEU_ORDER_ID' 
AND status = 'pendente';
```

### **3. Verificar Orders Pagos:**
```sql
SELECT 
    id,
    id_user,
    status,
    created_at
FROM "order" 
WHERE status = 'pago'
ORDER BY created_at DESC
LIMIT 5;
```

## ⚠️ Importante

### **Antes de Aplicar:**
- ✅ Faça backup da tabela `order` se necessário
- ✅ Teste em ambiente de desenvolvimento primeiro
- ✅ Verifique se o service role key está configurado

### **Após Aplicar:**
- ✅ Teste o webhook com um pagamento real
- ✅ Verifique os logs do webhook
- ✅ Confirme se o status foi atualizado corretamente

## 🐛 Troubleshooting

### **Se o webhook não atualizar o status:**
1. Verifique se as políticas foram criadas
2. Confirme se o service role key está correto
3. Verifique os logs do webhook
4. Teste a conexão com o Supabase

### **Se houver erro de permissão:**
```sql
-- Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'order';

-- Verificar políticas ativas
SELECT * FROM pg_policies WHERE tablename = 'order';
```

## 📝 Logs Esperados

### **Webhook Funcionando:**
```
🔄 Atualizando status do order 123 para: pago
✅ Status do order 123 atualizado com sucesso: [{id: "123", status: "pago"}]
🎉 Processamento concluído com sucesso
```

### **Webhook com Erro:**
```
❌ Erro ao atualizar status do order 123: {error details}
```

---

**Arquivo criado:** `order_status_update_policy.sql`
**Status:** ✅ Pronto para uso
**Segurança:** ✅ RLS habilitado com políticas específicas
