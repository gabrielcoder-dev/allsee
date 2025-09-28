import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Salvar chunk diretamente no banco usando uma tabela temporária
    const { error: chunkError } = await supabase
      .from('chunks_temp')
      .upsert({
        arte_id: arte_campanha_id,
        chunk_index: chunk_index,
        chunk_data: chunk_data,
        total_chunks: total_chunks,
        created_at: new Date().toISOString()
      });

    if (chunkError) {
      console.error('❌ Erro ao salvar chunk:', chunkError);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao salvar chunk' 
      });
    }

    // Se é o último chunk, reconstruir e salvar
    if (chunk_index === total_chunks - 1) {
      console.log('🔧 Reconstruindo arquivo completo...');
      
      // Buscar todos os chunks do banco
      const { data: chunks, error: fetchError } = await supabase
        .from('chunks_temp')
        .select('chunk_index, chunk_data')
        .eq('arte_id', arte_campanha_id)
        .order('chunk_index');

      if (fetchError) {
        console.error('❌ Erro ao buscar chunks:', fetchError);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao buscar chunks' 
        });
      }

      // Verificar se todos os chunks foram recebidos
      if (chunks.length !== total_chunks) {
        console.error(`❌ Chunks faltando. Recebidos: ${chunks.length}, Esperados: ${total_chunks}`);
        return res.status(400).json({ 
          success: false, 
          error: `Chunks faltando. Recebidos: ${chunks.length}, Esperados: ${total_chunks}` 
        });
      }

      // Reconstruir arquivo completo
      const fullData = chunks.map(c => c.chunk_data).join('');
      
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

      // Limpar chunks temporários
      await supabase
        .from('chunks_temp')
        .delete()
        .eq('arte_id', arte_campanha_id);

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
      // Chunk intermediário - contar chunks recebidos
      const { data: receivedChunks, error: countError } = await supabase
        .from('chunks_temp')
        .select('chunk_index')
        .eq('arte_id', arte_campanha_id);

      if (countError) {
        console.error('❌ Erro ao contar chunks:', countError);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao contar chunks' 
        });
      }

      return res.status(200).json({ 
        success: true, 
        message: `Chunk ${chunk_index + 1}/${total_chunks} recebido`,
        receivedChunks: receivedChunks.length,
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
      sizeLimit: '6mb', // 5MB por chunk + overhead base64
      timeout: 30000, // 30 segundos
    },
    responseLimit: '1mb',
  },
};
