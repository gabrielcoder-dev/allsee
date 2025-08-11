# Teste do Webhook - Atualização de Status

## 🎯 O que foi implementado:

### 1. Webhook Atualizado (`src/pages/api/pagamento/webhook.ts`)
- ✅ Corrigido para usar a tabela `order` (não `compras`)
- ✅ Adicionados logs detalhados para debug
- ✅ Melhor tratamento de erros
- ✅ Atualiza status para "pago" quando pagamento é aprovado

### 2. Interface Atualizada (`src/app/(private)/meus-anuncios/page.tsx`)
- ✅ Busca a coluna `status` da tabela `order`
- ✅ Exibe status visual nos cards (verde para pago, amarelo para pendente)
- ✅ Mostra status no modal de detalhes

## 🧪 Como testar:

### 1. Verificar se a tabela `order` tem a coluna `status`:
```sql
-- Execute no SQL Editor do Supabase
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'order' AND column_name = 'status';
```

### 2. Verificar logs do webhook:
- Acesse os logs do seu servidor/deploy
- Procure por logs com emojis: 📨, 💳, 🔄, ✅, ❌

### 3. Teste manual (opcional):
```bash
# Simular webhook do Mercado Pago
curl -X POST http://localhost:3000/api/pagamento/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": {
      "id": "123456789"
    }
  }'
```

### 4. Verificar no banco:
```sql
-- Verificar orders e seus status
SELECT id, nome_campanha, status, created_at 
FROM "order" 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔍 Logs esperados:

### Webhook recebido:
```
📨 Webhook recebido: { method: 'POST', body: {...}, ... }
💳 Processando pagamento: { id: '123456789' }
📊 Dados do pagamento: { id: 123456789, status: 'approved', ... }
✅ Pagamento aprovado, atualizando status do order
🔄 Atualizando status do order 123 para: pago
✅ Status do order 123 atualizado com sucesso: [{ id: 123, status: 'pago' }]
🎉 Processamento concluído com sucesso
```

## ⚠️ Pontos importantes:

1. **URL do webhook**: Certifique-se que está configurada no Mercado Pago
2. **Token de acesso**: Verifique se `MERCADO_PAGO_ACCESS_TOKEN` está correto
3. **Permissões**: O webhook precisa ter acesso à tabela `order`
4. **External Reference**: Deve ser o ID do order criado

## 🐛 Troubleshooting:

### Se o status não atualizar:
1. Verifique os logs do servidor
2. Confirme se o `external_reference` está sendo enviado
3. Teste a conexão com o Supabase
4. Verifique se a tabela `order` tem a coluna `status`

### Se o webhook não for chamado:
1. Verifique a URL no painel do Mercado Pago
2. Confirme se o pagamento foi realmente aprovado
3. Teste com um pagamento real (não sandbox)

## 📝 Próximos passos:

1. Teste com um pagamento real
2. Verifique se o status aparece na interface
3. Monitore os logs para garantir funcionamento
4. Implemente notificações para o usuário quando status mudar
