import type { NextApiRequest, NextApiResponse } from 'next';
import { storeChunk, cleanupOldChunks } from '@/lib/chunkStorage';

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

    // Armazenar chunk usando o sistema compartilhado
    storeChunk(uploadId, chunkIndex, chunkData, orderId, userId, totalChunks);

    // Limpeza periódica de uploads antigos
    cleanupOldChunks();

    return res.status(200).json({ 
      success: true, 
      receivedChunks: chunkIndex + 1,
      totalChunks: totalChunks
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
