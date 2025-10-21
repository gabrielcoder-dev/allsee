import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('✅ Test endpoint funcionando!');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Test endpoint funcionando!',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("❌ Erro no test endpoint:", error);
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
