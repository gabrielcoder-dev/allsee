import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * API para upload direto de chunks para Supabase Storage
 * 
 * Fluxo:
 * 1. Cliente inicia upload (action: 'init') -> retorna upload_id e file_path
 * 2. Cliente envia chunks (action: 'chunk') -> chunks são armazenados temporariamente
 * 3. Cliente finaliza (action: 'finalize') -> monta arquivo final e retorna URL pública
 * 4. Cliente pode abortar (action: 'abort') -> limpa uploads parciais
 */

// Tipos de ações
type UploadAction = 'init' | 'chunk' | 'finalize' | 'abort';

// Mapa de uploads em progresso (armazenado em memória)
// Para produção, considere usar Redis ou similar
const uploadsInProgress = new Map<string, {
  file_path: string;
  total_chunks: number;
  chunks_received: Set<number>;
  file_type: string;
  bucket: string;
}>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { action, upload_id, chunk_index, chunk_data, total_chunks, file_type, bucket = 'arte-campanhas' } = req.body;

    if (!action) {
      return res.status(400).json({ 
        success: false, 
        error: 'action é obrigatório (init, chunk, finalize, abort)' 
      });
    }

    // AÇÃO: INICIAR UPLOAD
    if (action === 'init') {
      if (!file_type || !total_chunks) {
        return res.status(400).json({ 
          success: false, 
          error: 'file_type e total_chunks são obrigatórios para init' 
        });
      }

      // Gerar ID único para o upload
      const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Gerar nome do arquivo com extensão correta
      const ext = file_type.split('/')[1] || 'bin';
      const filePath = `temp/${uploadId}.${ext}`;

      // Armazenar informações do upload
      uploadsInProgress.set(uploadId, {
        file_path: filePath,
        total_chunks,
        chunks_received: new Set(),
        file_type,
        bucket
      });

      console.log(`🚀 Upload iniciado:`, {
        upload_id: uploadId,
        file_path: filePath,
        total_chunks,
        file_type,
        bucket
      });

      return res.status(200).json({ 
        success: true, 
        upload_id: uploadId,
        file_path: filePath
      });
    }

    // AÇÃO: ENVIAR CHUNK
    if (action === 'chunk') {
      if (!upload_id || chunk_index === undefined || !chunk_data) {
        return res.status(400).json({ 
          success: false, 
          error: 'upload_id, chunk_index e chunk_data são obrigatórios para chunk' 
        });
      }

      const uploadInfo = uploadsInProgress.get(upload_id);
      if (!uploadInfo) {
        return res.status(404).json({ 
          success: false, 
          error: 'Upload não encontrado. Use action=init primeiro.' 
        });
      }

      // Converter chunk base64 para Buffer
      const chunkBuffer = Buffer.from(chunk_data, 'base64');
      const chunkPath = `${uploadInfo.file_path}.chunk.${chunk_index}`;

      console.log(`📦 Recebendo chunk ${chunk_index + 1}/${uploadInfo.total_chunks}:`, {
        upload_id,
        chunk_size_kb: Math.round(chunkBuffer.length / 1024),
        chunk_path: chunkPath
      });

      // Upload do chunk para o storage
      const { error: uploadError } = await supabase.storage
        .from(uploadInfo.bucket)
        .upload(chunkPath, chunkBuffer, {
          contentType: 'application/octet-stream',
          upsert: true,
          cacheControl: '0' // Não cachear chunks temporários
        });

      if (uploadError) {
        console.error('❌ Erro ao fazer upload do chunk:', uploadError);
        return res.status(500).json({ 
          success: false, 
          error: `Erro ao fazer upload do chunk: ${uploadError.message}` 
        });
      }

      // Marcar chunk como recebido
      uploadInfo.chunks_received.add(chunk_index);

      console.log(`✅ Chunk ${chunk_index + 1}/${uploadInfo.total_chunks} salvo no storage`);

      return res.status(200).json({ 
        success: true, 
        message: `Chunk ${chunk_index + 1}/${uploadInfo.total_chunks} recebido`,
        chunks_received: uploadInfo.chunks_received.size,
        total_chunks: uploadInfo.total_chunks
      });
    }

    // AÇÃO: FINALIZAR UPLOAD
    if (action === 'finalize') {
      if (!upload_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'upload_id é obrigatório para finalize' 
        });
      }

      const uploadInfo = uploadsInProgress.get(upload_id);
      if (!uploadInfo) {
        return res.status(404).json({ 
          success: false, 
          error: 'Upload não encontrado' 
        });
      }

      // Verificar se todos os chunks foram recebidos
      if (uploadInfo.chunks_received.size !== uploadInfo.total_chunks) {
        const missingChunks = [];
        for (let i = 0; i < uploadInfo.total_chunks; i++) {
          if (!uploadInfo.chunks_received.has(i)) {
            missingChunks.push(i);
          }
        }

        return res.status(400).json({ 
          success: false, 
          error: `Chunks faltando: ${missingChunks.join(', ')}`,
          chunks_received: uploadInfo.chunks_received.size,
          total_chunks: uploadInfo.total_chunks
        });
      }

      console.log('🔧 Montando arquivo final de', uploadInfo.total_chunks, 'chunks...');

      // Baixar e concatenar todos os chunks
      const chunkBuffers: Buffer[] = [];
      
      for (let i = 0; i < uploadInfo.total_chunks; i++) {
        const chunkPath = `${uploadInfo.file_path}.chunk.${i}`;
        
        const { data: chunkData, error: downloadError } = await supabase.storage
          .from(uploadInfo.bucket)
          .download(chunkPath);

        if (downloadError || !chunkData) {
          console.error(`❌ Erro ao baixar chunk ${i}:`, downloadError);
          return res.status(500).json({ 
            success: false, 
            error: `Erro ao baixar chunk ${i}` 
          });
        }

        // Converter Blob para Buffer
        const arrayBuffer = await chunkData.arrayBuffer();
        chunkBuffers.push(Buffer.from(arrayBuffer));
      }

      // Concatenar todos os chunks
      const finalBuffer = Buffer.concat(chunkBuffers);

      console.log('💾 Salvando arquivo final:', {
        size_mb: Math.round(finalBuffer.length / (1024 * 1024)),
        size_kb: Math.round(finalBuffer.length / 1024)
      });

      // Upload do arquivo final (remover .chunk do nome)
      const finalPath = uploadInfo.file_path.replace('temp/', '');
      
      const { error: finalUploadError } = await supabase.storage
        .from(uploadInfo.bucket)
        .upload(finalPath, finalBuffer, {
          contentType: uploadInfo.file_type,
          upsert: true,
          cacheControl: '3600' // Cache por 1 hora
        });

      if (finalUploadError) {
        console.error('❌ Erro ao fazer upload do arquivo final:', finalUploadError);
        return res.status(500).json({ 
          success: false, 
          error: `Erro ao fazer upload do arquivo final: ${finalUploadError.message}` 
        });
      }

      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from(uploadInfo.bucket)
        .getPublicUrl(finalPath);

      // Limpar chunks temporários (não crítico se falhar)
      console.log('🧹 Limpando chunks temporários...');
      try {
        const chunksToDelete = [];
        for (let i = 0; i < uploadInfo.total_chunks; i++) {
          chunksToDelete.push(`${uploadInfo.file_path}.chunk.${i}`);
        }

        const { error: deleteError } = await supabase.storage
          .from(uploadInfo.bucket)
          .remove(chunksToDelete);

        if (deleteError) {
          console.warn('⚠️ Não foi possível limpar todos os chunks:', deleteError);
        } else {
          console.log('✅ Chunks temporários limpos');
        }
      } catch (cleanupError) {
        console.warn('⚠️ Erro na limpeza de chunks:', cleanupError);
      }

      // Remover do mapa de uploads em progresso
      uploadsInProgress.delete(upload_id);

      console.log('✅ Upload finalizado com sucesso:', {
        file_path: finalPath,
        public_url: publicUrlData.publicUrl,
        size_mb: Math.round(finalBuffer.length / (1024 * 1024))
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Upload finalizado com sucesso',
        file_path: finalPath,
        public_url: publicUrlData.publicUrl,
        file_size_mb: Math.round(finalBuffer.length / (1024 * 1024))
      });
    }

    // AÇÃO: ABORTAR UPLOAD
    if (action === 'abort') {
      if (!upload_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'upload_id é obrigatório para abort' 
        });
      }

      const uploadInfo = uploadsInProgress.get(upload_id);
      if (!uploadInfo) {
        return res.status(404).json({ 
          success: false, 
          error: 'Upload não encontrado' 
        });
      }

      console.log('🗑️ Abortando upload:', upload_id);

      // Limpar chunks
      try {
        const chunksToDelete = [];
        for (let i = 0; i < uploadInfo.total_chunks; i++) {
          chunksToDelete.push(`${uploadInfo.file_path}.chunk.${i}`);
        }

        await supabase.storage
          .from(uploadInfo.bucket)
          .remove(chunksToDelete);
      } catch (error) {
        console.warn('⚠️ Erro ao limpar chunks abortados:', error);
      }

      // Remover do mapa
      uploadsInProgress.delete(upload_id);

      return res.status(200).json({ 
        success: true, 
        message: 'Upload abortado e limpo' 
      });
    }

    return res.status(400).json({ 
      success: false, 
      error: 'Ação inválida. Use: init, chunk, finalize, abort' 
    });

  } catch (error: any) {
    console.error("❌ Erro no endpoint upload-direto-storage:", error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Chunks de até 10MB
    },
    responseLimit: '1mb',
  },
};

