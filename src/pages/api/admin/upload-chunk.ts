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

// Helper para fazer parse de JSON
const parseJSON = (req: NextApiRequest): Promise<any> => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
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
    // Detectar se é FormData (chunk binário) ou JSON (init/finalize/abort)
    const contentType = req.headers['content-type'] || '';
    const isFormData = contentType.includes('multipart/form-data');
    
    let action: string;
    let upload_id: string | undefined;
    let chunk_index: number | undefined;
    let total_chunks: number | undefined;
    let file_type: string | undefined;
    let bucket: string = 'arte-campanhas';
    let chunkFile: FormidableFile | undefined;

    if (isFormData) {
      // Parse FormData (upload binário de chunk)
      const { fields, files } = await parseFormData(req);
      action = fields.action;
      upload_id = fields.upload_id;
      chunk_index = fields.chunk_index ? parseInt(fields.chunk_index) : undefined;
      total_chunks = fields.total_chunks ? parseInt(fields.total_chunks) : undefined;
      chunkFile = Array.isArray(files.chunk_file) ? files.chunk_file[0] : files.chunk_file;
    } else {
      // Parse JSON (init, finalize, abort)
      const body = await parseJSON(req);
      action = body.action;
      upload_id = body.upload_id;
      chunk_index = body.chunk_index;
      total_chunks = body.total_chunks;
      file_type = body.file_type;
      bucket = body.bucket || 'arte-campanhas';
    }

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
        console.error(`❌ Upload não encontrado: ${upload_id}`);
        return res.status(404).json({ 
          success: false, 
          error: 'Upload não encontrado' 
        });
      }

      // Verificar se o arquivo temporário existe
      if (!chunkFile.filepath) {
        console.error(`❌ Arquivo temporário não encontrado para chunk ${chunk_index}`);
        return res.status(400).json({ 
          success: false, 
          error: 'Arquivo temporário não encontrado' 
        });
      }

      let chunkBuffer: Buffer;
      try {
        chunkBuffer = await fs.readFile(chunkFile.filepath);
      } catch (error) {
        console.error(`❌ Erro ao ler arquivo temporário:`, error);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao ler arquivo temporário' 
        });
      }

      const chunkPath = `${uploadInfo.file_path}.chunk.${chunk_index}`;

      // Validar tamanho do chunk (aumentar limite para 5MB)
      const chunkSizeMB = chunkBuffer.length / (1024 * 1024);
      if (chunkSizeMB > 5) {
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
        console.error('❌ Detalhes do erro:', {
          upload_id,
          chunk_index,
          chunk_path: chunkPath,
          bucket: uploadInfo.bucket,
          chunk_size_mb: chunkSizeMB.toFixed(2)
        });
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

    // AÇÃO: ABORTAR UPLOAD
    if (action === 'abort') {
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

      // Limpar chunks temporários
      try {
        const chunksToDelete = [];
        for (let i = 0; i < uploadInfo.total_chunks; i++) {
          chunksToDelete.push(`${uploadInfo.file_path}.chunk.${i}`);
        }
        await supabase.storage.from(uploadInfo.bucket).remove(chunksToDelete);
        console.log(`🗑️ Chunks limpos para upload abortado: ${upload_id}`);
      } catch (cleanupError) {
        console.warn('⚠️ Erro na limpeza de chunks:', cleanupError);
      }

      uploadsInProgress.delete(upload_id);
      console.log(`❌ Upload abortado: ${upload_id}`);

      return res.status(200).json({ 
        success: true, 
        message: 'Upload abortado com sucesso' 
      });
    }

    return res.status(400).json({ 
      success: false, 
      error: 'Ação inválida' 
    });

  } catch (error: any) {
    console.error("❌ Erro no endpoint upload-chunk:", error);
    console.error("❌ Stack trace:", error.stack);
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