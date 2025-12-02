# Configuração de Cron Jobs

## Problema Resolvido
Os cron jobs foram temporariamente removidos do `vercel.json` para permitir o deploy funcionar.

## Como Reconfigurar os Cron Jobs

### Opção 1: Via Dashboard do Vercel (Recomendado)
1. Acesse seu projeto no dashboard do Vercel
2. Vá em **Settings** → **Cron Jobs**
3. Clique em **Add Cron Job** e configure:

**Cron Job 1:**
- Path: `/api/admin/limpar-orders-draft`
- Schedule: `0 * * * *` (executa a cada hora)

**Cron Job 2:**
- Path: `/api/admin/limpar-campanhas-expiradas`
- Schedule: `0 * * * *` (executa a cada hora)

### Opção 2: Via vercel.json (Depois do Deploy)
Depois que o deploy estiver funcionando, você pode restaurar os cron jobs no `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/admin/limpar-orders-draft",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/admin/limpar-campanhas-expiradas",
      "schedule": "0 * * * *"
    }
  ]
}
```

## Endpoints de Cron Jobs
- `/api/admin/limpar-orders-draft` - Limpa orders com status "draft" com mais de 12 horas
- `/api/admin/limpar-campanhas-expiradas` - Limpa campanhas que já expiraram

Ambos os endpoints aceitam métodos GET e POST e têm validação opcional via `CRON_SECRET`.
