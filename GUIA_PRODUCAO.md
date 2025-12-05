# 🚀 Guia: Como Migrar do Sandbox para Produção

## 📋 Visão Geral

Agora que você testou no **sandbox**, quando estiver pronto para receber pagamentos reais, você precisa configurar o ambiente de **produção**.

## ⚠️ Diferenças Importantes

| Aspecto | Sandbox | Produção |
|---------|---------|----------|
| **URL** | https://sandbox.asaas.com/ | https://www.asaas.com/ |
| **Conta** | Gratuita, aprovada automaticamente | Requer aprovação real |
| **Pagamentos** | Simulados, sem dinheiro real | **REAIS, com dinheiro de verdade** 💰 |
| **Chave de API** | Chave de sandbox | Chave de produção (diferente!) |
| **Quando usar** | Testes e desenvolvimento | Aplicação em uso real |

## 🔄 Processo de Migração

### Passo 1: Verificar se Está Pronto para Produção

Antes de migrar, certifique-se de que:

- ✅ Todos os testes foram feitos no sandbox
- ✅ Os pagamentos estão sendo criados corretamente
- ✅ O webhook está funcionando
- ✅ Você tem uma conta **aprovada** no Asaas de produção
- ✅ Você está confiante de que tudo funciona

### Passo 2: Obter Chave de API de Produção

1. **Acesse o Painel de Produção:**
   - 🌐 URL: https://www.asaas.com/
   - ⚠️ **ATENÇÃO:** Este é o site de PRODUÇÃO (não sandbox!)

2. **Faça login** na sua conta de produção
   - Se não tiver conta, crie uma (pode demorar para aprovar)
   - Complete a documentação necessária para aprovação

3. **Gere uma Chave de API de Produção:**
   - No menu, vá em: **Integrações** → **API**
   - Clique em **"Gerar nova chave de API"** ou **"Criar chave"**
   - ⚠️ **IMPORTANTE:** Esta chave terá acesso a DINHEIRO REAL!
   - Copie a chave COMPLETA

### Passo 3: Configurar Variáveis de Ambiente

#### Para Vercel (Recomendado para Produção):

1. Acesse o painel do Vercel
2. Vá em seu projeto → **Settings** → **Environment Variables**
3. Para cada ambiente (Production, Preview, Development), configure:

   ```
   ASAAS_ENVIRONMENT=production
   KEY_API_ASAAS=$aact_...sua_chave_de_producao_completa
   ```

4. Certifique-se de que está aplicando para o ambiente correto:
   - ✅ **Production** - Para produção (onde usuários reais usam)
   - ⚠️ **Preview/Development** - Pode manter como `sandbox` para testes

#### Para Desenvolvimento Local:

**Opção A: Manter sandbox localmente**
- Mantenha `.env.local` com sandbox para testes
- Use produção apenas no Vercel

**Opção B: Ter ambos disponíveis**
- Crie `.env.production` para produção (não commitar!)
- Use `.env.local` para desenvolvimento (sandbox)

### Passo 4: Configurar o Webhook em Produção

⚠️ **CRÍTICO:** Configure o webhook no painel de produção!

1. No painel do Asaas de produção, vá em: **Integrações** → **Webhooks**
2. Adicione um novo webhook:
   - **URL:** `https://seu-dominio-vercel.com/api/asaas/webhook`
   - **Eventos a receber:**
     - ✅ `PAYMENT_RECEIVED` (pagamento recebido)
     - ✅ `PAYMENT_OVERDUE` (pagamento vencido)
     - ✅ `PAYMENT_DELETED` (pagamento deletado)
     - ✅ `PAYMENT_RESTORED` (pagamento restaurado)
     - ✅ Outros eventos que você precisar

3. Salve o webhook

### Passo 5: Testar em Produção (Com Cuidado!)

⚠️ **ATENÇÃO:** Em produção, você estará criando pagamentos REAIS!

1. **Faça um teste pequeno primeiro:**
   - Crie um pedido com valor muito baixo (ex: R$ 0,10)
   - Verifique se o pagamento é criado corretamente
   - Verifique se o webhook funciona

2. **Valide usando o endpoint:**
   ```
   https://seu-dominio.com/api/asaas/validate-config
   ```
   Deve retornar `"environment": "production"` e `"valid": true`

3. **Monitore os logs:**
   - Verifique os logs do Vercel
   - Verifique os logs do webhook no painel do Asaas
   - Certifique-se de que tudo está funcionando

## 🔧 Configuração por Ambiente

### Desenvolvimento (Local)
```env
# .env.local
ASAAS_ENVIRONMENT=sandbox
KEY_API_ASAAS=$aact_...chave_de_sandbox
```

### Produção (Vercel)
```
ASAAS_ENVIRONMENT=production
KEY_API_ASAAS=$aact_...chave_de_producao
```

## 📝 Checklist Antes de Ir para Produção

Marque cada item:

- [ ] Testei tudo extensivamente no sandbox
- [ ] Tenho uma conta aprovada no Asaas de produção
- [ ] Gerei uma chave de API de produção
- [ ] Configurei `ASAAS_ENVIRONMENT=production` no Vercel
- [ ] Configurei `KEY_API_ASAAS` com a chave de produção no Vercel
- [ ] Configurei o webhook no painel de produção
- [ ] Testei o endpoint `/api/asaas/validate-config` em produção
- [ ] Fiz um teste pequeno com pagamento real
- [ ] Verifiquei que os logs estão funcionando
- [ ] Tenho acesso aos logs do Vercel para monitorar

## 🎯 Estratégia Recomendada

### Durante Desenvolvimento:
- **Local:** Sandbox (`.env.local`)
- **Vercel Preview:** Sandbox (para testes em PRs)
- **Vercel Production:** Produção (apenas quando estiver pronto)

### Após Deploy em Produção:
- **Local:** Mantém sandbox para desenvolvimento
- **Vercel Preview:** Pode manter sandbox ou usar produção (dependendo da necessidade)
- **Vercel Production:** Produção

## 🔐 Segurança

⚠️ **NUNCA faça isso:**

- ❌ Commitar chaves de API no código
- ❌ Compartilhar chaves de produção
- ❌ Usar chave de produção em desenvolvimento
- ❌ Deixar chaves expostas em repositórios públicos

✅ **SEMPRE faça:**

- ✅ Usar variáveis de ambiente
- ✅ Manter chaves secretas
- ✅ Revisar variáveis antes de cada deploy
- ✅ Testar no sandbox antes de produção
- ✅ Ter backup das configurações (sem expor chaves)

## 🔄 Voltar para Sandbox (se necessário)

Se precisar voltar para sandbox temporariamente:

1. No Vercel, altere:
   ```
   ASAAS_ENVIRONMENT=sandbox
   KEY_API_ASAAS=chave_de_sandbox
   ```
2. Faça um novo deploy
3. Aguarde alguns minutos para aplicar

## 📊 Monitoramento em Produção

Depois de ir para produção, monitore:

1. **Logs do Vercel:**
   - Verifique erros nas chamadas à API
   - Monitore tempo de resposta

2. **Painel do Asaas:**
   - Verifique pagamentos criados
   - Monitore status dos pagamentos
   - Verifique logs do webhook

3. **Logs da Aplicação:**
   - Monitore erros em produção
   - Verifique se os pagamentos estão sendo processados

## 🆘 Em Caso de Problemas

### Erro: "Chave não pertence ao ambiente production"
- Verifique se está usando a chave de produção
- Verifique se `ASAAS_ENVIRONMENT=production`

### Webhook não está funcionando
- Verifique se a URL está correta e acessível
- Verifique os logs do webhook no painel do Asaas
- Certifique-se de que a rota `/api/asaas/webhook` está funcionando

### Pagamento não está sendo criado
- Verifique os logs do servidor
- Verifique se a chave de API está correta
- Teste o endpoint de validação

## 📞 Próximos Passos

1. ✅ Complete os testes no sandbox
2. ✅ Obtenha aprovação da conta de produção (se necessário)
3. ✅ Configure as variáveis no Vercel
4. ✅ Configure o webhook
5. ✅ Faça um teste pequeno
6. ✅ Monitore os primeiros pagamentos

## 🔗 Links Úteis

- **Painel de Produção:** https://www.asaas.com/
- **Documentação Asaas:** https://docs.asaas.com/
- **Sandbox (para testes):** https://sandbox.asaas.com/
- **Endpoint de validação:** `/api/asaas/validate-config`

---

**💡 Dica Final:** Sempre teste primeiro no sandbox antes de fazer mudanças em produção. É melhor encontrar problemas em um ambiente de teste do que com dinheiro real!
