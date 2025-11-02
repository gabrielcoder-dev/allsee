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
    const { id_order, caminho_imagem, id_user, id_anuncio, mime_type, screen_type, status } = req.body;

    // Validação básica
    if (!id_order || !id_user) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campos obrigatórios faltando: id_order, id_user' 
      });
    }

    // Garantir que id_order é um número (bigint)
    const orderIdNumber = typeof id_order === 'number' ? id_order : parseInt(id_order, 10);
    if (isNaN(orderIdNumber)) {
      return res.status(400).json({ 
        success: false, 
        error: 'id_order deve ser um número válido' 
      });
    }

    // Se caminho_imagem está vazio (upload em chunks), permitir
    if (caminho_imagem && caminho_imagem !== '') {
      // NOVO SISTEMA: Aceitar URLs públicas do Supabase Storage
      const isStorageURL = caminho_imagem.startsWith('http');
      const isBase64 = caminho_imagem.startsWith('data:');
      
      if (isStorageURL) {
        // URL pública do storage - aceitar diretamente
        console.log('🔗 URL pública do storage detectada:', {
          url: caminho_imagem.substring(0, 100) + '...',
          isStorageURL: true
        });
      } else if (isBase64) {
        // Base64 (sistema legado) - validar formato
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
      } else {
        // Formato não reconhecido
        return res.status(400).json({ 
          success: false, 
          error: 'Formato não suportado. Use apenas imagens (JPG, PNG, GIF) ou vídeos (MP4, MOV, AVI)' 
        });
      }
    }

    console.log('📥 Criando arte da campanha:', {
      id_order,
      id_user,
      fileType: caminho_imagem ? (
        caminho_imagem.startsWith('http') ? 'storage_url' : 
        caminho_imagem.startsWith('data:image/') ? 'image_base64' : 
        caminho_imagem.startsWith('data:video/') ? 'video_base64' : 'unknown'
      ) : 'empty (chunks)',
      fileSizeMB: caminho_imagem ? Math.round(caminho_imagem.length / (1024 * 1024)) : 0,
      caminho_preview: caminho_imagem ? caminho_imagem.substring(0, 50) + '...' : 'empty'
    });

    // Normalizar campos opcionais
    const normalizedStatus = (status && typeof status === 'string') ? status : 'pendente';
    const normalizedScreenType = (screen_type && typeof screen_type === 'string') ? screen_type : null;
    const normalizedMimeType = (mime_type && typeof mime_type === 'string') ? mime_type : (caminho_imagem?.startsWith('data:') ? caminho_imagem.substring(5, caminho_imagem.indexOf(';')) : null);

    // Salvar no banco de dados
    const { data: arteCampanha, error } = await supabase
      .from('arte_campanha')
      .insert([{ 
        id_order: orderIdNumber,
        id_user,
        caminho_imagem: caminho_imagem || null,
        id_anuncio: id_anuncio ?? null,
        mime_type: normalizedMimeType,
        screen_type: normalizedScreenType,
        status: normalizedStatus,
      }])
      .select('id, id_order, id_user, id_anuncio')
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