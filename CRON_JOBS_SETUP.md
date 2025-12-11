# Configuração de Cron Jobs na Vercel

## ⚠️ Problema Identificado

O deploy estava falhando porque o plano **Hobby** da Vercel tem limitações:
- **Apenas 2 cron jobs** por conta
- **Cron jobs só podem executar uma vez por dia** (não a cada hora)

O cron job configurado estava tentando executar a cada hora (`0 * * * *`), o que não é permitido no plano Hobby.

## ✅ Solução: Configurar via Dashboard do Vercel

### Passo 1: Fazer o Deploy Primeiro
O `vercel.json` foi limpo para permitir o deploy. Faça o deploy normalmente.

### Passo 2: Configurar Cron Job no Dashboard

1. Acesse seu projeto no [Dashboard da Vercel](https://vercel.com/dashboard)
2. Vá em **Settings** → **Cron Jobs**
3. Clique em **Add Cron Job**

**Configuração do Cron Job:**
- **Path:** `/api/admin/limpar-tudo`
- **Schedule:** `0 0 * * *` (executa uma vez por dia à meia-noite)
- **Description:** "Limpeza automática de orders draft e campanhas expiradas"

### Passo 3: Alternativa - Executar Manualmente

Se preferir não usar cron jobs, você pode:

1. **Chamar manualmente via API:**
   ```bash
   curl https://seu-dominio.vercel.app/api/admin/limpar-tudo
   ```

2. **Ou criar um botão no dashboard admin** para executar manualmente quando necessário.

## 📋 Limitações por Plano

### Hobby (Gratuito)
- ✅ 2 cron jobs
- ⚠️ Execução: **Uma vez por dia**
- ⚠️ Schedule permitido: `0 0 * * *` (meia-noite)

### Pro ($20/mês)
- ✅ 40 cron jobs
- ✅ Execução: **Ilimitada**
- ✅ Schedule: Qualquer frequência

### Enterprise
- ✅ 100 cron jobs
- ✅ Execução: **Ilimitada**
- ✅ Schedule: Qualquer frequência

## 🔧 Endpoint de Limpeza

O endpoint `/api/admin/limpar-tudo` faz duas limpezas:

1. **Orders Draft:** Deleta orders com status "draft" criadas há mais de 1 hora
2. **Campanhas Expiradas:** Deleta campanhas que já passaram do tempo de duração

**Métodos aceitos:** GET e POST

## 💡 Recomendação

Para o plano Hobby, execute o cron job **uma vez por dia à meia-noite**. Isso é suficiente para manter o sistema limpo, já que:
- Orders draft são deletadas após 1 hora (então não acumulam muito)
- Campanhas expiradas podem esperar até 24h para serem deletadas

Se precisar de limpeza mais frequente, considere fazer upgrade para o plano Pro.

