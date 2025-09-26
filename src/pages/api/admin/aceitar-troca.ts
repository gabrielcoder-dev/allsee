import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

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
    const { arte_troca_campanha_id, arte_campanha_id } = req.body;

    // Validação básica
    if (!arte_troca_campanha_id || !arte_campanha_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campos obrigatórios faltando: arte_troca_campanha_id, arte_campanha_id' 
      });
    }

    console.log('🔄 Aceitando troca de arte:', {
      arte_troca_campanha_id,
      arte_campanha_id
    });

    // Buscar o caminho_imagem da arte de troca
    const { data: arteTroca, error: fetchTrocaError } = await supabase
      .from('arte_troca_campanha')
      .select('caminho_imagem, id_order')
      .eq('id', arte_troca_campanha_id)
      .single();

    if (fetchTrocaError) {
      console.error('❌ Erro ao buscar arte de troca:', fetchTrocaError);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar arte de troca' 
      });
    }

    if (!arteTroca) {
      return res.status(404).json({ 
        success: false, 
        error: 'Arte de troca não encontrada' 
      });
    }

    console.log('📥 Arte de troca encontrada:', {
      id: arte_troca_campanha_id,
      fileSizeMB: arteTroca.caminho_imagem ? Math.round(arteTroca.caminho_imagem.length / (1024 * 1024)) : 0,
      fileType: arteTroca.caminho_imagem ? (arteTroca.caminho_imagem.startsWith('data:image/') ? 'image' : 'video') : 'empty'
    });

    // Atualizar o caminho_imagem na arte_campanha original
    const { data: updatedArteCampanha, error: updateError } = await supabase
      .from('arte_campanha')
      .update({ caminho_imagem: arteTroca.caminho_imagem })
      .eq('id', arte_campanha_id)
      .select('id, id_order, id_user')
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar arte da campanha:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao atualizar arte da campanha' 
      });
    }

    console.log('✅ Arte da campanha atualizada com sucesso:', {
      id: updatedArteCampanha.id,
      id_order: updatedArteCampanha.id_order,
      id_user: updatedArteCampanha.id_user
    });

    // Opcional: Remover a arte de troca após aceitar (ou manter para histórico)
    // Descomente as linhas abaixo se quiser remover após aceitar:
    /*
    const { error: deleteError } = await supabase
      .from('arte_troca_campanha')
      .delete()
      .eq('id', arte_troca_campanha_id);

    if (deleteError) {
      console.error('⚠️ Erro ao remover arte de troca:', deleteError);
      // Não falha a operação, apenas loga o erro
    } else {
      console.log('🗑️ Arte de troca removida após aceitar');
    }
    */

    // Headers para otimização
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    
    return res.status(200).json({ 
      success: true, 
      message: 'Troca de arte aceita com sucesso',
      arte_campanha_id: updatedArteCampanha.id,
      arte_troca_campanha_id: arte_troca_campanha_id
    });

  } catch (error: any) {
    console.error("❌ Erro no endpoint aceitar-troca:", error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb', // Apenas IDs, não arquivos
      timeout: 30000, // 30 segundos
    },
    responseLimit: '1mb',
  },
};
