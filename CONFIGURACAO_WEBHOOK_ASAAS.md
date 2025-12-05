# 🔔 Configuração de Webhook no Asaas

## 📋 Eventos Obrigatórios (Essenciais)

Estes eventos são **necessários** para que o sistema atualize o status dos pedidos:

### ✅ **PAYMENT_RECEIVED** 
- **Quando dispara:** Quando um pagamento é recebido
- **Usado para:**
  - ✅ **PIX** - Quando o cliente paga o QR Code
  - ✅ **Boleto** - Quando o boleto é compensado
  - ✅ **Cartão** - Quando a cobrança é confirmada (para parcelas)
- **Ação:** Atualiza status do pedido para "pago"

### ✅ **PAYMENT_CONFIRMED**
- **Quando dispara:** Quando um pagamento é confirmado
- **Usado para:**
  - ✅ **Cartão de Crédito** - Quando a transação é confirmada
  - ✅ **PIX/Boleto** - Confirmação adicional (opcional, mas recomendado)
- **Ação:** Atualiza status do pedido para "pago"

## 🎯 Eventos Opcionais (Recomendados)

Estes eventos são úteis para monitoramento e gestão:

### ⚠️ **PAYMENT_OVERDUE**
- **Quando dispara:** Quando um pagamento vence
- **Útil para:** Boleto vencido
- **Ação:** Apenas registro (não altera status para "pago")

### 🗑️ **PAYMENT_DELETED**
- **Quando dispara:** Quando um pagamento é cancelado/deletado
- **Ação:** Apenas registro (para auditoria)

### 💰 **PAYMENT_REFUNDED**
- **Quando dispara:** Quando um pagamento é reembolsado
- **Ação:** Apenas registro (para gestão financeira)

## 📊 Resumo por Método de Pagamento

| Método | Evento Principal | Evento Secundário |
|--------|-----------------|-------------------|
| **PIX** | `PAYMENT_RECEIVED` | `PAYMENT_CONFIRMED` |
| **Boleto** | `PAYMENT_RECEIVED` | `PAYMENT_OVERDUE` (vencimento) |
| **Cartão (1x)** | `PAYMENT_CONFIRMED` | `PAYMENT_RECEIVED` |
| **Cartão (Parcelado)** | `PAYMENT_RECEIVED` (cada parcela) | `PAYMENT_CONFIRMED` |

## ⚙️ Configuração no Painel Asaas

### Passo a Passo:

1. **Acesse o painel do Asaas:**
   - Sandbox: https://sandbox.asaas.com/
   - Produção: https://www.asaas.com/

2. **Vá em:**
   - **Integrações** → **Webhooks**
   - Ou: **Configurações** → **Integrações** → **Webhooks**

3. **Adicione um novo webhook:**
   - **URL:** `https://seu-dominio.com/api/asaas/webhook`
   - **Método:** POST (já configurado automaticamente)

4. **Selecione os eventos:**

   ✅ **Obrigatórios (Mínimo):**
   - `PAYMENT_RECEIVED`
   - `PAYMENT_CONFIRMED`

   ⚠️ **Opcionais (Recomendado):**
   - `PAYMENT_OVERDUE`
   - `PAYMENT_DELETED`
   - `PAYMENT_REFUNDED`

5. **Salve o webhook**

## 🎯 Configuração Recomendada

### Mínima (Funciona, mas limitada):
```
✅ PAYMENT_RECEIVED
✅ PAYMENT_CONFIRMED
```

### Completa (Recomendada):
```
✅ PAYMENT_RECEIVED       (PIX, Boleto, Cartão)
✅ PAYMENT_CONFIRMED      (Cartão principalmente)
⚠️ PAYMENT_OVERDUE        (Boleto vencido)
🗑️ PAYMENT_DELETED        (Cancelamentos)
💰 PAYMENT_REFUNDED       (Reembolsos)
```

## 📝 Exemplo de Configuração Visual

No painel do Asaas, você verá algo assim:

```
┌─────────────────────────────────────────┐
│ URL do Webhook:                         │
│ https://seu-dominio.com/api/asaas/webhook │
│                                         │
│ Eventos:                                │
│ ☑ PAYMENT_RECEIVED                      │
│ ☑ PAYMENT_CONFIRMED                     │
│ ☑ PAYMENT_OVERDUE                       │
│ ☐ PAYMENT_DELETED                       │
│ ☐ PAYMENT_REFUNDED                      │
│                                         │
│ [Salvar]                                │
└─────────────────────────────────────────┘
```

## ⚠️ Importante

1. **URL do Webhook:**
   - Deve ser HTTPS (não HTTP)
   - Deve ser acessível publicamente
   - Formato: `https://seu-dominio.com/api/asaas/webhook`

2. **Ambiente:**
   - Configure webhook **separado** para sandbox e produção
   - Sandbox: Use URL de preview/teste
   - Produção: Use URL de produção

3. **Teste o Webhook:**
   - O Asaas permite testar o webhook após configurar
   - Use essa funcionalidade para validar

## 🔍 Como o Código Processa

O webhook processa os eventos da seguinte forma:

```javascript
// Eventos que atualizam status para "pago":
- PAYMENT_RECEIVED (com status RECEIVED)
- PAYMENT_CONFIRMED (com status CONFIRMED)

// Outros eventos:
- Apenas são logados, não alteram status
```

## 🐛 Troubleshooting

### Webhook não está recebendo eventos:

1. ✅ Verifique se a URL está correta e acessível
2. ✅ Verifique se os eventos estão selecionados
3. ✅ Teste a URL manualmente (deve retornar erro de método, mas estar acessível)
4. ✅ Verifique os logs do webhook no painel do Asaas

### Status não está atualizando:

1. ✅ Verifique se `PAYMENT_RECEIVED` ou `PAYMENT_CONFIRMED` estão selecionados
2. ✅ Verifique os logs do servidor para ver se o webhook está chegando
3. ✅ Verifique se o `externalReference` (orderId) está correto

## 📚 Referências

- Documentação Asaas: https://docs.asaas.com/docs/webhook-para-cobrancas
- Lista de Eventos: https://docs.asaas.com/docs/receive-asaas-events-at-your-webhook-endpoint
