import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Constantes para validação
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB em bytes
const MAX_BASE64_SIZE = Math.floor(MAX_FILE_SIZE * 1.37); // ~1.37GB em base64 (1GB original)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { id_order, caminho_imagem, id_user } = req.body;

    // Validação básica
    if (!id_order || !id_user) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campos obrigatórios faltando: id_order, id_user' 
      });
    }

    // Se caminho_imagem está vazio (upload em chunks), permitir
    if (caminho_imagem && caminho_imagem !== '') {
      // Validar tipo de arquivo (base64)
      if (!caminho_imagem.startsWith('data:image/') && !caminho_imagem.startsWith('data:video/')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Formato não suportado. Use apenas imagens (JPG, PNG, GIF) ou vídeos (MP4, MOV, AVI)' 
        });
      }

      // Validar tamanho do arquivo (base64 otimizado)
      if (caminho_imagem.length > MAX_BASE64_SIZE) {
        const currentSizeMB = Math.round(caminho_imagem.length / (1024 * 1024));
        const maxSizeMB = Math.round(MAX_FILE_SIZE / (1024 * 1024));
        return res.status(413).json({ 
          success: false, 
          error: `Arquivo muito grande. Máximo permitido: ${maxSizeMB}MB. Arquivo atual: ~${currentSizeMB}MB` 
        });
      }
    }

    console.log('📥 Criando arte da campanha:', {
      id_order,
      id_user,
      fileType: caminho_imagem ? (caminho_imagem.startsWith('data:image/') ? 'image' : 'video') : 'empty (chunks)',
      fileSizeMB: caminho_imagem ? Math.round(caminho_imagem.length / (1024 * 1024)) : 0,
      caminho_preview: caminho_imagem ? caminho_imagem.substring(0, 50) + '...' : 'empty'
    });

    // Salvar no banco de dados
    const { data: arteCampanha, error } = await supabase
      .from('arte_campanha')
      .insert([{ 
        id_order, 
        caminho_imagem, 
        id_user 
      }])
      .select('id, id_order, id_user')
      .single();

    if (error) {
      console.error("❌ Erro ao criar arte da campanha:", error);
      return res.status(500).json({ 
        success: false, 
        error: `Erro ao salvar arte: ${error.message}` 
      });
    }

    console.log('✅ Arte da campanha criada com sucesso:', {
      id: arteCampanha.id,
      id_order: arteCampanha.id_order,
      id_user: arteCampanha.id_user
    });

    // Headers para otimização
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    
    return res.status(200).json({ 
      success: true, 
      arte_campanha_id: arteCampanha.id 
    });

  } catch (error: any) {
    console.error("❌ Erro no endpoint criar-arte-campanha:", error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
}

export const config = {
  api: {
    externalResolver: true, // Permite bypass do bodyParser padrão do Next.js
    bodyParser: {
      sizeLimit: '2mb', // Apenas para arquivos pequenos e registros vazios
      timeout: 30000, // 30 segundos
    },
    responseLimit: '1mb', // Resposta pequena
  },
};