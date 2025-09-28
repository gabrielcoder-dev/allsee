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

      // Upload sequencial dos chunks com retry
      for (let i = 0; i < chunks.length; i++) {
        const isLastChunk = i === chunks.length - 1;
        
        console.log(`📤 Enviando chunk ${i + 1}/${chunks.length} para substituição...`);
        
        let chunkError = null;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
          try {
            const { error } = await supabase
              .from('chunks_temp_troca')
              .upsert({
                arte_troca_id: arte_campanha_id,
                chunk_index: i,
                chunk_data: chunks[i],
                total_chunks: chunks.length,
                created_at: new Date().toISOString()
              }, {
                onConflict: 'arte_troca_id,chunk_index'
              });

            if (!error) {
              console.log(`✅ Chunk ${i + 1}/${chunks.length} enviado com sucesso`);
              break; // Sucesso, sair do loop de retry
            } else {
              chunkError = error;
              attempts++;
              console.warn(`⚠️ Tentativa ${attempts}/${maxAttempts} falhou para chunk ${i + 1}:`, error);
              
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Delay progressivo
              }
            }
          } catch (error) {
            chunkError = error;
            attempts++;
            console.warn(`⚠️ Tentativa ${attempts}/${maxAttempts} falhou para chunk ${i + 1}:`, error);
            
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Delay progressivo
            }
          }
        }

        if (chunkError && attempts >= maxAttempts) {
          console.error(`❌ Erro ao enviar chunk ${i + 1} após ${maxAttempts} tentativas:`, chunkError);
          return res.status(500).json({ 
            success: false, 
            error: `Erro ao enviar chunk ${i + 1}: ${chunkError.message || chunkError}` 
          });
        }

        if (isLastChunk) {
          // Último chunk - reconstruir arquivo
          console.log('🔧 Reconstruindo arquivo na arte_campanha...');
          
          // Aguardar um pouco para garantir que o chunk foi salvo
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          let allChunks = null;
          let fetchAttempts = 0;
          const maxFetchAttempts = 3;
          
          while (fetchAttempts < maxFetchAttempts) {
            try {
              const { data, error: fetchChunksError } = await supabase
                .from('chunks_temp_troca')
                .select('chunk_index, chunk_data')
                .eq('arte_troca_id', arte_campanha_id)
                .order('chunk_index');

              if (fetchChunksError) {
                console.warn(`⚠️ Tentativa ${fetchAttempts + 1}/${maxFetchAttempts} falhou ao buscar chunks:`, fetchChunksError);
                fetchAttempts++;
                if (fetchAttempts < maxFetchAttempts) {
                  await new Promise(resolve => setTimeout(resolve, 2000 * fetchAttempts));
                  continue;
                }
              } else {
                allChunks = data;
                break;
              }
            } catch (error) {
              console.warn(`⚠️ Tentativa ${fetchAttempts + 1}/${maxFetchAttempts} falhou ao buscar chunks:`, error);
              fetchAttempts++;
              if (fetchAttempts < maxFetchAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000 * fetchAttempts));
                continue;
              }
            }
          }

          if (!allChunks) {
            console.error('❌ Erro ao buscar chunks após múltiplas tentativas');
            return res.status(500).json({ 
              success: false, 
              error: 'Erro ao buscar chunks após múltiplas tentativas' 
            });
          }

          const sortedChunks = allChunks.sort((a, b) => a.chunk_index - b.chunk_index);
          const fullData = sortedChunks.map(c => c.chunk_data).join('');

          console.log('📊 Arquivo reconstruído:', {
            totalChunks: sortedChunks.length,
            fileSizeMB: Math.round(fullData.length / (1024 * 1024))
          });

          // Atualizar arte_campanha com arquivo completo
          let updateAttempts = 0;
          const maxUpdateAttempts = 3;
          let updateSuccess = false;
          
          while (updateAttempts < maxUpdateAttempts && !updateSuccess) {
            try {
              const { data: updatedArteCampanha, error: updateError } = await supabase
                .from('arte_campanha')
                .update({ caminho_imagem: fullData })
                .eq('id', arte_campanha_id)
                .select('id, id_order, id_user')
                .single();

              if (updateError) {
                console.warn(`⚠️ Tentativa ${updateAttempts + 1}/${maxUpdateAttempts} falhou ao atualizar:`, updateError);
                updateAttempts++;
                if (updateAttempts < maxUpdateAttempts) {
                  await new Promise(resolve => setTimeout(resolve, 3000 * updateAttempts));
                  continue;
                }
              } else {
                console.log('✅ Arte da campanha atualizada com sucesso via chunks:', {
                  id: updatedArteCampanha.id,
                  id_order: updatedArteCampanha.id_order,
                  id_user: updatedArteCampanha.id_user,
                  fileSizeMB: Math.round(fullData.length / (1024 * 1024))
                });
                updateSuccess = true;
              }
            } catch (error) {
              console.warn(`⚠️ Tentativa ${updateAttempts + 1}/${maxUpdateAttempts} falhou ao atualizar:`, error);
              updateAttempts++;
              if (updateAttempts < maxUpdateAttempts) {
                await new Promise(resolve => setTimeout(resolve, 3000 * updateAttempts));
                continue;
              }
            }
          }

          if (!updateSuccess) {
            console.error('❌ Erro ao atualizar arte da campanha após múltiplas tentativas');
            return res.status(500).json({ 
              success: false, 
              error: 'Erro ao atualizar arte da campanha após múltiplas tentativas' 
            });
          }

          // Limpar chunks temporários (não crítico se falhar)
          try {
            await supabase
              .from('chunks_temp_troca')
              .delete()
              .eq('arte_troca_id', arte_campanha_id);
            console.log('🧹 Chunks temporários de troca limpos');
          } catch (cleanupError) {
            console.warn('⚠️ Não foi possível limpar chunks temporários de troca:', cleanupError);
          }
        } else {
          // Pequeno delay entre chunks
          await new Promise(resolve => setTimeout(resolve, 500));
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
