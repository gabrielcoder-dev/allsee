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

### Erro: "KEY_API_ASAAS não configurada"
- **Causa:** A variável de ambiente `KEY_API_ASAAS` não está configurada
- **Solução:**
  1. Adicione a variável `KEY_API_ASAAS` no seu arquivo `.env.local` ou no painel do Vercel
  2. Certifique-se de que o valor está correto (sem espaços extras)
  3. Reinicie o servidor após adicionar a variável
  4. No ambiente de desenvolvimento, pare o servidor (`Ctrl+C`) e inicie novamente (`npm run dev`)

### Erro: "A chave de API informada não pertence a este ambiente" (invalid_environment)

Este é um dos erros mais comuns ao configurar o ASAAS pela primeira vez.

**Causa:** A chave de API configurada não corresponde ao ambiente especificado.

**Como resolver:**

#### Para Ambiente SANDBOX:

1. **Acesse o Sandbox do Asaas:**
   - URL: https://sandbox.asaas.com/
   - ⚠️ **Importante:** Esta é uma conta SEPARADA da produção!

2. **Crie uma conta no sandbox:**
   - O cadastro é gratuito e aprovado automaticamente
   - Use um email diferente da sua conta de produção, se necessário

3. **Gere uma chave de API:**
   - Faça login no painel do sandbox
   - Vá em **Integrações** → **API** (ou **Configurações** → **Integrações**)
   - Clique em **Gerar nova chave de API**
   - Copie a chave COMPLETA (ela será longa, cerca de 40-50 caracteres)

4. **Configure as variáveis de ambiente:**
   ```env
   ASAAS_ENVIRONMENT=sandbox
   KEY_API_ASAAS=sua_chave_de_sandbox_aqui
   ```

5. **Reinicie o servidor:**
   - No desenvolvimento: Pare (`Ctrl+C`) e inicie novamente (`npm run dev`)
   - No Vercel: As variáveis são aplicadas automaticamente no próximo deploy

#### Para Ambiente PRODUÇÃO:

1. **Acesse o painel do Asaas de produção:**
   - URL: https://www.asaas.com/
   - Faça login na sua conta de produção

2. **Gere uma chave de API de produção:**
   - Vá em **Integrações** → **API**
   - Clique em **Gerar nova chave de API**
   - ⚠️ **Atenção:** Chaves de produção têm acesso a dinheiro real!

3. **Configure as variáveis de ambiente:**
   ```env
   ASAAS_ENVIRONMENT=production
   KEY_API_ASAAS=sua_chave_de_producao_aqui
   ```

4. **Reinicie o servidor**

#### Checklist de Verificação:

- ✅ `ASAAS_ENVIRONMENT` está configurado como `sandbox` ou `production`?
- ✅ `KEY_API_ASAAS` contém uma chave válida do ambiente correto?
- ✅ A chave foi copiada completamente (sem cortes)?
- ✅ Não há espaços antes ou depois da chave?
- ✅ O servidor foi reiniciado após configurar as variáveis?

#### Endpoint de Validação:

Você pode usar o endpoint de validação para testar sua configuração:

```bash
GET /api/asaas/validate-config
```

Este endpoint irá:
- Verificar se a chave está configurada
- Validar o formato da chave
- Testar a conexão com a API do Asaas
- Identificar erros de ambiente
- Fornecer instruções específicas para resolver problemas

#### Mensagens de Erro Comuns:

- **"KEY_API_ASAAS não configurada"**: Adicione a variável de ambiente
- **"Chave de API inválida (formato muito curto)"**: A chave está incompleta
- **"A chave de API não pertence ao ambiente sandbox"**: Use uma chave de sandbox
- **"A chave de API não pertence ao ambiente production"**: Use uma chave de produção

### Erro: Status 500 ao criar pagamento PIX/Boleto

**Possíveis causas e soluções:**

1. **Chave de API inválida:**
   - Verifique se a chave está correta e completa
   - Teste usando o endpoint `/api/asaas/validate-config`

2. **Dados do cliente incompletos:**
   - Certifique-se de que o CPF/CNPJ está no formato correto (apenas números)
   - Email deve ser válido
   - Nome não pode estar vazio

3. **Valor inválido:**
   - O valor deve ser maior que zero
   - Use formato decimal (ex: 100.50)

4. **Erro de rede/conexão:**
   - Verifique sua conexão com a internet
   - O servidor pode estar temporariamente indisponível

### Pagamento não aparece como pago

**Causa:** O webhook não está configurado ou não está funcionando.

**Solução:**
1. Configure o webhook no painel do Asaas:
   - URL do webhook: `https://seu-dominio.com/api/asaas/webhook`
   - Selecione os eventos: `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, etc.

2. Verifique se a URL do webhook está acessível publicamente:
   - Teste acessando a URL no navegador
   - Deve retornar um erro de método (isso é normal, significa que está acessível)

3. Verifique os logs do webhook no painel do Asaas:
   - Veja se há tentativas de envio
   - Verifique se há erros de autenticação

4. Verifique os logs do servidor:
   - Os webhooks aparecem nos logs quando são recebidos
   - Erros são logados automaticamente

### Erro ao criar cliente

**Causa:** Dados do cliente inválidos ou incompletos.

**Solução:**
- Verifique se o CPF/CNPJ está no formato correto (apenas números, sem pontos ou traços)
- Certifique-se de que o email é válido
- Nome não pode estar vazio
- O Asaas pode ter limitações nos dados aceitos (verifique a documentação)

### Como testar a configuração

1. **Use o endpoint de validação:**
   ```bash
   curl http://localhost:3000/api/asaas/validate-config
   ```
   ou acesse no navegador: `http://localhost:3000/api/asaas/validate-config`

2. **Verifique os logs do servidor:**
   - Quando você tenta criar um pagamento, os logs mostram:
     - Ambiente configurado
     - URL da API sendo usada
     - Prefixo da chave (para verificação sem expor a chave completa)

3. **Teste criando um pagamento pequeno:**
   - Use o ambiente de sandbox
   - Crie um pagamento de teste
   - Verifique se é criado com sucesso no painel do Asaas

## 📚 Documentação do Asaas

Para mais informações, consulte a documentação oficial:
https://docs.asaas.com/

