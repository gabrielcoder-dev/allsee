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
    const { arte_troca_campanha_id, chunk_index, chunk_data, total_chunks } = req.body;
    
    if (!arte_troca_campanha_id || chunk_index === undefined || !chunk_data || !total_chunks) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campos obrigatórios faltando para chunk de troca' 
      });
    }

    console.log(`📦 Recebendo chunk de troca ${chunk_index + 1}/${total_chunks} para arte ${arte_troca_campanha_id}`);

    // Salvar chunk diretamente no banco usando uma tabela temporária para troca
    const { error: chunkError } = await supabase
      .from('chunks_temp_troca')
      .upsert({
        arte_troca_id: arte_troca_campanha_id,
        chunk_index: chunk_index,
        chunk_data: chunk_data,
        total_chunks: total_chunks,
        created_at: new Date().toISOString()
      });

    if (chunkError) {
      console.error('❌ Erro ao salvar chunk de troca:', chunkError);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao salvar chunk de troca' 
      });
    }

    // Se é o último chunk, reconstruir e salvar
    if (chunk_index === total_chunks - 1) {
      console.log('🔧 Reconstruindo arquivo de troca completo...');
      
      // Buscar todos os chunks do banco
      const { data: chunks, error: fetchError } = await supabase
        .from('chunks_temp_troca')
        .select('chunk_index, chunk_data')
        .eq('arte_troca_id', arte_troca_campanha_id)
        .order('chunk_index');

      if (fetchError) {
        console.error('❌ Erro ao buscar chunks de troca:', fetchError);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao buscar chunks de troca' 
        });
      }

      // Verificar se todos os chunks foram recebidos
      if (chunks.length !== total_chunks) {
        console.error(`❌ Chunks de troca faltando. Recebidos: ${chunks.length}, Esperados: ${total_chunks}`);
        return res.status(400).json({ 
          success: false, 
          error: `Chunks de troca faltando. Recebidos: ${chunks.length}, Esperados: ${total_chunks}` 
        });
      }

      // Reconstruir arquivo completo
      const fullData = chunks.map(c => c.chunk_data).join('');
      
      console.log('💾 Salvando arquivo de troca completo:', {
        arteTrocaId: arte_troca_campanha_id,
        sizeMB: Math.round(fullData.length / (1024 * 1024))
      });

      // Salvar no banco (arte_troca_campanha)
      const { data: updatedRecord, error: updateError } = await supabase
        .from('arte_troca_campanha')
        .update({ caminho_imagem: fullData })
        .eq('id', arte_troca_campanha_id)
        .select('id, id_order, id_user')
        .single();

      if (updateError) {
        console.error('❌ Erro ao salvar arquivo de troca completo:', updateError);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao salvar arquivo de troca completo' 
        });
      }

      // Limpar chunks temporários de troca
      await supabase
        .from('chunks_temp_troca')
        .delete()
        .eq('arte_troca_id', arte_troca_campanha_id);

      console.log('✅ Arquivo de troca completo salvo com sucesso:', {
        id: updatedRecord.id,
        sizeMB: Math.round(fullData.length / (1024 * 1024))
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Arquivo de troca completo salvo com sucesso',
        arte_troca_campanha_id: updatedRecord.id
      });
    } else {
      // Chunk intermediário - contar chunks recebidos
      const { data: receivedChunks, error: countError } = await supabase
        .from('chunks_temp_troca')
        .select('chunk_index')
        .eq('arte_troca_id', arte_troca_campanha_id);

      if (countError) {
        console.error('❌ Erro ao contar chunks de troca:', countError);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao contar chunks de troca' 
        });
      }

      return res.status(200).json({ 
        success: true, 
        message: `Chunk de troca ${chunk_index + 1}/${total_chunks} recebido`,
        receivedChunks: receivedChunks.length,
        totalChunks: total_chunks
      });
    }

  } catch (error: any) {
    console.error("❌ Erro no endpoint upload-chunk-troca:", error);
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
