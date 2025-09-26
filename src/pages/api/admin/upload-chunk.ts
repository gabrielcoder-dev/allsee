import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Armazenamento temporário de chunks (em produção, usar Redis)
const chunkStorage = new Map<string, { chunks: string[], totalChunks: number, arteId: string }>();

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

    const chunkKey = `chunk_${arte_campanha_id}`;
    
    console.log(`📦 Recebendo chunk ${chunk_index + 1}/${total_chunks} para arte ${arte_campanha_id}`);

    // Inicializar ou atualizar storage de chunks
    if (!chunkStorage.has(chunkKey)) {
      chunkStorage.set(chunkKey, {
        chunks: new Array(total_chunks).fill(''),
        totalChunks: total_chunks,
        arteId: arte_campanha_id
      });
    }

    const chunkData = chunkStorage.get(chunkKey)!;
    chunkData.chunks[chunk_index] = chunk_data;

    // Se é o último chunk, reconstruir e salvar
    if (chunk_index === total_chunks - 1) {
      console.log('🔧 Reconstruindo arquivo completo...');
      
      // Verificar se todos os chunks foram recebidos
      const receivedChunks = chunkData.chunks.filter(c => c).length;
      if (receivedChunks !== total_chunks) {
        return res.status(400).json({ 
          success: false, 
          error: `Chunks faltando. Recebidos: ${receivedChunks}, Esperados: ${total_chunks}` 
        });
      }

      // Reconstruir arquivo completo
      const fullData = chunkData.chunks.join('');
      
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

      // Limpar dados temporários
      chunkStorage.delete(chunkKey);

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
      return res.status(200).json({ 
        success: true, 
        message: `Chunk ${chunk_index + 1}/${total_chunks} recebido`,
        receivedChunks: chunkData.chunks.filter(c => c).length,
        totalChunks: chunkData.totalChunks
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
