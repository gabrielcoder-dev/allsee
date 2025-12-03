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
KEY_API_ASAAS=your_asaas_api_key_here

# Ambiente (opcional, padrão: sandbox)
# Use 'production' para produção ou 'sandbox' para testes
ASAAS_ENVIRONMENT=sandbox
```

### Como obter a Chave da API do Asaas:

#### Para Ambiente de Testes (Sandbox):

1. **Acesse o Sandbox do Asaas**: https://sandbox.asaas.com/
2. **Crie uma conta** no ambiente de sandbox (é uma conta separada da produção)
   - O cadastro é similar ao ambiente de produção
   - A conta é aprovada automaticamente no sandbox
3. **Faça login** na sua conta do sandbox
4. Vá em **Integrações** → **API** (ou **Configurações** → **Integrações**)
5. **Gere uma nova chave de API** (exclusiva para sandbox)
6. Copie a chave e adicione como variável de ambiente:
   ```env
   ASAAS_ENVIRONMENT=sandbox
   KEY_API_ASAAS=sua_chave_de_sandbox_aqui
   ```

#### Para Ambiente de Produção:

1. **Acesse o painel do Asaas**: https://www.asaas.com/
2. Faça login na sua conta
3. Vá em **Integrações** → **API**
4. Gere uma nova chave de API (exclusiva para produção)
5. Copie a chave e adicione como variável de ambiente:
   ```env
   ASAAS_ENVIRONMENT=production
   KEY_API_ASAAS=sua_chave_de_producao_aqui
   ```

**⚠️ Importante:**
- As chaves de API são **diferentes** entre sandbox e produção
- Você precisa criar contas separadas para cada ambiente
- A chave de sandbox **não funciona** em produção e vice-versa

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

O ambiente de sandbox permite testar integrações sem cobranças reais. Para usar:

1. **Crie uma conta no sandbox**: https://sandbox.asaas.com/
2. **Gere uma chave de API** no painel do sandbox
3. **Configure as variáveis de ambiente**:
   ```env
   ASAAS_ENVIRONMENT=sandbox
   KEY_API_ASAAS=sua_chave_de_sandbox
   ```
4. Por padrão, o sistema usa sandbox se `ASAAS_ENVIRONMENT` não estiver configurado

**Recursos do Sandbox:**
- Teste sem cobranças reais
- Use cartões de teste do Asaas
- PIX e boletos são simulados
- Aprovação automática de conta

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
- Verifique se a variável de ambiente `KEY_API_ASAAS` está configurada
- Reinicie o servidor após adicionar a variável

### Erro: "A chave de API informada não pertence a este ambiente" (invalid_environment)
- **Causa:** A chave de API não corresponde ao ambiente configurado
- **Solução:**
  - Se `ASAAS_ENVIRONMENT=sandbox` (ou não configurado), use uma chave de API de **sandbox**
  - Se `ASAAS_ENVIRONMENT=production`, use uma chave de API de **produção**
  - Verifique no painel do Asaas qual ambiente a chave pertence
  - Certifique-se de que `ASAAS_ENVIRONMENT` e `KEY_API_ASAAS` estão alinhados

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

