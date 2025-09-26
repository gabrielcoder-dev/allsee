-- Tabela temporária para armazenar chunks durante upload
CREATE TABLE IF NOT EXISTS chunks_temp (
  id SERIAL PRIMARY KEY,
  arte_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_data TEXT NOT NULL,
  total_chunks INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(arte_id, chunk_index)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_chunks_temp_arte_id ON chunks_temp(arte_id);
CREATE INDEX IF NOT EXISTS idx_chunks_temp_created_at ON chunks_temp(created_at);

-- Política para permitir inserção/leitura de chunks
CREATE POLICY "Permitir operações em chunks_temp" ON chunks_temp
FOR ALL USING (true);

-- Limpeza automática de chunks antigos (opcional)
-- Esta função pode ser chamada periodicamente para limpar chunks órfãos
CREATE OR REPLACE FUNCTION cleanup_old_chunks()
RETURNS void AS $$
BEGIN
  DELETE FROM chunks_temp 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
