# Proteção de Rota Admin - Dashboard

## Implementação Simplificada

Foi implementada uma proteção básica para a rota `/dashboard` focada na experiência do usuário.

### Componentes Criados/Modificados:

#### 1. Hook `useUserRole` (`src/hooks/useUserRole.ts`)
- Verifica o role do usuário autenticado na tabela `profiles`
- Retorna `isAdmin: boolean`, `userRole: string | null`, `isLoading: boolean`
- Escuta mudanças na autenticação automaticamente

#### 2. Menu Modal (`src/Components/ModalMenu.tsx`)
- Botão "Dashboard" só aparece para usuários admin
- Usa hook `useUserRole` para verificação

#### 3. Middleware (`middleware.ts`)
- Adicionada proteção básica para rota `/dashboard`
- Verifica se usuário está autenticado antes de permitir acesso

### Como Funciona:

1. **Verificação de Autenticação**: O middleware verifica se existe token de acesso
2. **Proteção de UI**: O botão de dashboard só aparece no menu para admins
3. **Acesso Direto**: Usuários podem acessar `/dashboard` diretamente se autenticados

### Estrutura da Tabela `profiles`:

```sql
-- A tabela profiles deve ter um campo 'role'
-- Exemplo de estrutura:
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nicho TEXT,
  role TEXT DEFAULT 'user', -- 'admin' ou 'user'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Para Tornar um Usuário Admin:

```sql
-- Atualizar o role do usuário para 'admin'
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'user-uuid-here';
```

### Testando a Implementação:

1. **Usuário Normal**: Não vê botão dashboard no menu
2. **Usuário Admin**: Vê botão dashboard no menu
3. **Usuário Não Autenticado**: É redirecionado para login antes de qualquer verificação

### Segurança:

- ✅ Verificação de autenticação no middleware
- ✅ Proteção de UI (botão oculto)
- ✅ Acesso controlado pela interface
