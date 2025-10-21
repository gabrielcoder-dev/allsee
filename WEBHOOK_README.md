# 🔔 Sistema de Webhook do Mercado Pago - Versão Melhorada

## 📋 Visão Geral

Este sistema foi completamente reescrito para resolver os problemas de atualização de status das orders após pagamentos. A nova implementação é mais robusta, organizada e inclui ferramentas de debugging.

## 🚀 Principais Melhorias

### 1. **Webhook Principal (`/api/pagamento/webhook.ts`)**
- ✅ Logs detalhados para debugging
- ✅ Validação robusta de payload
- ✅ Tratamento de erros melhorado
- ✅ Conversão automática de orderId para número
- ✅ Mapeamento completo de status do Mercado Pago
- ✅ Respostas padronizadas

### 2. **Ferramentas de Teste**
- 🧪 **Teste Manual**: `/api/pagamento/test-webhook.ts`
- 🎭 **Simulação de Webhook**: `/api/pagamento/simulate-webhook.ts`
- 📋 **Listagem de Orders**: `/api/pages/api/pagamento/list-orders.ts`
- 🖥️ **Interface Web**: `/test-webhook`

### 3. **Script de Teste Automatizado**
- 🤖 `scripts/test-webhook.js` - Testa todo o fluxo automaticamente

## 🔧 Como Usar

### 1. **Teste Manual via Interface Web**
```
http://localhost:3000/test-webhook
```
- Lista todas as orders
- Permite testar atualização de status
- Simula webhooks do Mercado Pago
- Mostra logs em tempo real

### 2. **Teste via API**

#### Listar Orders:
```bash
curl http://localhost:3000/api/pagamento/list-orders
```

#### Testar Atualização Manual:
```bash
curl -X POST http://localhost:3000/api/pagamento/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"orderId": 123, "status": "pago"}'
```

#### Simular Webhook:
```bash
curl -X POST http://localhost:3000/api/pagamento/simulate-webhook \
  -H "Content-Type: application/json" \
  -d '{"orderId": 123, "paymentId": "test_123_456"}'
```

### 3. **Teste Automatizado**
```bash
node scripts/test-webhook.js
```

## 🔍 Debugging

### Logs Detalhados
O webhook agora inclui logs detalhados para cada etapa:

```
🔔 Webhook recebido: { timestamp, headers, body, query }
💳 Processando pagamento ID: 130195980249
✅ Pagamento encontrado: { id, status, external_reference }
🔍 External reference encontrado: 123
🔢 Order ID convertido: 123
📊 Status mapeado: approved → pago
🔍 Verificando se order 123 existe...
✅ Order encontrada: { id, status_atual, payment_id }
🔄 Atualizando order 123 para status: pago
✅ Order atualizada com sucesso: { id, status, payment_id, updated_at }
```

### Verificação de Problemas Comuns

1. **Order não encontrada**: Verificar se o `external_reference` está correto
2. **Erro de conversão**: Verificar se o orderId é um número válido
3. **Token inválido**: Verificar variáveis de ambiente do Mercado Pago
4. **Supabase**: Verificar configuração do banco de dados

## 📊 Mapeamento de Status

| Mercado Pago | Status Interno | Descrição |
|--------------|----------------|-----------|
| `approved`   | `pago`         | Pagamento aprovado |
| `pending`    | `pendente`     | Aguardando confirmação |
| `rejected`   | `cancelado`    | Pagamento rejeitado |
| `cancelled`  | `cancelado`    | Pagamento cancelado |
| `refunded`   | `reembolsado`  | Pagamento reembolsado |

## 🔧 Configuração

### Variáveis de Ambiente Necessárias:
```env
MERCADO_PAGO_ACCESS_TOKEN=seu_token_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui
MERCADO_PAGO_WEBHOOK_URL=https://seudominio.com/api/pagamento/webhook
```

### Estrutura da Tabela `order`:
```sql
CREATE TABLE order (
  id SERIAL PRIMARY KEY,
  status VARCHAR(20) DEFAULT 'pendente',
  payment_id VARCHAR(50),
  -- outros campos...
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🐛 Problemas Resolvidos

### 1. **Formato do orderId**
- ✅ Conversão automática de string para número
- ✅ Validação de formato antes da conversão
- ✅ Logs detalhados do processo de conversão

### 2. **Falta de Logs**
- ✅ Logs detalhados em cada etapa
- ✅ Timestamps em todas as operações
- ✅ Informações de debugging completas

### 3. **Tratamento de Erros**
- ✅ Respostas padronizadas
- ✅ Códigos de status HTTP corretos
- ✅ Mensagens de erro claras

### 4. **Validação de Payload**
- ✅ Verificação de estrutura do webhook
- ✅ Validação de campos obrigatórios
- ✅ Tratamento de payloads malformados

## 🚨 Troubleshooting

### Webhook não atualiza order:
1. Verificar logs do webhook
2. Confirmar se `external_reference` está sendo enviado
3. Verificar se a order existe no banco
4. Testar com endpoint de teste manual

### Erro de conversão de orderId:
1. Verificar se `external_reference` é um número válido
2. Confirmar formato no checkout
3. Usar endpoint de teste para validar

### Order não encontrada:
1. Verificar se a order foi criada corretamente
2. Confirmar ID no banco de dados
3. Verificar se não há problemas de permissão

## 📈 Próximos Passos

1. **Monitoramento**: Implementar alertas para falhas de webhook
2. **Retry Logic**: Implementar tentativas automáticas
3. **Métricas**: Adicionar métricas de performance
4. **Notificações**: Enviar notificações quando orders são atualizadas

---

**Desenvolvido com ❤️ para resolver problemas de webhook do Mercado Pago**
