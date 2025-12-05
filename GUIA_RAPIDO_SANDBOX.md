# 🎯 Guia Rápido: Configurar Chave do Sandbox

## ✅ Sim! Você precisa de uma chave de API do Sandbox

A chave que você tem agora provavelmente é de **produção**, e você precisa de uma chave de **sandbox**.

## 📝 Passo a Passo Simplificado

### 1. Acesse o Sandbox
🌐 **URL:** https://sandbox.asaas.com/

⚠️ **ATENÇÃO:** Este é um site DIFERENTE da produção!
- Produção: https://www.asaas.com/
- Sandbox: https://sandbox.asaas.com/

### 2. Crie uma Conta (se não tiver)
- Clique em "Cadastrar"
- Preencha os dados (pode usar qualquer email)
- A conta é aprovada **automaticamente** no sandbox ✅

### 3. Gere a Chave de API
1. Faça **login** no sandbox
2. No menu, vá em: **Integrações** → **API**
3. Clique em **"Gerar nova chave de API"** ou **"Criar chave"**
4. **Copie a chave COMPLETA** (é longa, começa com `$aact_...`)

### 4. Configure no Seu Projeto

**Arquivo `.env.local` na raiz do projeto:**

```env
ASAAS_ENVIRONMENT=sandbox
KEY_API_ASAAS=$aact_YTU5YTE0M2M2N2I4MTIxY...cole_a_chave_completa_aqui
```

**Exemplo:**
```env
ASAAS_ENVIRONMENT=sandbox
KEY_API_ASAAS=$aact_YTU5YTE0M2M2N2I4MTIxYjY5YzY3YjE2Y2Q4YzA4YzE2Y2Q4YzA4YzE2Y2Q4
```

### 5. Reinicie o Servidor

**⚠️ IMPORTANTE:** Sempre reinicie após alterar variáveis!

```bash
# Pare o servidor (Ctrl+C)
# Depois inicie novamente:
npm run dev
```

### 6. Teste se Funcionou

Acesse no navegador:
```
http://localhost:3000/api/asaas/validate-config
```

Se aparecer `"valid": true`, está tudo certo! ✅

## 🔑 Resumo

```
Chave ANTIGA (produção) → ❌ Não funciona no sandbox
Chave NOVA (sandbox) → ✅ Funciona no sandbox
```

## ⚡ Checklist

- [ ] Acessei https://sandbox.asaas.com/
- [ ] Criei/login na conta do sandbox
- [ ] Gerei uma nova chave de API no sandbox
- [ ] Copiei a chave COMPLETA (não cortada)
- [ ] Colei no `.env.local` como `KEY_API_ASAAS=...`
- [ ] Configurei `ASAAS_ENVIRONMENT=sandbox`
- [ ] Reiniciei o servidor
- [ ] Testei em `/api/asaas/validate-config`

## 🆘 Problemas Comuns

**"A chave não funciona"**
- Certifique-se de copiar a chave COMPLETA (é longa!)
- Verifique se está usando chave do SANDBOX (não produção)
- Reinicie o servidor após configurar

**"Não consigo gerar chave"**
- Faça login primeiro
- Verifique se está em https://sandbox.asaas.com/ (não www.asaas.com)

**"Erro 500"**
- Reinicie o servidor
- Verifique se não há espaços na chave
- Teste o endpoint de validação

## 🔗 Links

- Sandbox: https://sandbox.asaas.com/
- Endpoint de validação: `/api/asaas/validate-config`
