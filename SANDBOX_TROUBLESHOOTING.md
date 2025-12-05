# 🔧 Guia Rápido: Como Resolver Problemas no Sandbox do ASAAS

## ⚠️ Problema: Erro ao criar pagamento PIX no sandbox

Se você está vendo erros como:
- "Erro ao criar pagamento PIX"
- "A chave de API não pertence a este ambiente"
- "Erro de ambiente: A chave de API não corresponde ao ambiente configurado"

## ✅ Solução Passo a Passo

### Passo 1: Verificar as Variáveis de Ambiente

Verifique se você tem as seguintes variáveis configuradas:

```env
ASAAS_ENVIRONMENT=sandbox
KEY_API_ASAAS=sua_chave_de_sandbox_aqui
```

**Onde configurar:**
- **Desenvolvimento local:** Arquivo `.env.local` na raiz do projeto
- **Vercel/Produção:** Painel do Vercel → Settings → Environment Variables

### Passo 2: Obter uma Chave de API do Sandbox

1. **Acesse o Sandbox do Asaas:**
   - 🌐 URL: https://sandbox.asaas.com/
   - ⚠️ **IMPORTANTE:** Esta é uma conta SEPARADA da produção!

2. **Crie uma conta (se ainda não tem):**
   - Clique em "Cadastrar"
   - Preencha os dados
   - A aprovação é automática no sandbox

3. **Faça login** na sua conta do sandbox

4. **Gere uma chave de API:**
   - No menu, vá em **Integrações** → **API**
   - Ou: **Configurações** → **Integrações** → **API**
   - Clique em **"Gerar nova chave de API"** ou **"Criar chave"**
   - ⚠️ Copie a chave COMPLETA (ela será longa, cerca de 40-50 caracteres)
   - Exemplo de formato: `$aact_YTU5YTE0M2M2N2I4MTIxY...` (continua)

### Passo 3: Configurar a Chave

1. **No arquivo `.env.local`** (desenvolvimento local):
   ```env
   ASAAS_ENVIRONMENT=sandbox
   KEY_API_ASAAS=$aact_YTU5YTE0M2M2N2I4MTIxY...sua_chave_completa_aqui
   ```

2. **No Vercel** (produção/staging):
   - Vá em Settings → Environment Variables
   - Adicione ou edite:
     - `ASAAS_ENVIRONMENT` = `sandbox`
     - `KEY_API_ASAAS` = `sua_chave_completa_aqui`

### Passo 4: Reiniciar o Servidor

**⚠️ IMPORTANTE:** Sempre reinicie o servidor após alterar variáveis de ambiente!

- **Desenvolvimento local:**
  1. Pare o servidor (pressione `Ctrl+C` no terminal)
  2. Inicie novamente: `npm run dev`

- **Vercel:**
  - Faça um novo deploy ou aguarde alguns minutos para as variáveis serem aplicadas

### Passo 5: Validar a Configuração

Use o endpoint de validação para testar:

```bash
# No navegador, acesse:
http://localhost:3000/api/asaas/validate-config

# Ou via curl:
curl http://localhost:3000/api/asaas/validate-config
```

**Resposta esperada (sucesso):**
```json
{
  "valid": true,
  "config": {
    "environment": "sandbox",
    "apiUrl": "https://sandbox.asaas.com/api/v3",
    "hasApiKey": true,
    "apiKeyLength": 45
  },
  "message": "Configuração do ASAAS está válida!"
}
```

**Se houver erro**, a resposta mostrará instruções específicas para resolver.

## 🔍 Checklist Rápido

Marque cada item conforme verificar:

- [ ] Tenho uma conta no sandbox do Asaas (https://sandbox.asaas.com/)
- [ ] Gerei uma chave de API no painel do sandbox
- [ ] Copiei a chave COMPLETA (sem cortes)
- [ ] Configurei `ASAAS_ENVIRONMENT=sandbox` no `.env.local` ou Vercel
- [ ] Configurei `KEY_API_ASAAS` com a chave de sandbox
- [ ] Não há espaços antes ou depois da chave
- [ ] Reiniciei o servidor após configurar as variáveis
- [ ] O endpoint `/api/asaas/validate-config` retorna `valid: true`

## 🚨 Erros Comuns e Soluções

### Erro: "KEY_API_ASAAS não configurada"

**Causa:** A variável de ambiente não está definida.

**Solução:**
1. Verifique se o arquivo `.env.local` existe na raiz do projeto
2. Adicione a linha: `KEY_API_ASAAS=sua_chave_aqui`
3. Reinicie o servidor

### Erro: "A chave de API não pertence ao ambiente sandbox"

**Causa:** Você está usando uma chave de produção no ambiente sandbox (ou vice-versa).

**Solução:**
1. Certifique-se de que está logado em https://sandbox.asaas.com/
2. Gere uma nova chave de API no sandbox
3. Use essa chave para `KEY_API_ASAAS`
4. Configure `ASAAS_ENVIRONMENT=sandbox`
5. Reinicie o servidor

### Erro: "Chave de API inválida (formato muito curto)"

**Causa:** A chave foi copiada incompleta ou está incorreta.

**Solução:**
1. Volte ao painel do Asaas
2. Gere uma nova chave de API
3. Copie a chave COMPLETA (começa com `$aact_` e continua por ~45 caracteres)
4. Cole no `.env.local` sem espaços extras

### Erro: Status 500 no servidor

**Causa:** Erro ao conectar com a API do Asaas.

**Solução:**
1. Verifique sua conexão com a internet
2. Verifique se o servidor do Asaas está online
3. Teste o endpoint de validação: `/api/asaas/validate-config`
4. Verifique os logs do servidor para mais detalhes

## 💡 Dicas

1. **Use sempre o sandbox para testes:**
   - Não há cobranças reais
   - Aprovação automática de conta
   - Ideal para desenvolvimento

2. **Mantenha chaves separadas:**
   - Nunca use chave de produção no desenvolvimento
   - Use diferentes arquivos `.env` se necessário

3. **Verifique os logs:**
   - O servidor mostra logs detalhados sobre a configuração
   - Procure por "CONFIGURAÇÃO ASAAS" nos logs

4. **Teste primeiro:**
   - Sempre valide a configuração antes de tentar criar pagamentos reais
   - Use o endpoint `/api/asaas/validate-config`

## 📞 Ainda com Problemas?

1. Verifique os logs do servidor para mais detalhes
2. Use o endpoint `/api/asaas/validate-config` para diagnóstico
3. Verifique a documentação completa em `ASAAS_INTEGRATION.md`
4. Consulte a documentação oficial do Asaas: https://docs.asaas.com/

## 🔗 Links Úteis

- Sandbox do Asaas: https://sandbox.asaas.com/
- Documentação do Asaas: https://docs.asaas.com/
- Endpoint de validação: `/api/asaas/validate-config`
