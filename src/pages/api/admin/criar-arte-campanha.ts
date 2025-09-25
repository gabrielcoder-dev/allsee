// c:\Users\Latitude 5490\Desktop\allsee\src\pages\api/admin/criar-arte-campanha.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { optimizeForStorage, isFileTooLarge } from '@/lib/compression';

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
    const { id_order, caminho_imagem, id_user } = req.body;

    console.log('📥 Recebendo dados da arte:', {
      id_order,
      id_user,
      caminho_imagem_size: caminho_imagem ? caminho_imagem.length : 0,
      caminho_imagem_type: caminho_imagem ? (caminho_imagem.startsWith('data:image/') ? 'image' : 'video') : 'unknown',
      caminho_imagem_preview: caminho_imagem ? caminho_imagem.substring(0, 50) + '...' : null
    });

    if (!id_order || !caminho_imagem || !id_user) {
      console.error('❌ Campos obrigatórios faltando:', { id_order: !!id_order, caminho_imagem: !!caminho_imagem, id_user: !!id_user });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verificar se o arquivo é muito grande
    if (isFileTooLarge(caminho_imagem, 100)) { // 100MB limite
      console.error('❌ Arquivo muito grande:', caminho_imagem.length);
      return res.status(413).json({ success: false, error: 'Arquivo muito grande. Máximo 100MB permitido.' });
    }

    // Otimizar dados para armazenamento
    const optimization = optimizeForStorage(caminho_imagem);
    const finalData = optimization.optimized;
    
    console.log('📊 Otimização de dados:', {
      originalSize: optimization.originalSize,
      optimizedSize: optimization.optimizedSize,
      isOptimized: optimization.isOptimized,
      compressionRatio: optimization.isOptimized ? 
        ((optimization.originalSize - optimization.optimizedSize) / optimization.originalSize * 100).toFixed(2) + '%' : '0%'
    });

    const { data: arteCampanha, error } = await supabase
      .from('arte_campanha')
      .insert([{ id_order, caminho_imagem: finalData, id_user }])
      .select()
      .single();

    if (error) {
      console.error("❌ Erro ao criar arte da campanha:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

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
    console.error("❌ Erro no endpoint criar-arte-campanha:", error);
    return res.status(500).json({ success: false, error: 'Erro ao criar arte da campanha' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '150mb',
    },
  },
};