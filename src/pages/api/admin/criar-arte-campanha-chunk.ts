// API para upload de arte em chunks
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { optimizeForStorage } from '@/lib/compression';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Armazenamento temporário de chunks (em produção, usar Redis ou banco de dados)
const chunkStorage: { [key: string]: { chunks: string[], metadata: any, createdAt: number } } = {};

// Limpar chunks antigos (mais de 1 hora)
setInterval(() => {
  const now = Date.now();
  Object.keys(chunkStorage).forEach(key => {
    if (now - chunkStorage[key].createdAt > 60 * 60 * 1000) {
      delete chunkStorage[key];
    }
  });
}, 5 * 60 * 1000); // Executar a cada 5 minutos

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { action } = req.query;

  if (action === 'chunk') {
    return handleChunkUpload(req, res);
  } else if (action === 'finalize') {
    return handleFinalizeUpload(req, res);
  } else {
    return res.status(400).json({ error: 'Ação inválida' });
  }
}

async function handleChunkUpload(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { uploadId, chunkIndex, totalChunks, chunkData, metadata } = req.body;

    console.log('📥 Recebendo chunk:', {
      uploadId,
      chunkIndex,
      totalChunks,
      chunkSize: chunkData.length
    });

    if (!uploadId || chunkIndex === undefined || !chunkData) {
      return res.status(400).json({ error: 'Dados do chunk inválidos' });
    }

    // Inicializar ou atualizar armazenamento de chunks
    if (!chunkStorage[uploadId]) {
      chunkStorage[uploadId] = {
        chunks: new Array(totalChunks).fill(''),
        metadata: metadata || null,
        createdAt: Date.now()
      };
    }

    // Armazenar chunk
    chunkStorage[uploadId].chunks[chunkIndex] = chunkData;

    console.log('✅ Chunk armazenado:', {
      uploadId,
      chunkIndex,
      totalChunks,
      progress: `${chunkIndex + 1}/${totalChunks}`
    });

    return res.status(200).json({ 
      success: true, 
      progress: chunkIndex + 1,
      total: totalChunks
    });

  } catch (error) {
    console.error('❌ Erro no chunk upload:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar chunk' });
  }
}

async function handleFinalizeUpload(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { uploadId } = req.body;

    if (!uploadId || !chunkStorage[uploadId]) {
      return res.status(400).json({ error: 'Upload ID inválido' });
    }

    const { chunks, metadata } = chunkStorage[uploadId];

    // Verificar se todos os chunks foram recebidos
    const missingChunks = chunks.some(chunk => !chunk);
    if (missingChunks) {
      return res.status(400).json({ error: 'Chunks faltando' });
    }

    // Reconstruir arquivo completo
    const fullBase64 = chunks.join('');
    console.log('🔧 Reconstruindo arquivo:', {
      uploadId,
      totalSize: fullBase64.length,
      chunks: chunks.length
    });

    // Otimizar dados
    const optimization = optimizeForStorage(fullBase64);
    const finalData = optimization.optimized;

    console.log('📊 Otimização:', {
      originalSize: optimization.originalSize,
      optimizedSize: optimization.optimizedSize,
      compressionRatio: optimization.isOptimized ? 
        ((optimization.originalSize - optimization.optimizedSize) / optimization.originalSize * 100).toFixed(2) + '%' : '0%'
    });

    // Salvar no banco de dados
    const { data: arteCampanha, error } = await supabase
      .from('arte_campanha')
      .insert([{ 
        id_order: metadata.id_order, 
        caminho_imagem: finalData, 
        id_user: metadata.id_user 
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao salvar no banco:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // Limpar chunks da memória
    delete chunkStorage[uploadId];

    console.log('✅ Arte da campanha criada via chunks:', {
      id: arteCampanha.id,
      id_order: arteCampanha.id_order,
      id_user: arteCampanha.id_user
    });

    return res.status(200).json({ 
      success: true, 
      arte_campanha_id: arteCampanha.id 
    });

  } catch (error) {
    console.error('❌ Erro ao finalizar upload:', error);
    return res.status(500).json({ success: false, error: 'Erro ao finalizar upload' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Cada chunk será pequeno
    },
  },
};
