# 🔧 Correção do Erro 500 no Webhook

## 🐛 Problema Identificado

O erro **500 - Internal Server Error** no webhook estava sendo causado por:

1. **Falta de `return` statements**: O código estava fazendo `res.status().json()` mas não estava retornando, causando execução adicional
2. **Falta de validação de variáveis de ambiente**: Não havia verificação se as variáveis necessárias estavam configuradas
3. **Falta de validação do body**: Não havia verificação se os campos obrigatórios estavam presentes

## ✅ Correções Aplicadas

### 1. Adicionados `return` statements
```typescript
// Antes
res.status(200).json({ received: true });

// Depois  
return res.status(200).json({ received: true });
```

### 2. Validação de variáveis de ambiente
```typescript
// Verificar variáveis de ambiente necessárias
if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
  console.error("❌ MERCADO_PAGO_ACCESS_TOKEN não configurado");
  return res.status(500).json({ error: "Configuração do Mercado Pago não encontrada" });
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Variáveis do Supabase não configuradas");
  return res.status(500).json({ error: "Configuração do banco de dados não encontrada" });
}
```

### 3. Validação do body do request
```typescript
// Validar se o body tem os campos necessários
if (!data || !type) {
  console.error("❌ Body inválido:", req.body);
  return res.status(400).json({ error: "Body inválido - campos data e type são obrigatórios" });
}
```

### 4. Validação do ID do pagamento
```typescript
// Validar se o ID do pagamento existe
if (!data.id) {
  console.error("❌ ID do pagamento não encontrado:", data);
  return res.status(400).json({ error: "ID do pagamento é obrigatório" });
}
```

## 🧪 Como Testar

### 1. Verificar variáveis de ambiente
Certifique-se que estas variáveis estão configuradas no seu `.env.local`:
```env
MERCADO_PAGO_ACCESS_TOKEN=TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Teste manual do webhook
```bash
curl -X POST http://localhost:3000/api/pagamento/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": {
      "id": "123456789"
    }
  }'
```

### 3. Verificar logs
Agora o webhook deve retornar logs mais detalhados:
- ✅ Se as variáveis estão configuradas
- ✅ Se o body é válido
- ✅ Se o ID do pagamento existe
- ✅ Se a conexão com Mercado Pago funciona
- ✅ Se a atualização no banco foi bem-sucedida

## 📋 Resposta Esperada

### Sucesso (200):
```json
{
  "received": true,
  "message": "Status atualizado para pago",
  "orderId": "123"
}
```

### Erro de configuração (500):
```json
{
  "error": "Configuração do Mercado Pago não encontrada"
}
```

### Erro de validação (400):
```json
{
  "error": "Body inválido - campos data e type são obrigatórios"
}
```

## 🎯 Próximos Passos

1. **Teste o webhook** com um pagamento real
2. **Monitore os logs** para garantir funcionamento
3. **Verifique se o status** está sendo atualizado na interface
4. **Configure notificações** para o usuário quando o status mudar

## 🔍 Troubleshooting

Se ainda houver erro 500:
1. Verifique se todas as variáveis de ambiente estão configuradas
2. Confirme se o token do Mercado Pago é válido
3. Verifique se a tabela `order` tem a coluna `status`
4. Teste a conexão com o Supabase
5. Verifique os logs do servidor para mais detalhes
