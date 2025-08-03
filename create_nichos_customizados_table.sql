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

-- Comentário sobre a tabela
COMMENT ON TABLE nichos_customizados IS 'Tabela para armazenar nichos/segmentos customizados criados pelos usuários';
COMMENT ON COLUMN nichos_customizados.nome IS 'Nome do nicho/segmento customizado'; 