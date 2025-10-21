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
      console.log('📄 JSON detectado');
      
      // Parse do body JSON
      const body = req.body || {};
      
      if (body.action === 'init') {
        console.log('🚀 Simulando init');
        return res.status(200).json({ 
          success: true, 
          upload_id: 'test-' + Date.now(),
          file_path: 'test/path',
          message: 'Init recebido com sucesso'
        });
      } else if (body.action === 'finalize') {
        console.log('✅ Simulando finalize');
        return res.status(200).json({ 
          success: true, 
          message: 'Upload finalizado com sucesso',
          file_path: 'test/final-file.jpg',
          public_url: 'https://example.com/test-file.jpg',
          file_size_mb: 5.2
        });
      } else {
        console.log('❓ Ação desconhecida:', body.action);
        return res.status(200).json({ 
          success: true, 
          message: 'JSON recebido com sucesso',
          action: body.action
        });
      }
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
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
