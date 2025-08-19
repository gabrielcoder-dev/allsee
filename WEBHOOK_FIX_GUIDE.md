# 🔧 Guia Rápido - Corrigir Webhook Não Atualizando Status

## 🚨 Problema
O webhook está retornando 200 mas não está atualizando o status do order para "pago".

## ✅ Solução

### 1. **Execute o Script SQL no Supabase**
1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Execute o arquivo `setup_webhook_policies.sql`
4. Verifique se as policies foram criadas

### 2. **Verifique as Variáveis de Ambiente**
Certifique-se que estas variáveis estão configuradas:
```env
MERCADO_PAGO_ACCESS_TOKEN=TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. **Teste o Webhook**
Faça um novo pagamento e verifique os logs:
- 🚀 Webhook iniciado
- 📨 Webhook recebido
- 💳 Processando pagamento
- 🔍 Status do pagamento
- 🔄 Mapeamento de status
- 🔍 Verificando se order existe
- 💾 Executando UPDATE
- ✅ Status atualizado

### 4. **Verificar no Banco**
Execute no SQL Editor:
```sql
-- Verificar orders e seus status
SELECT id, id_user, status, external_reference, created_at, updated_at 
FROM "order" 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔍 Logs de Erro Comuns

### Se aparecer "Order não encontrado":
- Verifique se o `external_reference` está correto
- Confirme se o order foi criado

### Se aparecer "Erro ao atualizar status":
- Execute o script SQL para criar as policies
- Verifique se o `SUPABASE_SERVICE_ROLE_KEY` está correto

### Se não aparecer nenhum log:
- Verifique se o webhook está sendo chamado
- Confirme a URL no Mercado Pago

## 📋 Status Simplificados
- **pendente** - Order criado, aguardando pagamento
- **pago** - Pagamento aprovado pelo Mercado Pago

## ⚡ Próximos Passos
1. Execute o script SQL
2. Faça um teste de pagamento
3. Verifique os logs
4. Confirme se o status mudou para "pago"
