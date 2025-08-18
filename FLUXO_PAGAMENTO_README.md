# Fluxo de Pagamento - Allsee

Este documento descreve o fluxo completo de pagamento integrado com o Mercado Pago.

## Arquivos Principais

### 1. `src/pages/api/pagamento/criar-compra.ts`
- **Função**: Cria um novo registro na tabela `order` com status `pendente`
- **Método**: POST
- **Dados de entrada**: Dados da compra (empresa, nicho, valor, etc.)
- **Retorno**: ID do order criado

### 2. `src/pages/api/pagamento/checkout.ts`
- **Função**: Cria preferência de pagamento no Mercado Pago
- **Método**: POST
- **Dados de entrada**: `total`, `orderId`, `payerData` (opcional)
- **Retorno**: URL de checkout do Mercado Pago

### 3. `src/pages/api/pagamento/webhook.ts`
- **Função**: Recebe notificações do Mercado Pago e atualiza status do order
- **Método**: POST
- **Processo**: 
  - Recebe notificação de pagamento
  - Busca dados do pagamento na API do Mercado Pago
  - Atualiza status do order no banco de dados

### 4. `src/lib/utils.ts`
- **Função**: `atualizarStatusCompra()` - Atualiza status do order no banco
- **Validações**: Verifica se order existe e valida status permitidos

### 5. `src/services/mercado-pago.ts`
- **Função**: Configuração e validação do cliente Mercado Pago
- **Validações**: Token de acesso, URL base, formato do token

## Fluxo Completo

1. **Criação da Compra**
   ```
   Frontend → criar-compra.ts → Tabela order (status: pendente)
   ```

2. **Checkout**
   ```
   Frontend → checkout.ts → Mercado Pago → URL de pagamento
   ```

3. **Pagamento**
   ```
   Usuário → Mercado Pago → Processamento do pagamento
   ```

4. **Notificação**
   ```
   Mercado Pago → webhook.ts → atualizarStatusCompra() → Tabela order
   ```

## Status de Pagamento

### Status do Mercado Pago → Status Interno
- `approved` → `aprovado`
- `rejected` → `rejeitado`
- `cancelled` → `cancelado`
- `pending` → `pendente`
- `in_process` → `em_processamento`

## URLs de Retorno

- **Sucesso**: `/pagamento-concluido?orderId={orderId}`
- **Falha**: `/pagamento-concluido?orderId={orderId}&status=failed`
- **Pendente**: `/pagamento-concluido?orderId={orderId}&status=pending`

## Configurações Necessárias

### Variáveis de Ambiente
```env
MERCADO_PAGO_ACCESS_TOKEN=your_access_token
NEXT_PUBLIC_BASE_URL=your_base_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Tabela Order
A tabela `order` deve ter os campos:
- `id` (primary key)
- `status` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- Outros campos específicos da compra

## Testes

### Teste de Configuração
Acesse: `/api/test-pagamento` para verificar se a configuração está correta.

### Teste de Webhook
O Mercado Pago envia um teste com `paymentId: "123456"` que é tratado automaticamente.

## Logs

Todos os arquivos incluem logs detalhados para facilitar o debug:
- ✅ Sucesso
- ❌ Erro
- 🔄 Processamento
- 📨 Webhook recebido
- 💳 Processamento de pagamento

## Tratamento de Erros

- Validação de dados de entrada
- Verificação de configurações
- Logs detalhados de erros
- Respostas de erro padronizadas
- Fallbacks para casos de erro
