import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getChunkData, removeChunkData } from '@/lib/chunkStorage';

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
    const { uploadId, orderId, userId } = req.body;

    if (!uploadId || !orderId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const upload = getChunkData(uploadId);
    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Verificar se todos os chunks foram recebidos
    const receivedChunks = upload.chunks.filter(c => c).length;
    if (receivedChunks !== upload.totalChunks) {
      return res.status(400).json({ 
        error: `Missing chunks. Received: ${receivedChunks}, Expected: ${upload.totalChunks}` 
      });
    }

    // Reconstruir o base64 completo
    const fullBase64 = upload.chunks.join('');
    
    console.log('🔧 Finalizando upload:', {
      uploadId,
      orderId,
      userId,
      totalSize: fullBase64.length,
      sizeMB: Math.round(fullBase64.length / (1024 * 1024))
    });

    // Salvar no banco
    const { data: arteCampanha, error } = await supabase
      .from('arte_campanha')
      .insert([{ 
        id_order: orderId, 
        caminho_imagem: fullBase64, 
        id_user: userId 
      }])
      .select('id, id_order, id_user')
      .single();

    if (error) {
      console.error("❌ Erro ao salvar arte da campanha:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // Limpar dados temporários
    removeChunkData(uploadId);

    console.log('✅ Arte da campanha criada com sucesso:', {
      id: arteCampanha.id,
      id_order: arteCampanha.id_order,
      id_user: arteCampanha.id_user
    });

    return res.status(200).json({ 
      success: true, 
      arte_campanha_id: arteCampanha.id 
    });

  } catch (error) {
    console.error("❌ Erro no finalize-upload:", error);
    return res.status(500).json({ success: false, error: 'Erro ao finalizar upload' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb', // Apenas metadados
    },
  },
};
