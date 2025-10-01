# 🔧 CONFIGURAÇÃO DO SUPABASE PARA GOOGLE OAUTH

## ❌ PROBLEMA IDENTIFICADO
O Google OAuth não está funcionando porque as variáveis de ambiente do Supabase não estão configuradas.

## ✅ SOLUÇÃO RÁPIDA

### 1. Criar arquivo `.env.local` na raiz do projeto
Crie um arquivo chamado `.env.local` na pasta raiz do seu projeto (mesmo nível do `package.json`) com o seguinte conteúdo:

```env
# Substitua pelos seus valores reais do Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

### 2. Como obter as credenciais do Supabase:
1. Acesse [supabase.com](https://supabase.com)
2. Faça login na sua conta
3. Selecione seu projeto
4. Vá em **Settings** > **API**
5. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Configurar Google OAuth no Supabase:
1. No painel do Supabase, vá em **Authentication** > **Providers**
2. Ative o **Google** provider
3. Configure:
   - **Client ID**: Obtenha no Google Cloud Console
   - **Client Secret**: Obtenha no Google Cloud Console
   - **Redirect URL**: `https://seu-projeto-id.supabase.co/auth/v1/callback`

### 4. Configurar Google Cloud Console:
1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto ou selecione um existente
3. Ative a **Google+ API**
4. Vá em **Credentials** > **Create Credentials** > **OAuth 2.0 Client IDs**
5. Configure:
   - **Application type**: Web application
   - **Authorized redirect URIs**: 
     - `https://seu-projeto-id.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (para desenvolvimento)

### 5. Reiniciar o servidor de desenvolvimento:
```bash
npm run dev
```

## 🔍 DEBUGGING
Após configurar, abra o console do navegador (F12) e verifique se:
- ✅ As variáveis de ambiente aparecem como "Configurado"
- ✅ A URL de redirecionamento é gerada corretamente
- ✅ O redirecionamento para accounts.google.com funciona

## ⚠️ IMPORTANTE
- Nunca commite o arquivo `.env.local` no Git
- Use URLs diferentes para desenvolvimento e produção
- Verifique se o domínio está autorizado no Google Console

## 🚨 CORREÇÕES IMPLEMENTADAS
- ✅ Adicionada validação das variáveis de ambiente
- ✅ Melhorado tratamento de erros
- ✅ Removido fechamento prematuro do modal
- ✅ Adicionados parâmetros extras no OAuth (`access_type: 'offline'`, `prompt: 'consent'`)
