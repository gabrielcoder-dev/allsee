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
      arte_campanha_id,
      arte_troca_campanha_id_type: typeof arte_troca_campanha_id,
      arte_campanha_id_type: typeof arte_campanha_id
    });

    // Buscar o caminho_imagem da arte de troca
    console.log('🔍 Buscando arte de troca no banco:', {
      tabela: 'arte_troca_campanha',
      filtro: `id = ${arte_troca_campanha_id}`,
      tipo_id: typeof arte_troca_campanha_id
    });

    const { data: arteTroca, error: fetchTrocaError } = await supabase
      .from('arte_troca_campanha')
      .select('caminho_imagem, id_campanha')
      .eq('id', arte_troca_campanha_id)
      .single();

    if (fetchTrocaError) {
      console.error('❌ Erro detalhado ao buscar arte de troca:', {
        error: fetchTrocaError,
        code: fetchTrocaError.code,
        message: fetchTrocaError.message,
        details: fetchTrocaError.details,
        hint: fetchTrocaError.hint,
        arte_troca_campanha_id: arte_troca_campanha_id,
        tipo_id: typeof arte_troca_campanha_id
      });
      return res.status(500).json({ 
        success: false, 
        error: `Erro ao buscar arte de troca: ${fetchTrocaError.message}` 
      });
    }

    console.log('✅ Arte de troca encontrada:', {
      id: arte_troca_campanha_id,
      tem_caminho_imagem: !!arteTroca.caminho_imagem,
      tamanho_caminho_imagem: arteTroca.caminho_imagem ? arteTroca.caminho_imagem.length : 0,
      id_campanha: arteTroca.id_campanha
    });

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

    // Verificar se o arquivo é muito grande para update direto
    const maxDirectUpdateSize = 4 * 1024 * 1024; // 4MB
    const fileSize = arteTroca.caminho_imagem ? arteTroca.caminho_imagem.length : 0;
    
    if (fileSize > maxDirectUpdateSize) {
      console.log('📦 Arquivo grande detectado, usando upload por chunks para substituição...');
      
      // Para arquivos grandes, usar o sistema de chunks
      // Primeiro, limpar o caminho_imagem atual
      const { error: clearError } = await supabase
        .from('arte_campanha')
        .update({ caminho_imagem: '' })
        .eq('id', arte_campanha_id);

      if (clearError) {
        console.error('❌ Erro ao limpar arte_campanha:', clearError);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao limpar arte da campanha' 
        });
      }

      // Dividir em chunks e fazer upload
      const chunks = [];
      let currentPosition = 0;
      
      while (currentPosition < arteTroca.caminho_imagem.length) {
        const remainingBytes = arteTroca.caminho_imagem.length - currentPosition;
        const chunkSize = Math.min(maxDirectUpdateSize, remainingBytes);
        
        const chunk = arteTroca.caminho_imagem.slice(currentPosition, currentPosition + chunkSize);
        chunks.push(chunk);
        currentPosition += chunkSize;
      }

      console.log(`📦 Dividindo em ${chunks.length} chunks para substituição`);

      // Upload sequencial dos chunks
      for (let i = 0; i < chunks.length; i++) {
        const isLastChunk = i === chunks.length - 1;
        
        console.log(`📤 Enviando chunk ${i + 1}/${chunks.length} para substituição...`);
        
        const { error: chunkError } = await supabase
          .from('chunks_temp')
          .upsert({
            arte_id: arte_campanha_id,
            chunk_index: i,
            chunk_data: chunks[i],
            total_chunks: chunks.length,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'arte_id,chunk_index'
          });

        if (chunkError) {
          console.error(`❌ Erro ao enviar chunk ${i}:`, chunkError);
          return res.status(500).json({ 
            success: false, 
            error: `Erro ao enviar chunk ${i + 1}` 
          });
        }

        if (isLastChunk) {
          // Último chunk - reconstruir arquivo
          console.log('🔧 Reconstruindo arquivo na arte_campanha...');
          
          const { data: allChunks, error: fetchChunksError } = await supabase
            .from('chunks_temp')
            .select('chunk_index, chunk_data')
            .eq('arte_id', arte_campanha_id)
            .order('chunk_index');

          if (fetchChunksError) {
            console.error('❌ Erro ao buscar chunks:', fetchChunksError);
            return res.status(500).json({ 
              success: false, 
              error: 'Erro ao buscar chunks' 
            });
          }

          const sortedChunks = allChunks.sort((a, b) => a.chunk_index - b.chunk_index);
          const fullData = sortedChunks.map(c => c.chunk_data).join('');

          // Atualizar arte_campanha com arquivo completo
          const { data: updatedArteCampanha, error: updateError } = await supabase
            .from('arte_campanha')
            .update({ caminho_imagem: fullData })
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

          // Limpar chunks temporários
          await supabase
            .from('chunks_temp')
            .delete()
            .eq('arte_id', arte_campanha_id);

          console.log('✅ Arte da campanha atualizada com sucesso via chunks:', {
            id: updatedArteCampanha.id,
            id_order: updatedArteCampanha.id_order,
            id_user: updatedArteCampanha.id_user,
            fileSizeMB: Math.round(fullData.length / (1024 * 1024))
          });
        } else {
          // Pequeno delay entre chunks
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } else {
      // Arquivo pequeno - update direto
      console.log('📤 Arquivo pequeno, fazendo update direto...');
      
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
    }

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
      arte_campanha_id: arte_campanha_id,
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
