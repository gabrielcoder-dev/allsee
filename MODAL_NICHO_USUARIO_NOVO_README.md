# Modal de Nicho para Usuários Novos

## 📋 Descrição
O modal de escolha de nicho da empresa aparece automaticamente para usuários novos quando eles acessam a página `/results` pela primeira vez.

## 🔧 Como Funciona

### **1. Detecção de Usuário Novo**
- ✅ Verifica se o usuário está autenticado
- ✅ Busca na tabela `profiles` se já existe um registro para o usuário
- ✅ Se não existe profile OU se não tem nicho definido → **Usuário Novo**
- ✅ Se existe profile com nicho → **Usuário Existente**

### **2. Modal Automático**
- ✅ Aparece automaticamente para usuários novos
- ✅ Não pode ser fechado até escolher um nicho
- ✅ Salva o nicho na tabela `profiles`

### **3. Nichos Disponíveis**
- ✅ **Nichos Padrão**: Restaurante, Academia, Mercado, Padaria, Banco, Outro
- ✅ **Nichos Customizados**: Todos os nichos adicionados no banco de dados
- ✅ Carregamento automático dos nichos customizados

## 🗄️ Estrutura do Banco

### **Tabela `profiles`:**
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nicho TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Tabela `nichos_customizados`:**
```sql
CREATE TABLE nichos_customizados (
  id SERIAL PRIMARY KEY,
  nome TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🎯 Fluxo do Usuário Novo

1. **Usuário se cadastra** no sistema
2. **Acessa `/results`** pela primeira vez
3. **Modal aparece automaticamente** com todos os nichos
4. **Escolhe um nicho** (padrão ou customizado)
5. **Clica "Continuar"** para salvar
6. **Modal fecha** e usuário pode usar o sistema normalmente

## 🔍 Debug e Logs

### **Logs no Console:**
- `🔍 Verificando usuário: [user_id]`
- `📋 Profile encontrado: [profile_data]`
- `🆕 Usuário novo detectado - mostrando modal`
- `🔄 Carregando nichos customizados...`
- `✅ Nichos customizados carregados: [lista_nichos]`

### **Como Testar:**

1. **Criar usuário novo:**
   ```bash
   # Deletar profile existente (se houver)
   DELETE FROM profiles WHERE id = 'user_id';
   ```

2. **Verificar logs no console** do navegador

3. **Testar diferentes cenários:**
   - Usuário sem profile
   - Usuário com profile mas sem nicho
   - Usuário com profile e nicho

## 🚨 Problemas Comuns

### **Modal não aparece:**
- ✅ Verificar se usuário está autenticado
- ✅ Verificar se existe profile com nicho
- ✅ Verificar logs no console

### **Nichos customizados não carregam:**
- ✅ Verificar tabela `nichos_customizados`
- ✅ Verificar permissões RLS
- ✅ Verificar logs de carregamento

### **Erro ao salvar nicho:**
- ✅ Verificar se tabela `profiles` existe
- ✅ Verificar permissões de INSERT/UPDATE
- ✅ Verificar se usuário está autenticado

## 📁 Arquivos Envolvidos

- `src/app/(public)/results/page.tsx` - Lógica de detecção e renderização
- `src/Components/ModalNichoEmpresa.tsx` - Modal e carregamento de nichos
- `delete_nichos_customizados_policy.sql` - Policy para exclusão de nichos

## 🚀 Próximos Passos

1. **Teste com usuário novo** - Cadastre um usuário e acesse `/results`
2. **Verifique logs** - Abra o console do navegador
3. **Teste nichos customizados** - Adicione nichos no dashboard e teste no modal

---

**Status:** ✅ Implementado e funcionando 