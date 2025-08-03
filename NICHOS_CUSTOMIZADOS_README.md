# Nichos Customizados - Configuração

## 📋 Pré-requisitos

Para usar a funcionalidade de nichos customizados, você precisa criar uma tabela no banco de dados Supabase.

## 🗄️ Configuração do Banco de Dados

### 1. Execute o SQL no Supabase

Execute o seguinte SQL no seu projeto Supabase (Dashboard > SQL Editor):

```sql
-- Criar tabela para nichos customizados
CREATE TABLE IF NOT EXISTS nichos_customizados (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_nichos_customizados_nome ON nichos_customizados(nome);

-- Inserir alguns nichos padrão se a tabela estiver vazia
INSERT INTO nichos_customizados (nome) 
SELECT * FROM (VALUES 
  ('Farmácia'),
  ('Pet Shop'),
  ('Salão de Beleza'),
  ('Clínica Médica'),
  ('Escola'),
  ('Hotel'),
  ('Loja de Roupas'),
  ('Pizzaria'),
  ('Lanchonete'),
  ('Ótica')
) AS v(nome)
WHERE NOT EXISTS (SELECT 1 FROM nichos_customizados);
```

### 2. Configurar Políticas de Segurança (RLS)

No Supabase Dashboard, vá para Authentication > Policies e adicione as seguintes políticas:

```sql
-- Permitir leitura para todos os usuários autenticados
CREATE POLICY "Permitir leitura de nichos customizados" ON nichos_customizados
FOR SELECT USING (auth.role() = 'authenticated');

-- Permitir inserção para usuários autenticados
CREATE POLICY "Permitir inserção de nichos customizados" ON nichos_customizados
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

## 🚀 Funcionalidades Implementadas

### 1. Cadastro de Totens
- **Localização**: `src/Components/ModalCreateAnuncios.tsx`
- **Funcionalidade**: Adicionar novos segmentos durante o cadastro de totens
- **Botão**: "+ Adicionar segmento" abaixo dos nichos padrão

### 2. Seleção de Nicho da Empresa
- **Localização**: `src/Components/ModalNichoEmpresa.tsx`
- **Funcionalidade**: Mostra nichos customizados na seleção de segmento da empresa
- **Integração**: Nichos customizados aparecem junto com os padrão

## 📝 Como Usar

### Para Administradores:
1. Execute o SQL no Supabase
2. Configure as políticas de segurança
3. Os nichos customizados aparecerão automaticamente nos formulários

### Para Usuários:
1. **Cadastro de Totens**: Clique em "+ Adicionar segmento" para criar novos nichos
2. **Seleção de Nicho**: Os nichos customizados aparecem na lista de opções

## 🔧 Estrutura da Tabela

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | SERIAL | Chave primária auto-incrementada |
| `nome` | VARCHAR(100) | Nome do nicho/segmento (único) |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

## ⚠️ Importante

- **Execute o SQL primeiro** antes de testar a funcionalidade
- **Configure as políticas RLS** para permitir acesso aos usuários
- **Os nichos customizados são globais** e aparecem para todos os usuários
- **Nomes duplicados não são permitidos** (constraint UNIQUE)

## 🐛 Troubleshooting

Se os nichos customizados não aparecerem:

1. Verifique se a tabela `nichos_customizados` foi criada
2. Confirme se as políticas RLS estão configuradas
3. Verifique os logs do console para erros
4. Teste a conexão com o Supabase 