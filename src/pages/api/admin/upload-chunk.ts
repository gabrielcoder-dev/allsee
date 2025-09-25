import type { NextApiRequest, NextApiResponse } from 'next';

// Armazenamento temporário em memória (em produção, usar Redis ou similar)
const chunkStorage = new Map<string, { chunks: string[], orderId: string, userId: string, totalChunks: number }>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { uploadId, chunkIndex, totalChunks, chunkData, orderId, userId } = req.body;

    if (!uploadId || chunkIndex === undefined || !totalChunks || !chunkData || !orderId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Inicializar ou atualizar storage
    if (!chunkStorage.has(uploadId)) {
      chunkStorage.set(uploadId, {
        chunks: new Array(totalChunks).fill(''),
        orderId,
        userId,
        totalChunks
      });
    }

    const upload = chunkStorage.get(uploadId)!;
    upload.chunks[chunkIndex] = chunkData;

    console.log(`📦 Chunk ${chunkIndex + 1}/${totalChunks} recebido para upload ${uploadId}`);

    // Limpar uploads antigos (mais de 1 hora)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [id, data] of chunkStorage.entries()) {
      if (id.includes('_') && parseInt(id.split('_')[1]) < oneHourAgo) {
        chunkStorage.delete(id);
      }
    }

    return res.status(200).json({ 
      success: true, 
      receivedChunks: upload.chunks.filter(c => c).length,
      totalChunks: upload.totalChunks
    });

  } catch (error) {
    console.error("❌ Erro no upload-chunk:", error);
    return res.status(500).json({ success: false, error: 'Erro ao processar chunk' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // 10MB por chunk
    },
  },
};
