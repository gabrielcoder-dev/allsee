# 🔧 Debug do Webhook - Solução Simples (Sem SQL)

## 🎯 Problema

O status da order não muda para "pago" após o pagamento.

## ✅ Solução Implementada

### 1. Webhook Melhorado
- ✅ Validação rigorosa do `external_reference`
- ✅ Logs detalhados no console
- ✅ Mensagens de erro específicas
- ✅ Usa `.select()` para confirmar atualização

### 2. Checkout Melhorado  
- ✅ Valida `orderId` antes de enviar
- ✅ Garante conversão para string
- ✅ Logs mostrando o que está sendo enviado

### 3. Endpoints de Debug (NOVOS!)

#### 🔍 Verificar Status de uma Order
```bash
POST /api/pagamento/verificar-status
Content-Type: application/json

{
  "orderId": "seu-order-id-aqui"
}
```

**Retorna:** Status atual da order e instruções

#### 🔄 Forçar Atualização Manual
Se você tiver o `payment_id` do Mercado Pago:

```bash
POST /api/pagamento/forcar-atualizacao
Content-Type: application/json

{
  "paymentId": "1234567890"
}
```

**Retorna:** Busca o pagamento no MP e atualiza a order automaticamente

## 🚀 Como Testar Agora

### Opção 1: Via Browser Console

Depois de fazer um pagamento, abra o console do navegador e execute:

```javascript
// Pegar o orderId da URL (depois de &orderId=)
const orderId = new URLSearchParams(window.location.search).get('orderId');

// Verificar status
fetch('/api/pagamento/verificar-status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orderId })
})
.then(r => r.json())
.then(console.log);
```

### Opção 2: Via Postman/Thunder Client

1. Faça um pagamento de teste
2. Copie o `orderId` da URL de retorno  
3. Use o endpoint `verificar-status` acima

### Opção 3: Se souber o Payment ID

Se aparecer na URL de retorno algo como `payment_id=123456`:

```javascript
fetch('/api/pagamento/forcar-atualizacao', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ paymentId: '123456' })
})
.then(r => r.json())
.then(console.log);
```

## 🔍 Diagnosticando o Problema

### Cenário 1: Order não encontrada
```json
{
  "error": "Order não encontrada"
}
```
**Causa:** O `orderId` não existe na tabela `order`
**Solução:** Verifique se a order foi criada corretamente

### Cenário 2: External reference inválido
```json
{
  "error": "Pagamento sem external_reference válido",
  "payment": {
    "external_reference": null
  }
}
```
**Causa:** O checkout não enviou o `orderId` ao Mercado Pago
**Solução:** Verificar logs do checkout

### Cenário 3: Webhook não está sendo chamado

Se o endpoint `/api/pagamento/verificar-status` mostra que a order existe mas está pendente, e você já pagou, significa que o webhook não está sendo chamado.

**Possíveis causas:**
- URL do webhook incorreta
- Mercado Pago está em modo teste mas não está configurado
- Firewall bloqueando

**Como verificar:**
1. Vá no painel do Mercado Pago
2. Verifique se a `notification_url` está configurada
3. Veja se há tentativas de webhook falhadas

## 📝 Próximos Passos

1. **Faça um pagamento de teste**
2. **Use o endpoint `verificar-status`** para ver o estado da order
3. **Se estiver pendente mas você pagou:** use `forcar-atualizacao` com o payment_id
4. **Observe os logs do servidor** para ver se o webhook está chegando

## 🎯 Principais Melhorias

### No Webhook:
- Retorna os dados da order quando não encontra
- `.select()` na atualização para confirmar sucesso
- Logs detalhados de cada etapa

### No Checkout:
- Validação do `orderId` antes de enviar
- Logs mostrando o `external_reference` exato
- Verifica valores null/undefined

### Novos Endpoints:
- `verificar-status`: Ver estado atual de uma order
- `forcar-atualizacao`: Atualizar manualmente usando payment_id

## 💡 Dica

Se o webhook não está funcionando, você pode usar o endpoint `forcar-atualizacao` como solução temporária enquanto debugamos o problema raiz!

