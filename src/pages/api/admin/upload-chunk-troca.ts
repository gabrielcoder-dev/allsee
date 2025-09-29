import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { inflate } from 'zlib';
import { promisify } from 'util';

const inflateAsync = promisify(inflate);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para descomprimir chunks comprimidos
const decompressChunk = async (compressedData: string): Promise<string> => {
  try {
    // Converter base64 para Buffer
    const compressedBuffer = Buffer.from(compressedData, 'base64');
    
    // Descomprimir usando gzip
    const decompressedBuffer = await inflateAsync(compressedBuffer);
    
    // Converter de volta para base64
    return decompressedBuffer.toString('base64');
  } catch (error) {
    console.warn('⚠️ Falha na descompressão, usando chunk original:', error);
    return compressedData; // Fallback para chunk original
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
    const { arte_troca_campanha_id, chunk_index, chunk_data, total_chunks } = req.body;
    
    if (!arte_troca_campanha_id || chunk_index === undefined || !chunk_data || !total_chunks) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campos obrigatórios faltando para chunk de troca' 
      });
    }

    console.log(`📦 Recebendo chunk de troca ${chunk_index + 1}/${total_chunks} para arte ${arte_troca_campanha_id}:`, {
      chunkSize: Math.round(chunk_data.length / (1024 * 1024)) + 'MB',
      chunkIndex: chunk_index,
      totalChunks: total_chunks
    });

    // Descomprimir chunk se necessário
    let decompressedChunkData = chunk_data;
    try {
      decompressedChunkData = await decompressChunk(chunk_data);
      const originalSize = chunk_data.length;
      const decompressedSize = decompressedChunkData.length;
      const compressionRatio = ((originalSize - decompressedSize) / originalSize * 100).toFixed(1);
      
      console.log(`🗜️ Chunk de troca descomprimido:`, {
        tamanhoOriginal: Math.round(originalSize / 1024) + 'KB',
        tamanhoDescomprimido: Math.round(decompressedSize / 1024) + 'KB',
        reducao: compressionRatio + '%'
      });
    } catch (error) {
      console.warn('⚠️ Usando chunk de troca sem descompressão:', error);
    }

    // Validar chunk antes de salvar
    if (!decompressedChunkData || decompressedChunkData.length === 0) {
      console.error('❌ Chunk de troca vazio recebido:', { chunk_index, total_chunks });
      return res.status(400).json({ 
        success: false, 
        error: 'Chunk de troca vazio recebido' 
      });
    }

    // Usar upsert para substituir chunks existentes (evita erro de chave duplicada)
    const { error: chunkError } = await supabase
      .from('chunks_temp_troca')
      .upsert({
        arte_troca_id: arte_troca_campanha_id,
        chunk_index: chunk_index,
        chunk_data: decompressedChunkData,
        total_chunks: total_chunks,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'arte_troca_id,chunk_index'
      });

    if (chunkError) {
      console.error('❌ Erro ao salvar chunk de troca:', chunkError);
      return res.status(500).json({ 
        success: false, 
        error: `Erro ao salvar chunk de troca: ${chunkError.message}` 
      });
    }

    // Se é o último chunk, reconstruir e salvar
    if (chunk_index === total_chunks - 1) {
      console.log('🔧 Último chunk de troca recebido - iniciando reconstrução...');
      
      // Aguardar um pouco para garantir que todos os chunks foram processados
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Buscar todos os chunks do banco com retry otimizado
      let chunks;
      let attempts = 0;
      const maxAttempts = 3; // Reduzido de 5 para 3
      
      while (attempts < maxAttempts) {
        const { data: fetchedChunks, error: fetchError } = await supabase
          .from('chunks_temp_troca')
          .select('chunk_index, chunk_data')
          .eq('arte_troca_id', arte_troca_campanha_id)
          .order('chunk_index')
          .limit(1000); // Limite para evitar queries muito grandes

        if (fetchError) {
          console.error(`❌ Erro ao buscar chunks de troca (tentativa ${attempts + 1}):`, fetchError);
          attempts++;
          if (attempts >= maxAttempts) {
            return res.status(500).json({ 
              success: false, 
              error: 'Erro ao buscar chunks de troca após múltiplas tentativas' 
            });
          }
          await new Promise(resolve => setTimeout(resolve, 1000)); // Reduzido de 2s para 1s
          continue;
        }

        chunks = fetchedChunks;
        break;
      }

      if (!chunks) {
        return res.status(500).json({ 
          success: false, 
          error: 'Não foi possível buscar chunks de troca' 
        });
      }

      console.log(`📊 Chunks de troca encontrados: ${chunks.length}/${total_chunks}`, {
        chunksReceived: chunks.map(c => c.chunk_index).sort(),
        expectedRange: `0-${total_chunks - 1}`
      });

      // Verificar se todos os chunks foram recebidos
      if (chunks.length !== total_chunks) {
        const missingChunks = [];
        for (let i = 0; i < total_chunks; i++) {
          if (!chunks.find(c => c.chunk_index === i)) {
            missingChunks.push(i);
          }
        }
        
        console.error(`❌ Chunks de troca faltando:`, {
          recebidos: chunks.length,
          esperados: total_chunks,
          chunksFaltando: missingChunks,
          chunksRecebidos: chunks.map(c => c.chunk_index).sort()
        });
        
        return res.status(400).json({ 
          success: false, 
          error: `Chunks de troca faltando: ${missingChunks.join(', ')}. Recebidos: ${chunks.length}/${total_chunks}` 
        });
      }

      // Verificar se todos os chunks têm dados válidos
      const invalidChunks = chunks.filter(c => !c.chunk_data || c.chunk_data.length === 0);
      if (invalidChunks.length > 0) {
        console.error('❌ Chunks de troca com dados inválidos:', invalidChunks.map(c => c.chunk_index));
        return res.status(400).json({ 
          success: false, 
          error: `Chunks de troca com dados inválidos: ${invalidChunks.map(c => c.chunk_index).join(', ')}` 
        });
      }

      // Reconstruir arquivo completo na ordem correta
      const sortedChunks = chunks.sort((a, b) => a.chunk_index - b.chunk_index);
      const fullData = sortedChunks.map(c => c.chunk_data).join('');
      
      // Verificar se a reconstrução está correta
      const totalChunkSize = sortedChunks.reduce((sum, chunk) => sum + chunk.chunk_data.length, 0);
      const reconstructionSize = fullData.length;
      const isReconstructionCorrect = totalChunkSize === reconstructionSize;
      
      console.log('💾 Salvando arquivo de troca completo:', {
        arteTrocaId: arte_troca_campanha_id,
        totalChunks: sortedChunks.length,
        sizeMB: Math.round(fullData.length / (1024 * 1024)),
        sizeKB: Math.round(fullData.length / 1024),
        firstChunkSize: Math.round(sortedChunks[0]?.chunk_data?.length / 1024) + 'KB',
        lastChunkSize: Math.round(sortedChunks[sortedChunks.length - 1]?.chunk_data?.length / 1024) + 'KB',
        reconstructionCheck: isReconstructionCorrect ? '✅ CORRETO' : '❌ ERRO',
        totalChunkSize: totalChunkSize,
        reconstructionSize: reconstructionSize,
        chunkSizes: sortedChunks.map((chunk, i) => ({
          chunk: i + 1,
          sizeKB: Math.round(chunk.chunk_data.length / 1024),
          index: chunk.chunk_index
        }))
      });
      
      if (!isReconstructionCorrect) {
        console.error('❌ ERRO CRÍTICO: Reconstrução do arquivo de troca falhou!');
        console.error(`Tamanho calculado dos chunks: ${totalChunkSize} bytes`);
        console.error(`Tamanho do arquivo reconstruído: ${reconstructionSize} bytes`);
        return res.status(400).json({ 
          success: false, 
          error: 'Erro na reconstrução do arquivo de troca: tamanhos não coincidem' 
        });
      }

      // Verificar se o arquivo reconstruído é válido
      if (!fullData || fullData.length === 0) {
        console.error('❌ Arquivo de troca reconstruído está vazio');
        return res.status(400).json({ 
          success: false, 
          error: 'Arquivo de troca reconstruído está vazio' 
        });
      }

      // Salvar no banco com retry
      let updatedRecord;
      attempts = 0;
      
      while (attempts < maxAttempts) {
        const { data: result, error: updateError } = await supabase
          .from('arte_troca_campanha')
          .update({ caminho_imagem: fullData })
          .eq('id', arte_troca_campanha_id)
          .select('id, id_campanha')
          .single();

        if (updateError) {
          console.error(`❌ Erro ao salvar arquivo de troca completo (tentativa ${attempts + 1}):`, updateError);
          attempts++;
          if (attempts >= maxAttempts) {
            return res.status(500).json({ 
              success: false, 
              error: 'Erro ao salvar arquivo de troca completo após múltiplas tentativas' 
            });
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        updatedRecord = result;
        break;
      }

      if (!updatedRecord) {
        return res.status(500).json({ 
          success: false, 
          error: 'Não foi possível salvar arquivo de troca completo' 
        });
      }

      // Limpar chunks temporários de troca de forma otimizada (não crítico se falhar)
      try {
        // Usar delete em lote para melhor performance
        const { error: deleteError } = await supabase
          .from('chunks_temp_troca')
          .delete()
          .eq('arte_troca_id', arte_troca_campanha_id)
          .limit(1000); // Limite para evitar operações muito grandes
          
        if (deleteError) {
          console.warn('⚠️ Não foi possível limpar chunks temporários de troca:', deleteError);
        } else {
          console.log('🧹 Chunks temporários de troca limpos com sucesso');
        }
      } catch (cleanupError) {
        console.warn('⚠️ Erro na limpeza de chunks de troca:', cleanupError);
      }

      console.log('✅ Arquivo de troca completo salvo com sucesso:', {
        id: updatedRecord.id,
        sizeMB: Math.round(fullData.length / (1024 * 1024)),
        totalChunks: sortedChunks.length
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Arquivo de troca completo salvo com sucesso',
        arte_troca_campanha_id: updatedRecord.id,
        totalChunks: sortedChunks.length,
        fileSizeMB: Math.round(fullData.length / (1024 * 1024))
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
      sizeLimit: '10mb', // 8MB por chunk + overhead base64
      timeout: 10000, // 10 segundos para chunks (mais que suficiente para 5s do cliente)
    },
    responseLimit: '1mb',
  },
};
