# Remoção de Provedores de Pagamento

## Arquivos e Código Removidos

Este documento lista tudo que foi removido relacionado ao Stripe e Abacate Pay.

### Arquivos Deletados

1. **Stripe API Routes:**
   - `src/pages/api/stripe/create-checkout-session.ts`
   - `src/pages/api/stripe/webhook.ts`

2. **Abacate Pay API Routes:**
   - `src/pages/api/abacatepay/create-pix-payment.ts`
   - `src/pages/api/abacatepay/webhook.ts`

### Dependências Removidas

- `stripe` (do package.json)

### Arquivos Modificados

1. **src/app/(private)/checkout/page.tsx**
   - Removida toda lógica do Stripe
   - Substituído por página de placeholder

2. **src/app/(private)/metodo-pagamento/page.tsx**
   - Removida integração com Abacate Pay
   - Funções de pagamento PIX e Cartão agora mostram mensagem de "atualização"

3. **package.json**
   - Removida dependência `stripe`

### Variáveis de Ambiente a Remover

Remova as seguintes variáveis de ambiente do seu `.env` ou dashboard do Vercel:

#### Stripe:
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Qualquer variável que comece com `STRIPE_`

#### Abacate Pay:
- `ABACATE_PAY_API_KEY`
- `ABACATE_PAY_SECRET_KEY`
- `ABACATE_PAY_TOKEN`
- Qualquer variável que comece com `ABACATE_` ou `ABACATEPAY_`

### Próximos Passos

Agora você pode implementar a integração com Asaas:

1. Instalar a SDK do Asaas (se disponível)
2. Criar novos endpoints de API em `src/pages/api/asaas/`
3. Atualizar as páginas de pagamento para usar Asaas
4. Configurar variáveis de ambiente do Asaas

### Nota

O `package-lock.json` ainda pode conter referências ao Stripe. Execute:
```bash
npm install
```

Isso irá atualizar o lockfile removendo as dependências não utilizadas.

