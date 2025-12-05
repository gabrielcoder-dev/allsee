# 🔄 Webhook de Pagamentos - Documentação

## 📋 Visão Geral

O webhook do Asaas (`/api/asaas/webhook`) processa notificações de pagamento para os 3 métodos de pagamento suportados:
- ✅ **PIX**
- ✅ **Boleto**
- ✅ **Cartão de Crédito** (com suporte a parcelas)

## 🎯 Como Funciona

### Fluxo Geral

1. Cliente escolhe método de pagamento
2. Sistema cria pagamento no Asaas com `externalReference = orderId`
3. Asaas processa o pagamento
4. Asaas envia webhook para `/api/asaas/webhook`
5. Webhook identifica o `orderId` e atualiza o status do pedido

## 💳 Tipos de Pagamento

### 1. PIX
- **Pagamento único** e instantâneo
- **Quando atualiza:** Assim que o pagamento é recebido
- **Status:** `RECEIVED` ou `CONFIRMED`
- **Atualização:** ✅ Sempre atualiza para "pago"

### 2. Boleto
- **Pagamento único** com vencimento (3 dias)
- **Quando atualiza:** Quando o boleto é pago
- **Status:** `RECEIVED` ou `CONFIRMED`
- **Atualização:** ✅ Sempre atualiza para "pago"

### 3. Cartão de Crédito

#### Cartão à Vista (1 parcela)
- **Quando atualiza:** Quando o pagamento é confirmado
- **Status:** `CONFIRMED`
- **Atualização:** ✅ Sempre atualiza para "pago"

#### Cartão Parcelado (2+ parcelas)
- **Como funciona:** Cada parcela é um pagamento separado no Asaas
- **Primeira parcela (entrada):**
  - ✅ **Atualiza status para "pago"** quando a primeira parcela é confirmada
  - Isso permite que o pedido seja liberado mesmo sem todas as parcelas pagas
- **Parcelas subsequentes (2, 3, 4...):**
  - ℹ️ Recebe webhook, mas **NÃO atualiza o status** novamente
  - O pedido já está marcado como "pago" desde a primeira parcela

## 📥 Estrutura do Webhook

### Payload Recebido do Asaas

```json
{
  "event": "PAYMENT_RECEIVED",
  "payment": {
    "id": "pay_123456789",
    "customer": "cus_123456789",
    "billingType": "PIX", // ou "BOLETO" ou "CREDIT_CARD"
    "value": 100.00,
    "status": "RECEIVED",
    "externalReference": "123", // <- orderId
    "installments": 3, // Total de parcelas (se cartão)
    "installment": 1, // Número da parcela atual (se cartão)
    // ... outros campos
  }
}
```

### Campos Importantes

- `externalReference`: **orderId** do pedido (obrigatório)
- `billingType`: Tipo de pagamento (PIX, BOLETO, CREDIT_CARD)
- `status`: Status do pagamento (RECEIVED, CONFIRMED, PENDING, etc.)
- `installments`: Número total de parcelas (cartão)
- `installment`: Número da parcela atual (cartão parcelado)

## 🔄 Lógica de Atualização

### Quando Atualiza para "pago":

| Método | Condição |
|--------|----------|
| **PIX** | Sempre que receber webhook `PAYMENT_RECEIVED` ou status `RECEIVED/CONFIRMED` |
| **Boleto** | Sempre que receber webhook `PAYMENT_RECEIVED` ou status `RECEIVED/CONFIRMED` |
| **Cartão (1x)** | Sempre que receber webhook `PAYMENT_RECEIVED` ou status `CONFIRMED` |
| **Cartão (parcelado)** | **Apenas na primeira parcela** (`installment === 1` ou `installments === 1`) |

### Quando NÃO Atualiza:

- ✅ Parcelas subsequentes do cartão (2ª, 3ª, etc.) - não altera status novamente
- ✅ Eventos que não são `PAYMENT_RECEIVED` ou `PAYMENT_CONFIRMED`
- ✅ Status diferentes de `RECEIVED` ou `CONFIRMED`

## 📝 Logs e Debugging

O webhook gera logs detalhados para facilitar o debugging:

```
📥 Webhook recebido do Asaas: {...}
📋 Processando webhook para pedido 123: {...}
📦 Pedido encontrado: {...}
✅ Status do pedido 123 atualizado para "pago" - Motivo: Pagamento PIX recebido
✅ Pedido 123 processado com sucesso!
```

### Logs Importantes:

- **Tipo de pagamento identificado:** PIX, BOLETO ou CARTÃO
- **Parcelas:** Se aplicável, mostra `installmentNumber/installments`
- **Motivo da atualização:** Explica por que o status foi alterado
- **Status anterior/novo:** Para rastreabilidade

## ⚠️ Validações

O webhook valida:

1. ✅ **Método HTTP:** Apenas POST
2. ✅ **Dados do pagamento:** Deve ter objeto `payment`
3. ✅ **orderId:** Deve ter `externalReference` (orderId)
4. ✅ **Pedido existe:** Verifica se o pedido existe no banco
5. ✅ **Status válido:** Verifica se o status indica pagamento confirmado

## 🔒 Segurança

- ✅ Webhook aceita apenas requisições POST
- ✅ Valida se o pedido existe antes de atualizar
- ✅ Não atualiza status duplicado (se já está "pago")
- ✅ Logs detalhados para auditoria

## 🐛 Troubleshooting

### Webhook não está atualizando o status

1. **Verifique os logs:**
   - Procure por "Webhook recebido do Asaas"
   - Verifique se o `orderId` está correto
   - Verifique o tipo de pagamento e status

2. **Verifique o externalReference:**
   - Certifique-se que ao criar o pagamento, está passando `externalReference: orderId.toString()`
   - Todos os métodos (PIX, Boleto, Cartão) devem passar isso

3. **Verifique o status do pagamento:**
   - O webhook só atualiza se o status for `RECEIVED` ou `CONFIRMED`
   - Status `PENDING` não atualiza o pedido

4. **Para cartão parcelado:**
   - Apenas a primeira parcela atualiza o status
   - Parcelas subsequentes recebem webhook mas não alteram status

### Pedido não encontrado

- Verifique se o `externalReference` está sendo passado corretamente
- Verifique se o `orderId` existe no banco de dados
- Verifique os logs para ver qual `orderId` está sendo recebido

### Múltiplos webhooks

- É normal receber múltiplos webhooks (ex: um para cada parcela)
- O sistema verifica se já está "pago" antes de atualizar
- Parcelas subsequentes não alteram o status novamente

## 📊 Status de Pagamentos

### Status do Asaas → Status do Pedido

| Status Asaas | Evento | Atualiza Pedido? |
|--------------|--------|------------------|
| `RECEIVED` | `PAYMENT_RECEIVED` | ✅ Sim |
| `CONFIRMED` | `PAYMENT_CONFIRMED` | ✅ Sim |
| `PENDING` | - | ❌ Não |
| `OVERDUE` | `PAYMENT_OVERDUE` | ❌ Não |
| `REFUNDED` | `PAYMENT_REFUNDED` | ❌ Não |

## 🔗 Endpoints Relacionados

- `/api/asaas/create-pix` - Cria pagamento PIX
- `/api/asaas/create-boleto` - Cria pagamento Boleto
- `/api/asaas/create-credit-card` - Cria pagamento Cartão
- `/api/asaas/webhook` - Recebe notificações do Asaas

## 📚 Referências

- Documentação Asaas: https://docs.asaas.com/
- Eventos de Webhook: https://docs.asaas.com/docs/webhook-para-cobrancas
