import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Limites para upload de arte de troca
const MAX_FILE_SIZE = 1.5 * 1024 * 1024 * 1024; // 1.5GB
const MAX_BASE64_SIZE = Math.floor(MAX_FILE_SIZE * 1.4); // Base64 é ~40% maior

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { id_campanha, caminho_imagem } = req.body;

    // Validação básica
    if (!id_campanha) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campos obrigatórios faltando: id_campanha' 
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

    console.log('📥 Criando arte de troca da campanha:', {
      id_campanha,
      fileType: caminho_imagem ? (
        caminho_imagem.startsWith('http') ? 'storage_url' : 
        caminho_imagem.startsWith('data:image/') ? 'image_base64' : 
        caminho_imagem.startsWith('data:video/') ? 'video_base64' : 'unknown'
      ) : 'empty (chunks)',
      fileSizeMB: caminho_imagem ? Math.round(caminho_imagem.length / (1024 * 1024)) : 0,
      caminho_preview: caminho_imagem ? caminho_imagem.substring(0, 50) + '...' : 'empty'
    });

    // Salvar no banco de dados (arte_troca_campanha)
    const { data: arteTrocaCampanha, error } = await supabase
      .from('arte_troca_campanha')
      .insert([{ 
        id_campanha: id_campanha, 
        caminho_imagem
      }])
      .select('id, id_campanha')
      .single();

    if (error) {
      console.error("❌ Erro ao criar arte de troca da campanha:", error);
      return res.status(500).json({ 
        success: false, 
        error: `Erro ao salvar arte de troca: ${error.message}` 
      });
    }

    console.log('✅ Arte de troca da campanha criada com sucesso:', {
      id: arteTrocaCampanha.id,
      id_campanha: arteTrocaCampanha.id_campanha
    });

    // Headers para otimização
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    
    return res.status(200).json({ 
      success: true, 
      arte_troca_campanha_id: arteTrocaCampanha.id 
    });

  } catch (error: any) {
    console.error("❌ Erro no endpoint criar-arte-troca-campanha:", error);
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
