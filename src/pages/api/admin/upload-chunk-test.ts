import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('🚀 Upload-chunk-test endpoint chamado!');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const contentType = req.headers['content-type'] || '';
    console.log('Content-Type:', contentType);
    
    if (contentType.includes('multipart/form-data')) {
      console.log('📦 FormData detectado - simulando chunk');
      return res.status(200).json({ 
        success: true, 
        message: 'Chunk recebido com sucesso',
        contentType
      });
    } else {
      console.log('📄 JSON detectado - simulando init');
      return res.status(200).json({ 
        success: true, 
        upload_id: 'test-' + Date.now(),
        file_path: 'test/path',
        message: 'Init recebido com sucesso',
        contentType
      });
    }
  } catch (error: any) {
    console.error("❌ Erro no upload-chunk-test:", error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
