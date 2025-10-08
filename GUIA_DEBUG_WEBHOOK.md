# Guia de Debug - Sistema de Webhook do Mercado Pago

## 🎯 Problema Original
O webhook do Mercado Pago estava sendo recebido, mas o status da order não estava sendo atualizado de "pendente" para "pago" no banco de dados.

## ✅ Melhorias Implementadas

### 1. **Logs Detalhados no Webhook** (`webhook.ts`)
- ✅ Log do tipo de dado do `external_reference`
- ✅ Log do comprimento da string do `external_reference`
- ✅ Verificação se a order existe ANTES de tentar atualizar
- ✅ Log comparativo do status anterior vs novo status
- ✅ Confirmação visual da atualização bem-sucedida

### 2. **Validação de Tipos** 
- ✅ `external_reference` é convertido para string e trimmed (remove espaços)
- ✅ `orderId` é garantido como string no retorno do criar-compra
- ✅ Logs de tipo de dado em cada etapa do fluxo

### 3. **Logs no Checkout** (`checkout.ts`)
- ✅ Log do `orderId` e seu tipo ao iniciar checkout
- ✅ Log do `external_reference` enviado ao Mercado Pago
- ✅ Confirmação de que o ID está sendo passado corretamente

### 4. **Logs no Criar Compra** (`criar-compra.ts`)
- ✅ Log do ID criado e seu tipo
- ✅ Garantia de retorno como string

### 5. **Endpoints de Debug**

#### **Verificar Order** (`/api/pagamento/verificar-order`)
Verifica se uma order existe e seu status atual.

**Uso:**
```bash
GET /api/pagamento/verificar-order?orderId=SEU_ORDER_ID
```

**Resposta:**
```json
{
  "success": true,
  "order": {
    "id": "uuid-aqui",
    "status": "pendente",
    "created_at": "2025-10-08T...",
    "updated_at": "2025-10-08T...",
    "empresa": "Nome da Empresa",
    "valor": 100
  }
}
```

#### **Atualizar Status Manual** (`/api/pagamento/atualizar-status-manual`)
Força a atualização do status de uma order (APENAS PARA DEBUG).

**Uso:**
```bash
POST /api/pagamento/atualizar-status-manual
Content-Type: application/json

{
  "orderId": "uuid-aqui",
  "status": "pago"
}
```

**Status válidos:** `pendente`, `pago`, `cancelado`, `expirado`

**Resposta:**
```json
{
  "success": true,
  "message": "Status atualizado com sucesso",
  "orderAnterior": {
    "id": "uuid-aqui",
    "status": "pendente"
  },
  "orderAtualizada": {
    "id": "uuid-aqui",
    "status": "pago",
    "updated_at": "2025-10-08T..."
  }
}
```

## 🔍 Como Debugar o Problema

### Passo 1: Criar uma Order de Teste
1. Crie uma order normalmente pelo sistema
2. Anote o `orderId` retornado
3. Verifique nos logs do servidor:
   ```
   ✅ Order criado com sucesso: {
     id: 'uuid-aqui',
     idType: 'string',
     status: 'pendente'
   }
   ```

### Passo 2: Verificar a Order no Banco
Use o endpoint de verificação:
```bash
GET /api/pagamento/verificar-order?orderId=SEU_ORDER_ID
```

Confirme que a order existe com status "pendente".

### Passo 3: Ir para o Checkout
Ao processar o checkout, verifique os logs:
```
🛒 Iniciando checkout: {
  orderId: 'uuid-aqui',
  orderIdType: 'string',
  total: 100,
  ...
}

✅ Preferência criada com sucesso: {
  preferenceId: 'pref-id',
  initPoint: 'url-checkout',
  externalReference: 'uuid-aqui',
  externalReferenceType: 'string'
}
```

**IMPORTANTE:** Confirme que `externalReference` é EXATAMENTE igual ao `orderId`.

### Passo 4: Fazer o Pagamento de Teste
1. Use o ambiente de testes do Mercado Pago
2. Faça um pagamento de teste usando cartão de teste
3. Aguarde o webhook ser chamado

### Passo 5: Verificar os Logs do Webhook
Procure nos logs do servidor:

```
🚀 Webhook iniciado - Método: POST

📨 Webhook recebido: {
  body: { type: 'payment', data: { id: '...' } },
  ...
}

💳 Processando pagamento ID: xxx

📊 Dados do pagamento: {
  id: xxx,
  status: 'approved',
  external_reference: 'uuid-aqui',
  ...
}

🔍 External Reference extraída: {
  externalReference: 'uuid-aqui',
  tipo: 'string',
  comprimento: 36
}

🔄 Atualizando status no banco: {
  orderId: 'uuid-aqui',
  orderIdType: 'string',
  statusInterno: 'pago',
  statusOriginal: 'approved'
}

📋 Order encontrada: {
  id: 'uuid-aqui',
  statusAtual: 'pendente',
  novoStatus: 'pago'
}

✅ Order atualizada com sucesso: {
  orderId: 'uuid-aqui',
  statusAnterior: 'pendente',
  statusNovo: 'pago',
  updatedAt: '2025-10-08T...'
}
```

### Passo 6: Verificar Novamente a Order
```bash
GET /api/pagamento/verificar-order?orderId=SEU_ORDER_ID
```

O status deve estar como "pago".

## 🚨 Possíveis Problemas e Soluções

### Problema 1: "Order não encontrada"
**Sintoma:** Webhook recebe o pagamento mas não encontra a order no banco.

**Causas possíveis:**
1. O `orderId` não está sendo passado corretamente ao checkout
2. O `external_reference` está vindo null ou vazio do Mercado Pago
3. Há uma incompatibilidade de tipo (UUID vs string)

**Solução:**
- Verifique os logs do checkout e confirme que `externalReference` está sendo enviado
- Use o endpoint de verificação para confirmar que a order existe
- Compare o `orderId` original com o `external_reference` recebido

### Problema 2: Order existe mas não atualiza
**Sintoma:** A order é encontrada mas o update falha.

**Causas possíveis:**
1. Permissões do Supabase (RLS - Row Level Security)
2. O usuário do webhook não tem permissão de atualizar
3. A coluna `status` não existe ou tem tipo diferente

**Solução:**
- Verifique se `SUPABASE_SERVICE_ROLE_KEY` está configurada corretamente
- Use o endpoint `/api/pagamento/atualizar-status-manual` para testar se a atualização funciona
- Verifique as políticas RLS da tabela `order` no Supabase

### Problema 3: Webhook não está sendo chamado
**Sintoma:** O pagamento é aprovado mas o webhook nunca chega.

**Causas possíveis:**
1. URL do webhook não está acessível publicamente
2. Mercado Pago está bloqueado por firewall
3. URL do webhook está incorreta

**Solução:**
- Certifique-se de que a URL está em produção ou use ngrok para desenvolvimento
- Verifique a variável `MERCADO_PAGO_WEBHOOK_URL` no `.env`
- No painel do Mercado Pago, vá em Webhooks e veja se há erros registrados

## 🧪 Teste Manual do Update

Se o webhook não estiver funcionando, você pode testar o update manualmente:

```bash
# 1. Criar uma order
POST /api/pagamento/criar-compra
{
  "empresa": "Teste",
  "nicho": "Teste",
  "valor": 100,
  ...
}

# Anote o orderId retornado

# 2. Verificar status (deve ser "pendente")
GET /api/pagamento/verificar-order?orderId=SEU_ORDER_ID

# 3. Atualizar manualmente para "pago"
POST /api/pagamento/atualizar-status-manual
{
  "orderId": "SEU_ORDER_ID",
  "status": "pago"
}

# 4. Verificar novamente (deve ser "pago")
GET /api/pagamento/verificar-order?orderId=SEU_ORDER_ID
```

Se este teste funcionar, o problema está na comunicação com o Mercado Pago, não no código de atualização.

## 📝 Checklist de Verificação

- [ ] A variável `SUPABASE_SERVICE_ROLE_KEY` está configurada?
- [ ] A variável `MERCADO_PAGO_ACCESS_TOKEN` está configurada?
- [ ] A variável `MERCADO_PAGO_WEBHOOK_URL` está configurada (se em produção)?
- [ ] A tabela `order` tem as colunas `id`, `status`, `updated_at`?
- [ ] O webhook está acessível publicamente?
- [ ] Os logs mostram que o `external_reference` está sendo recebido?
- [ ] O `external_reference` é igual ao `orderId` criado?
- [ ] A order existe no banco antes do webhook ser chamado?

## 💡 Dicas Adicionais

1. **Use o ambiente de testes do Mercado Pago** para não gerar cobranças reais
2. **Mantenha os logs abertos** durante o teste para ver o fluxo completo
3. **Teste primeiro o update manual** para isolar problemas de conexão
4. **Verifique o painel do Mercado Pago** para ver se os webhooks estão sendo entregues

## 🔗 Links Úteis

- [Documentação do Mercado Pago - Webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)
- [Cartões de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/testing)
- [Painel de Webhooks do Mercado Pago](https://www.mercadopago.com.br/developers/panel/webhooks)

