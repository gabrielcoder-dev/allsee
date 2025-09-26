-- Tabela temporária para armazenar chunks durante upload de arte de troca
CREATE TABLE IF NOT EXISTS chunks_temp_troca (
  id SERIAL PRIMARY KEY,
  arte_troca_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_data TEXT NOT NULL,
  total_chunks INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(arte_troca_id, chunk_index)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_chunks_temp_troca_arte_troca_id ON chunks_temp_troca(arte_troca_id);
CREATE INDEX IF NOT EXISTS idx_chunks_temp_troca_created_at ON chunks_temp_troca(created_at);

-- Política para permitir inserção/leitura de chunks de troca
CREATE POLICY "Permitir operações em chunks_temp_troca" ON chunks_temp_troca
FOR ALL USING (true);
