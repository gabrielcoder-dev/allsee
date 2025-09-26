import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Armazenamento temporário de chunks usando arquivos temporários
import fs from 'fs';
import path from 'path';
import os from 'os';

const tempDir = path.join(os.tmpdir(), 'allsee-chunks');

// Criar diretório temporário se não existir
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Função para salvar chunk em arquivo
const saveChunk = (arteId: string, chunkIndex: number, chunkData: string) => {
  const chunkFile = path.join(tempDir, `${arteId}_chunk_${chunkIndex}.tmp`);
  fs.writeFileSync(chunkFile, chunkData);
};

// Função para ler chunk do arquivo
const readChunk = (arteId: string, chunkIndex: number): string | null => {
  const chunkFile = path.join(tempDir, `${arteId}_chunk_${chunkIndex}.tmp`);
  if (fs.existsSync(chunkFile)) {
    return fs.readFileSync(chunkFile, 'utf8');
  }
  return null;
};

// Função para verificar chunks recebidos
const getReceivedChunks = (arteId: string, totalChunks: number): number => {
  let received = 0;
  for (let i = 0; i < totalChunks; i++) {
    if (readChunk(arteId, i)) {
      received++;
    }
  }
  return received;
};

// Função para limpar chunks temporários
const cleanupChunks = (arteId: string, totalChunks: number) => {
  for (let i = 0; i < totalChunks; i++) {
    const chunkFile = path.join(tempDir, `${arteId}_chunk_${i}.tmp`);
    if (fs.existsSync(chunkFile)) {
      fs.unlinkSync(chunkFile);
    }
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { arte_campanha_id, chunk_index, chunk_data, total_chunks } = req.body;
    
    if (!arte_campanha_id || chunk_index === undefined || !chunk_data || !total_chunks) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campos obrigatórios faltando para chunk' 
      });
    }

    console.log(`📦 Recebendo chunk ${chunk_index + 1}/${total_chunks} para arte ${arte_campanha_id}`);

    // Salvar chunk em arquivo temporário
    saveChunk(arte_campanha_id, chunk_index, chunk_data);

    // Se é o último chunk, reconstruir e salvar
    if (chunk_index === total_chunks - 1) {
      console.log('🔧 Reconstruindo arquivo completo...');
      
      // Verificar se todos os chunks foram recebidos
      const receivedChunks = getReceivedChunks(arte_campanha_id, total_chunks);
      if (receivedChunks !== total_chunks) {
        console.error(`❌ Chunks faltando. Recebidos: ${receivedChunks}, Esperados: ${total_chunks}`);
        return res.status(400).json({ 
          success: false, 
          error: `Chunks faltando. Recebidos: ${receivedChunks}, Esperados: ${total_chunks}` 
        });
      }

      // Reconstruir arquivo completo lendo todos os chunks
      let fullData = '';
      for (let i = 0; i < total_chunks; i++) {
        const chunkData = readChunk(arte_campanha_id, i);
        if (!chunkData) {
          console.error(`❌ Chunk ${i} não encontrado`);
          return res.status(400).json({ 
            success: false, 
            error: `Chunk ${i} não encontrado` 
          });
        }
        fullData += chunkData;
      }
      
      console.log('💾 Salvando arquivo completo:', {
        arteId: arte_campanha_id,
        sizeMB: Math.round(fullData.length / (1024 * 1024))
      });

      // Salvar no banco
      const { data: updatedRecord, error: updateError } = await supabase
        .from('arte_campanha')
        .update({ caminho_imagem: fullData })
        .eq('id', arte_campanha_id)
        .select('id, id_order, id_user')
        .single();

      if (updateError) {
        console.error('❌ Erro ao salvar arquivo completo:', updateError);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao salvar arquivo completo' 
        });
      }

      // Limpar arquivos temporários
      cleanupChunks(arte_campanha_id, total_chunks);

      console.log('✅ Arquivo completo salvo com sucesso:', {
        id: updatedRecord.id,
        sizeMB: Math.round(fullData.length / (1024 * 1024))
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Arquivo completo salvo com sucesso',
        arte_campanha_id: updatedRecord.id
      });
    } else {
      // Chunk intermediário
      const receivedChunks = getReceivedChunks(arte_campanha_id, total_chunks);
      return res.status(200).json({ 
        success: true, 
        message: `Chunk ${chunk_index + 1}/${total_chunks} recebido`,
        receivedChunks: receivedChunks,
        totalChunks: total_chunks
      });
    }

  } catch (error: any) {
    console.error("❌ Erro no endpoint upload-chunk:", error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb', // 1MB por chunk + overhead
      timeout: 30000, // 30 segundos
    },
    responseLimit: '1mb',
  },
};
