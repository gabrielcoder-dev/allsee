# Sistema de Cadastro com Nicho da Empresa

## O que foi implementado:

### 1. Modal Obrigatório de Nicho
- **Arquivo**: `src/Components/ModalNichoEmpresa.tsx`
- **Funcionalidade**: Modal que aparece após o primeiro cadastro/login
- **Opções**: Restaurante, Academia, Comércio, Outro
- **Comportamento**: Não pode ser fechado até escolher um nicho

### 2. Lógica na Página Results
- **Arquivo**: `src/app/(public)/results/page.tsx`
- **Funcionalidade**: Verifica se é primeiro acesso e mostra o modal
- **Trigger**: Quando usuário acessa `/results` pela primeira vez

### 3. Banco de Dados
- **Tabela**: `profiles`
- **Coluna**: `nicho` (restaurante, academia, mercado, padaria, banco, outro)
- **Script**: `create_profiles_table.sql`

## Como testar:

### 1. Configurar Banco de Dados
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Execute o script `create_profiles_table.sql`

### 2. Testar o Fluxo
1. **Cadastro novo usuário**:
   - Vá para `/results`
   - Faça login/cadastro (Google ou email/senha)
   - O modal deve aparecer automaticamente
   - Escolha um nicho
   - Modal deve fechar e salvar no banco

2. **Usuário existente**:
   - Se já tem nicho: não aparece modal
   - Se não tem nicho: aparece modal obrigatório

### 3. Verificar no Banco
```sql
-- Verificar se o nicho foi salvo
SELECT id, email, nicho, created_at 
FROM profiles 
WHERE id = 'seu-user-id';
```

## Estrutura da Tabela Profiles:
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id), -- ID do usuário (vem automaticamente do auth.users)
    email TEXT, -- Email do usuário
    nicho TEXT CHECK (nicho IN ('restaurante', 'academia', 'mercado', 'padaria', 'banco', 'outro')), -- Nicho escolhido
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Como funciona:
1. **ID do usuário**: Vem automaticamente do `auth.users` quando o usuário se cadastra
2. **Nicho**: É salvo quando o usuário escolhe no modal
3. **Relacionamento**: Cada profile está vinculado ao usuário pelo `id`

## Fluxo Completo:
1. Usuário se cadastra/login
2. É redirecionado para `/results`
3. Sistema verifica se tem nicho no profile
4. Se não tem: mostra modal obrigatório
5. Usuário escolhe nicho
6. Nicho é salvo na tabela `profiles`
7. Modal fecha e usuário pode usar o sistema

## Observações:
- Modal não pode ser fechado sem escolher nicho
- Nicho é obrigatório para primeiro acesso
- Dados são salvos com segurança (RLS ativo)
- Toast notifications para feedback do usuário 