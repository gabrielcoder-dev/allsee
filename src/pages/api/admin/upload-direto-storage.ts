import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import formidable, { File as FormidableFile } from 'formidable';
import { promises as fs } from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('🔧 Configuração Supabase:', {
  url: supabaseUrl ? '✅ Configurado' : '❌ Não configurado',
  serviceKey: supabaseServiceKey ? '✅ Configurado' : '❌ Não configurado'
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * API para upload direto de chunks BINÁRIOS para Supabase Storage
 * 
 * Fluxo:
 * 1. Cliente inicia upload (action: 'init') -> retorna upload_id e file_path
 * 2. Cliente envia chunks BINÁRIOS via FormData (action: 'chunk')
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

// Helper para fazer parse de FormData
const parseFormData = (req: NextApiRequest): Promise<{ fields: any; files: any }> => {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 2 * 1024 * 1024, // 2MB por chunk (limite Vercel: 4.5MB com margem segura)
      keepExtensions: true,
      multiples: false
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Converter arrays de campos para valores únicos
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
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('JSON inválido'));
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

    // AÇÃO: ENVIAR CHUNK BINÁRIO
    if (action === 'chunk') {
      if (!upload_id || chunk_index === undefined || !chunkFile) {
        return res.status(400).json({ 
          success: false, 
          error: 'upload_id, chunk_index e chunk_file são obrigatórios para chunk' 
        });
      }

      const uploadInfo = uploadsInProgress.get(upload_id);
      if (!uploadInfo) {
        return res.status(404).json({ 
          success: false, 
          error: 'Upload não encontrado. Use action=init primeiro.' 
        });
      }

      // Ler o arquivo binário (já está no disco temporário)
      const chunkBuffer = await fs.readFile(chunkFile.filepath);
      const chunkPath = `${uploadInfo.file_path}.chunk.${chunk_index}`;

      // Validar tamanho do chunk (limite Vercel: 4.5MB total, 2MB de arquivo + overhead)
      const chunkSizeMB = chunkBuffer.length / (1024 * 1024);
      if (chunkSizeMB > 2) {
        console.error(`❌ Chunk muito grande: ${chunkSizeMB.toFixed(2)}MB (limite Vercel: 2MB arquivo)`);
        // Limpar arquivo temporário
        try { await fs.unlink(chunkFile.filepath); } catch {}
        return res.status(413).json({ 
          success: false, 
          error: `Chunk muito grande: ${chunkSizeMB.toFixed(2)}MB. Limite Vercel: 2MB` 
        });
      }

      console.log(`📦 Recebendo chunk BINÁRIO ${chunk_index + 1}/${uploadInfo.total_chunks}:`, {
        upload_id,
        chunk_size_mb: chunkSizeMB.toFixed(2),
        chunk_size_kb: Math.round(chunkBuffer.length / 1024),
        chunk_path: chunkPath
      });

      // Upload do chunk para o storage (usando MIME type correto)
      const { error: uploadError } = await supabase.storage
        .from(uploadInfo.bucket)
        .upload(chunkPath, chunkBuffer, {
          contentType: uploadInfo.file_type, // Usar o MIME type do arquivo original
          upsert: true,
          cacheControl: '0' // Não cachear chunks temporários
        });

      // Limpar arquivo temporário
      try {
        await fs.unlink(chunkFile.filepath);
      } catch (unlinkError) {
        console.warn('⚠️ Não foi possível limpar arquivo temporário:', unlinkError);
      }

      if (uploadError) {
        console.error('❌ Erro detalhado ao fazer upload do chunk:', {
          error: uploadError,
          bucket: uploadInfo.bucket,
          chunkPath: chunkPath,
          chunkSize: chunkBuffer.length,
          uploadId: upload_id
        });
        return res.status(500).json({ 
          success: false, 
          error: `Erro ao fazer upload do chunk: ${uploadError.message}` 
        });
      }

      // Marcar chunk como recebido
      uploadInfo.chunks_received.add(chunk_index);

      console.log(`✅ Chunk BINÁRIO ${chunk_index + 1}/${uploadInfo.total_chunks} salvo no storage`);

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
    bodyParser: false, // Desabilitar - usamos formidable para parse de FormData binário
    responseLimit: '1mb',
  },
};

