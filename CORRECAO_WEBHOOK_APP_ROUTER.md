# 🔧 Correção do Erro 500 - Estrutura do Next.js

## 🐛 Problema Identificado

O erro **500 - Internal Server Error** estava sendo causado por um **conflito de estrutura** no Next.js:

### ❌ Problema:
- O projeto estava usando a **estrutura `app`** do Next.js 13+ (App Router)
- Mas as **API routes** estavam na estrutura antiga `pages/api`
- Isso causava conflitos e as rotas não funcionavam corretamente

## ✅ Solução Aplicada

### 1. Migração para App Router
Movemos todas as API routes da estrutura `pages/api` para `app/api`:

```
❌ Antes (não funcionava):
src/pages/api/pagamento/webhook.ts

✅ Depois (funciona):
src/app/api/pagamento/webhook/route.ts
```

### 2. Mudanças na Sintaxe

#### Antes (Pages Router):
```typescript
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  const body = req.body;
  return res.status(200).json({ received: true });
}
```

#### Depois (App Router):
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({ received: true });
}
```

### 3. Arquivos Migrados

1. **Webhook**: `src/app/api/pagamento/webhook/route.ts`
2. **Checkout**: `src/app/api/pagamento/checkout/route.ts`
3. **Criar Compra**: `src/app/api/pagamento/criar-compra/route.ts`

## 🧪 Como Testar

### 1. Teste do Webhook
```bash
curl -X POST http://localhost:3000/api/pagamento/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": {
      "id": "123456789"
    }
  }'
```

### 2. Verificar Logs
Agora o webhook deve retornar logs detalhados:
- ✅ Estrutura correta do Next.js
- ✅ Validação de variáveis de ambiente
- ✅ Processamento do pagamento
- ✅ Atualização no banco de dados

## 📋 Resposta Esperada

### Sucesso (200):
```json
{
  "received": true,
  "message": "Status atualizado para pago",
  "orderId": "123"
}
```

### Erro de Configuração (500):
```json
{
  "error": "Configuração do Mercado Pago não encontrada"
}
```

## 🎯 Benefícios da Correção

1. **Compatibilidade**: Agora usa a estrutura correta do Next.js 13+
2. **Performance**: App Router é mais rápido e eficiente
3. **Manutenibilidade**: Código mais limpo e organizado
4. **Funcionalidade**: Webhook agora funciona corretamente

## 🔍 Troubleshooting

Se ainda houver problemas:

1. **Verificar estrutura**: Confirme que os arquivos estão em `src/app/api/`
2. **Reiniciar servidor**: `npm run dev`
3. **Verificar logs**: Monitore o console para erros
4. **Testar endpoints**: Use curl ou Postman para testar

## 📝 Próximos Passos

1. **Teste completo** do fluxo de pagamento
2. **Configuração** no painel do Mercado Pago
3. **Monitoramento** dos logs em produção
4. **Otimização** se necessário

## ⚠️ Importante

- **Não delete** a pasta `src/pages/api` ainda (pode haver outras rotas)
- **Teste** todas as funcionalidades antes de remover
- **Configure** as variáveis de ambiente corretamente
- **Monitore** os logs para garantir funcionamento
