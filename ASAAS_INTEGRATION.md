# Integração com Asaas

## ✅ Implementação Completa

A integração com Asaas foi implementada com sucesso! Agora você tem suporte para:
- ✅ PIX
- ✅ Cartão de Crédito (com parcelamento)
- ✅ Boleto Bancário
- ✅ Webhook para receber notificações de pagamento

## 📋 Variáveis de Ambiente Necessárias

Adicione as seguintes variáveis de ambiente no seu `.env` ou no dashboard do Vercel:

```env
# Chave da API do Asaas (obrigatória)
ASAAS_API_KEY=your_asaas_api_key_here

# Ambiente (opcional, padrão: sandbox)
# Use 'production' para produção ou 'sandbox' para testes
ASAAS_ENVIRONMENT=sandbox
```

### Como obter a Chave da API do Asaas:

1. Acesse o painel do Asaas: https://www.asaas.com/
2. Faça login na sua conta
3. Vá em **Integrações** ou **API**
4. Gere uma nova chave de API
5. Copie a chave e adicione como variável de ambiente

## 🔗 Endpoints Criados

### 1. Criar Pagamento PIX
- **Endpoint:** `POST /api/asaas/create-pix`
- **Body:**
  ```json
  {
    "orderId": "123",
    "customer": {
      "nome": "João Silva",
      "cpf": "12345678900",
      "email": "joao@example.com",
      "telefone": "11999999999"
    }
  }
  ```

### 2. Criar Boleto
- **Endpoint:** `POST /api/asaas/create-boleto`
- **Body:** Mesmo formato do PIX

### 3. Pagamento com Cartão
- **Endpoint:** `POST /api/asaas/create-credit-card`
- **Body:**
  ```json
  {
    "orderId": "123",
    "customer": { ... },
    "creditCard": {
      "holderName": "JOÃO SILVA",
      "number": "4111111111111111",
      "expiryMonth": 12,
      "expiryYear": 2025,
      "ccv": "123"
    },
    "installments": 1
  }
  ```

### 4. Webhook
- **Endpoint:** `POST /api/asaas/webhook`
- Configure este URL no painel do Asaas para receber notificações de pagamento

## 🔧 Configuração do Webhook no Asaas

1. Acesse o painel do Asaas
2. Vá em **Integrações** → **Webhooks**
3. Adicione um novo webhook com a URL:
   ```
   https://seu-dominio.com/api/asaas/webhook
   ```
4. Selecione os eventos que deseja receber:
   - `PAYMENT_RECEIVED`
   - `PAYMENT_OVERDUE`
   - `PAYMENT_DELETED`
   - `PAYMENT_RESTORED`
   - etc.

## 📱 Fluxo de Pagamento

### PIX
1. Usuário seleciona PIX na página de pagamento
2. Sistema cria pagamento no Asaas
3. QR Code e código PIX são exibidos
4. Usuário realiza pagamento
5. Webhook notifica quando pagamento é confirmado
6. Status do pedido é atualizado automaticamente

### Boleto
1. Usuário seleciona Boleto
2. Sistema cria boleto no Asaas (vencimento em 3 dias)
3. Link do boleto é exibido
4. Usuário imprime e paga o boleto
5. Webhook notifica quando pagamento é confirmado

### Cartão de Crédito
1. Usuário seleciona Cartão de Crédito
2. É redirecionado para página de checkout
3. Preenche dados do cartão
4. Sistema processa pagamento no Asaas
5. Se aprovado, redireciona para página de sucesso
6. Se necessário confirmação, mostra link adicional

## 🔄 Status dos Pagamentos

O sistema mapeia os status do Asaas para o sistema interno:

- `CONFIRMED` / `RECEIVED` → `pago`
- `PENDING` / `OVERDUE` → `pendente`
- `REFUNDED` → `reembolsado`
- `RECEIVED_IN_CASH_UNDONE` → `cancelado`

## 📝 Campos Adicionais no Banco de Dados

Os seguintes campos são salvos na tabela `order`:

- `asaas_payment_id`: ID do pagamento no Asaas
- `asaas_customer_id`: ID do cliente no Asaas

**Nota:** Certifique-se de que esses campos existem na sua tabela `order`. Se não existirem, você precisará adicioná-los ou o sistema tentará salvar (pode dar erro se a coluna não existir).

## 🧪 Testes

### Ambiente de Sandbox
Por padrão, o sistema usa o ambiente de sandbox. Para testar:

1. Configure `ASAAS_ENVIRONMENT=sandbox` (ou deixe vazio)
2. Use os cartões de teste do Asaas
3. Para PIX, use valores de teste (consulte documentação do Asaas)

### Produção
Para usar em produção:

1. Configure `ASAAS_ENVIRONMENT=production`
2. Use a chave de API de produção
3. Configure o webhook com a URL de produção

## ⚠️ Importante

- A chave da API deve ser mantida segura (nunca commitar no código)
- O webhook deve ser configurado para receber atualizações de status
- Os campos `asaas_payment_id` e `asaas_customer_id` devem existir na tabela `order`
- Sempre teste primeiro no ambiente de sandbox

## 🐛 Troubleshooting

### Erro: "ASAAS_API_KEY não configurada"
- Verifique se a variável de ambiente está configurada
- Reinicie o servidor após adicionar a variável

### Pagamento não aparece como pago
- Verifique se o webhook está configurado corretamente
- Verifique os logs do webhook no painel do Asaas
- Certifique-se de que a URL do webhook está acessível publicamente

### Erro ao criar cliente
- Verifique se os dados do cliente estão completos (CPF/CNPJ, email, etc.)
- O Asaas pode ter limitações nos dados aceitos

## 📚 Documentação do Asaas

Para mais informações, consulte a documentação oficial:
https://docs.asaas.com/

