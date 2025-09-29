# URLs de Redirecionamento para Google OAuth + Supabase

## URLs que você precisa configurar no Google Cloud Console

### 1. URL Principal do Supabase
```
https://<seu-projeto>.supabase.co/auth/v1/callback
```

### 2. URL para Domínio Próprio
```
https://allseeads.com.br/auth/callback
```

## Como obter as URLs corretas:

### Passo 1: Obter a URL do seu projeto Supabase
1. Acesse o painel do Supabase
2. Vá em **Authentication** → **Providers**
3. Ative o **Google** provider
4. Copie a URL de callback que aparece no painel

### Passo 2: Configurar no Google Cloud Console
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Vá em **APIs & Services** → **Credentials**
3. Selecione seu projeto OAuth 2.0
4. Em **URIs de redirecionamento autorizados**, adicione as URLs:

#### Para desenvolvimento local:
```
http://localhost:3000/auth/callback
```

#### Para produção:
```
https://<seu-projeto>.supabase.co/auth/v1/callback
https://allseeads.com.br/auth/callback
```

## Exemplo prático:

Se seu projeto Supabase for `allsee-prod-123`, as URLs seriam:
```
https://allsee-prod-123.supabase.co/auth/v1/callback
```

Com seu domínio `allseeads.com.br`:
```
https://allseeads.com.br/auth/callback
```

## URLs para diferentes ambientes:

### Desenvolvimento:
- `http://localhost:3000/auth/callback`
- `https://<seu-projeto>.supabase.co/auth/v1/callback`

### Produção:
- `https://allseeads.com.br/auth/callback`
- `https://<seu-projeto>.supabase.co/auth/v1/callback`

## ⚠️ Importante:
- Substitua `<seu-projeto>` pela URL real do seu projeto Supabase
- Seu domínio `allseeads.com.br` já está configurado
- Certifique-se de que as URLs sejam exatamente iguais no Google Cloud e no Supabase
- Teste sempre em ambiente de desenvolvimento primeiro
