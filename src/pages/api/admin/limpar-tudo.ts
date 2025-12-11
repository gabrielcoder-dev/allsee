import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Função para deletar uma order e tudo relacionado
async function deletarOrderCompleta(orderId: string | number) {
  const orderIdStr = String(orderId);
  
  console.log(`🗑️ Deletando order completa: ${orderIdStr}`);

  // Buscar artes relacionadas ao pedido
  const { data: arteCampanhas, error: arteFetchError } = await supabase
    .from('arte_campanha')
    .select('id')
    .eq('id_order', orderIdStr);

  if (arteFetchError) {
    console.error(`❌ Erro ao buscar artes do pedido ${orderIdStr}:`, arteFetchError);
    throw new Error(`Erro ao buscar artes relacionadas: ${arteFetchError.message}`);
  }

  const arteCampanhaIds = (arteCampanhas || []).map((arte) => arte.id);
  let arteTrocaIds: (string | number)[] = [];

  if (arteCampanhaIds.length > 0) {
    // Buscar trocas relacionadas às artes
    const { data: arteTrocaCampanhas, error: trocaFetchError } = await supabase
      .from('arte_troca_campanha')
      .select('id')
      .in('id_campanha', arteCampanhaIds);

    if (trocaFetchError) {
      console.error(`❌ Erro ao buscar trocas relacionadas ${orderIdStr}:`, trocaFetchError);
      throw new Error(`Erro ao buscar trocas relacionadas: ${trocaFetchError.message}`);
    }

    arteTrocaIds = (arteTrocaCampanhas || []).map((troca) => troca.id);

    if (arteTrocaIds.length > 0) {
      // Remover chunks temporários de troca
      const { error: deleteChunksTrocaError } = await supabase
        .from('chunks_temp_troca')
        .delete()
        .in('arte_troca_id', arteTrocaIds);

      if (deleteChunksTrocaError) {
        console.warn(`⚠️ Erro ao remover chunks_temp_troca para order ${orderIdStr}:`, deleteChunksTrocaError);
      }

      // Remover arte_troca_campanha
      const { error: deleteArteTrocaError } = await supabase
        .from('arte_troca_campanha')
        .delete()
        .in('id', arteTrocaIds);

      if (deleteArteTrocaError) {
        console.error(`❌ Erro ao excluir arte_troca_campanha para order ${orderIdStr}:`, deleteArteTrocaError);
        throw new Error(`Erro ao remover trocas relacionadas: ${deleteArteTrocaError.message}`);
      }
    }

    // Remover chunks temporários das artes
    const { error: deleteChunksError } = await supabase
      .from('chunks_temp')
      .delete()
      .in('arte_id', arteCampanhaIds);

    if (deleteChunksError) {
      console.warn(`⚠️ Erro ao remover chunks_temp para order ${orderIdStr}:`, deleteChunksError);
    }

    // Remover artes da campanha
    const { error: deleteArteError } = await supabase
      .from('arte_campanha')
      .delete()
      .in('id', arteCampanhaIds);

    if (deleteArteError) {
      console.error(`❌ Erro ao excluir arte_campanha para order ${orderIdStr}:`, deleteArteError);
      throw new Error(`Erro ao remover artes: ${deleteArteError.message}`);
    }
  }

  // Remover o pedido
  const { error: deleteOrderError } = await supabase
    .from('order')
    .delete()
    .eq('id', orderIdStr);

  if (deleteOrderError) {
    console.error(`❌ Erro ao excluir order ${orderIdStr}:`, deleteOrderError);
    throw new Error(`Erro ao remover order: ${deleteOrderError.message}`);
  }

  console.log(`✅ Order ${orderIdStr} e relacionamentos removidos com sucesso`);
  
  return {
    removedOrderId: orderIdStr,
    removedArteCampanhaIds: arteCampanhaIds,
    removedArteTrocaIds: arteTrocaIds,
  };
}

// Função para calcular se a campanha expirou
function campanhaExpirada(inicioCampanha: string, duracaoSemanas: number): boolean {
  if (!inicioCampanha || !duracaoSemanas) {
    return false;
  }
  
  const dataInicio = new Date(inicioCampanha);
  const dataAtual = new Date();
  
  // Converter semanas para dias
  const duracaoDias = duracaoSemanas * 7;
  const dataFim = new Date(dataInicio);
  dataFim.setDate(dataFim.getDate() + duracaoDias);
  
  // Adicionar um buffer de 1 hora para garantir que a campanha realmente terminou
  const dataFimComBuffer = new Date(dataFim.getTime() + 60 * 60 * 1000); // +1 hora
  
  return dataAtual >= dataFimComBuffer;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Aceitar tanto POST quanto GET (GET para cron jobs)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Validação de secret para cron jobs (opcional)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.method === 'GET') {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️ Tentativa de acesso não autorizada ao cron job');
      return res.status(401).json({ error: 'Não autorizado' });
    }
  }

  try {
    const resultados = {
      draft: { deleted: 0, failed: 0, errors: [] as any[] },
      expiradas: { deleted: 0, failed: 0, errors: [] as any[] }
    };

    // ========== LIMPEZA 1: Orders Draft ==========
    console.log('🧹 [1/2] Iniciando limpeza de orders draft...');
    
    // Data/hora limite: agora - 1 hora
    const limiteDraft = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

    const { data: ordersDraft, error: draftError } = await supabase
      .from('order')
      .select('id, status, created_at')
      .eq('status', 'draft')
      .lt('created_at', limiteDraft);

    if (draftError) {
      console.error('❌ Erro ao buscar orders draft:', draftError);
      resultados.draft.errors.push({ error: draftError.message });
    } else if (ordersDraft && ordersDraft.length > 0) {
      console.log(`📋 Encontradas ${ordersDraft.length} orders draft para deletar`);
      
      for (const order of ordersDraft) {
        try {
          await deletarOrderCompleta(order.id);
          resultados.draft.deleted++;
        } catch (error: any) {
          console.error(`❌ Erro ao deletar order draft ${order.id}:`, error);
          resultados.draft.failed++;
          resultados.draft.errors.push({ orderId: order.id, error: error.message });
        }
      }
    }

    // ========== LIMPEZA 2: Campanhas Expiradas ==========
    console.log('🧹 [2/2] Iniciando limpeza de campanhas expiradas...');

    // Buscar todas as orders com status "pago" que têm campanha
    const { data: orders, error: ordersError } = await supabase
      .from('order')
      .select('id, inicio_campanha, duracao_campanha, nome_campanha, status')
      .eq('status', 'pago')
      .not('inicio_campanha', 'is', null)
      .not('duracao_campanha', 'is', null);

    if (ordersError) {
      console.error('❌ Erro ao buscar orders:', ordersError);
      resultados.expiradas.errors.push({ error: ordersError.message });
    } else if (orders && orders.length > 0) {
      console.log(`📋 Verificando ${orders.length} orders com campanhas...`);

      // Filtrar orders com campanhas expiradas
      const ordersExpiradas = orders.filter(order => {
        if (!order.inicio_campanha || !order.duracao_campanha) {
          return false;
        }
        return campanhaExpirada(order.inicio_campanha, order.duracao_campanha);
      });

      if (ordersExpiradas.length > 0) {
        console.log(`📋 Encontradas ${ordersExpiradas.length} campanhas expiradas para deletar`);

        for (const order of ordersExpiradas) {
          try {
            await deletarOrderCompleta(order.id);
            resultados.expiradas.deleted++;
          } catch (error: any) {
            console.error(`❌ Erro ao deletar order expirada ${order.id}:`, error);
            resultados.expiradas.failed++;
            resultados.expiradas.errors.push({ orderId: order.id, error: error.message });
          }
        }
      }
    }

    const totalDeleted = resultados.draft.deleted + resultados.expiradas.deleted;
    const totalFailed = resultados.draft.failed + resultados.expiradas.failed;

    console.log(`✅ Limpeza concluída: ${totalDeleted} deletadas, ${totalFailed} falhas`);

    return res.status(200).json({
      success: true,
      message: `Limpeza concluída: ${totalDeleted} orders deletadas`,
      draft: {
        deleted: resultados.draft.deleted,
        failed: resultados.draft.failed,
        errors: resultados.draft.errors
      },
      expiradas: {
        deleted: resultados.expiradas.deleted,
        failed: resultados.expiradas.failed,
        errors: resultados.expiradas.errors
      },
      total: {
        deleted: totalDeleted,
        failed: totalFailed
      }
    });
  } catch (error: any) {
    console.error('❌ Erro inesperado na limpeza:', error);
    return res.status(500).json({
      error: 'Erro inesperado na limpeza',
      details: error.message
    });
  }
}

