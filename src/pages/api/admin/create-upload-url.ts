import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * API para criar URLs assinadas (presigned URLs) para upload DIRETO no Supabase
 * 
 * MUITO MAIS RÁPIDO: Cliente faz upload direto no Supabase Storage, sem passar pelo servidor!
 * 
 * Fluxo:
 * 1. Cliente solicita presigned URL
 * 2. Servidor retorna URL assinada (válida por 10 minutos)
 * 3. Cliente faz PUT direto no Supabase Storage
 * 4. Upload 2-3x mais rápido (sem intermediário)
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { file_name, file_type, bucket = 'arte-campanhas' } = req.body;

    if (!file_name || !file_type) {
      return res.status(400).json({ 
        success: false, 
        error: 'file_name e file_type são obrigatórios' 
      });
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const ext = file_name.split('.').pop();
    const uniqueFileName = `${timestamp}-${randomStr}.${ext}`;

    console.log('🔐 Criando presigned URL:', {
      originalName: file_name,
      uniqueName: uniqueFileName,
      fileType: file_type,
      bucket
    });

    // Criar presigned URL para upload
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(uniqueFileName);

    if (uploadError || !uploadData) {
      console.error('❌ Erro ao criar presigned URL:', uploadError);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao criar URL de upload' 
      });
    }

    // Obter URL pública do arquivo (depois do upload)
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(uniqueFileName);

    console.log('✅ Presigned URL criada:', {
      signedUrl: uploadData.signedUrl.substring(0, 100) + '...',
      publicUrl: publicUrlData.publicUrl,
      token: uploadData.token,
      path: uploadData.path,
      expiresIn: '10 minutos'
    });

    return res.status(200).json({ 
      success: true,
      /** URL assinada para upload (POST/PUT) */
      signed_url: uploadData.signedUrl,
      /** Token de autenticação */
      token: uploadData.token,
      /** Caminho do arquivo */
      file_path: uploadData.path,
      /** URL pública (disponível após upload) */
      public_url: publicUrlData.publicUrl,
      /** Validade da URL */
      expires_in: 600 // 10 minutos
    });

  } catch (error: any) {
    console.error("❌ Erro no endpoint create-upload-url:", error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

