import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import formidable, { File as FormidableFile } from 'formidable';
import { promises as fs } from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mapa de uploads em progresso
const uploadsInProgress = new Map<string, {
  file_path: string;
  total_chunks: number;
  chunks_received: Set<number>;
  file_type: string;
  bucket: string;
}>();

// Helper para fazer parse de FormData
const parseFormData = (req: NextApiRequest): Promise<{ fields: any; files: any }> => {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 2 * 1024 * 1024, // 2MB por chunk
      keepExtensions: true,
      multiples: false
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      
      const cleanFields: any = {};
      for (const key in fields) {
        cleanFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
      }
      
      resolve({ fields: cleanFields, files });
    });
  });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { fields, files } = await parseFormData(req);
    
    const action = fields.action;
    const upload_id = fields.upload_id;
    const chunk_index = fields.chunk_index ? parseInt(fields.chunk_index) : undefined;
    const total_chunks = fields.total_chunks ? parseInt(fields.total_chunks) : undefined;
    const file_type = fields.file_type;
    const bucket = fields.bucket || 'arte-campanhas';
    const chunkFile = Array.isArray(files.chunk_file) ? files.chunk_file[0] : files.chunk_file;

    if (!action) {
      return res.status(400).json({ 
        success: false, 
        error: 'action é obrigatório' 
      });
    }

    // AÇÃO: INICIAR UPLOAD
    if (action === 'init') {
      if (!file_type || !total_chunks) {
        return res.status(400).json({ 
          success: false, 
          error: 'file_type e total_chunks são obrigatórios' 
        });
      }

      const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const ext = file_type.split('/')[1] || 'bin';
      const filePath = `temp/${uploadId}.${ext}`;

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
        file_type
      });

      return res.status(200).json({ 
        success: true, 
        upload_id: uploadId,
        file_path: filePath
      });
    }

    // AÇÃO: ENVIAR CHUNK
    if (action === 'chunk') {
      if (!upload_id || chunk_index === undefined || !chunkFile) {
        return res.status(400).json({ 
          success: false, 
          error: 'upload_id, chunk_index e chunk_file são obrigatórios' 
        });
      }

      const uploadInfo = uploadsInProgress.get(upload_id);
      if (!uploadInfo) {
        return res.status(404).json({ 
          success: false, 
          error: 'Upload não encontrado' 
        });
      }

      const chunkBuffer = await fs.readFile(chunkFile.filepath);
      const chunkPath = `${uploadInfo.file_path}.chunk.${chunk_index}`;

      // Validar tamanho do chunk
      const chunkSizeMB = chunkBuffer.length / (1024 * 1024);
      if (chunkSizeMB > 2) {
        try { await fs.unlink(chunkFile.filepath); } catch {}
        return res.status(413).json({ 
          success: false, 
          error: `Chunk muito grande: ${chunkSizeMB.toFixed(2)}MB` 
        });
      }

      console.log(`📦 Recebendo chunk ${chunk_index + 1}/${uploadInfo.total_chunks}:`, {
        upload_id,
        chunk_size_mb: chunkSizeMB.toFixed(2),
        file_type: uploadInfo.file_type
      });

      // Upload do chunk com MIME type genérico (sempre aceito)
      const { error: uploadError } = await supabase.storage
        .from(uploadInfo.bucket)
        .upload(chunkPath, chunkBuffer, {
          contentType: 'application/octet-stream', // Sempre usar binário genérico
          upsert: true,
          cacheControl: '0'
        });

      // Limpar arquivo temporário
      try { await fs.unlink(chunkFile.filepath); } catch {}

      if (uploadError) {
        console.error('❌ Erro ao fazer upload do chunk:', uploadError);
        return res.status(500).json({ 
          success: false, 
          error: `Erro ao fazer upload do chunk: ${uploadError.message}` 
        });
      }

      uploadInfo.chunks_received.add(chunk_index);
      console.log(`✅ Chunk ${chunk_index + 1}/${uploadInfo.total_chunks} salvo`);

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
          error: 'upload_id é obrigatório' 
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
        return res.status(400).json({ 
          success: false, 
          error: `Chunks faltando: ${uploadInfo.total_chunks - uploadInfo.chunks_received.size}` 
        });
      }

      console.log('🔧 Montando arquivo final...');

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

        const arrayBuffer = await chunkData.arrayBuffer();
        chunkBuffers.push(Buffer.from(arrayBuffer));
      }

      // Concatenar chunks
      const finalBuffer = Buffer.concat(chunkBuffers);
      const finalPath = uploadInfo.file_path.replace('temp/', '');

      console.log('💾 Salvando arquivo final...');

      // Upload do arquivo final com MIME type correto
      const { error: finalUploadError } = await supabase.storage
        .from(uploadInfo.bucket)
        .upload(finalPath, finalBuffer, {
          contentType: uploadInfo.file_type, // Usar MIME type correto no arquivo final
          upsert: true,
          cacheControl: '3600'
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

      // Limpar chunks temporários
      try {
        const chunksToDelete = [];
        for (let i = 0; i < uploadInfo.total_chunks; i++) {
          chunksToDelete.push(`${uploadInfo.file_path}.chunk.${i}`);
        }
        await supabase.storage.from(uploadInfo.bucket).remove(chunksToDelete);
      } catch (cleanupError) {
        console.warn('⚠️ Erro na limpeza de chunks:', cleanupError);
      }

      uploadsInProgress.delete(upload_id);

      console.log('✅ Upload finalizado:', {
        file_path: finalPath,
        public_url: publicUrlData.publicUrl
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Upload finalizado com sucesso',
        file_path: finalPath,
        public_url: publicUrlData.publicUrl,
        file_size_mb: Math.round(finalBuffer.length / (1024 * 1024))
      });
    }

    return res.status(400).json({ 
      success: false, 
      error: 'Ação inválida' 
    });

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
    bodyParser: false,
    responseLimit: '1mb',
  },
};