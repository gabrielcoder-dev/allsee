import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Função para deletar uma order e tudo relacionado (reutilizando lógica do delete-order.ts)
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Aceitar tanto POST quanto GET (GET para cron jobs)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Validação de secret para cron jobs (opcional, mas recomendado)
  // O Vercel envia um header 'authorization' com o secret do cron
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.method === 'GET') {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️ Tentativa de acesso não autorizada ao cron job');
      return res.status(401).json({ error: 'Não autorizado' });
    }
  }

  try {
    // Data/hora limite: agora - 1 hora (mais confiável para Vercel)
    const limite = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

    console.log('🧹 Iniciando limpeza de orders draft antigas...', {
      limite,
      agora: new Date().toISOString(),
    });

    // Primeiro, buscar as orders que serão deletadas para log
    const { data: ordersToDelete, error: selectError } = await supabase
      .from('order')
      .select('id, status, created_at')
      .eq('status', 'draft')
      .lt('created_at', limite);

    if (selectError) {
      console.error('❌ Erro ao buscar orders draft antigas:', selectError);
      return res.status(500).json({ 
        error: 'Erro ao buscar orders draft antigas',
        details: selectError.message 
      });
    }

    const quantidadeDeletar = ordersToDelete?.length || 0;

    if (quantidadeDeletar === 0) {
      console.log('✅ Nenhuma order draft antiga encontrada para deletar');
      return res.status(200).json({ 
        success: true,
        message: 'Nenhuma order draft antiga encontrada',
        deleted: 0
      });
    }

    console.log(`📋 Encontradas ${quantidadeDeletar} orders draft para deletar:`, 
      ordersToDelete?.map(o => ({ id: o.id, created_at: o.created_at }))
    );

    // Deletar cada order e tudo relacionado
    const resultados: Array<{ orderId: string | number; success: boolean; error?: string }> = [];
    
    for (const order of ordersToDelete) {
      try {
        await deletarOrderCompleta(order.id);
        resultados.push({ orderId: order.id, success: true });
      } catch (error: any) {
        console.error(`❌ Erro ao deletar order ${order.id}:`, error);
        resultados.push({ 
          orderId: order.id, 
          success: false, 
          error: error.message 
        });
      }
    }

    const sucessos = resultados.filter(r => r.success).length;
    const falhas = resultados.filter(r => !r.success).length;

    console.log(`✅ Limpeza concluída: ${sucessos} orders draft deletadas com sucesso, ${falhas} falhas`);

    return res.status(200).json({ 
      success: true,
      message: `${sucessos} orders draft antigas e relacionamentos deletados com sucesso!`,
      deleted: sucessos,
      failed: falhas,
      limite,
      results: resultados
    });
  } catch (error: any) {
    console.error('❌ Erro inesperado ao limpar orders draft:', error);
    return res.status(500).json({ 
      error: 'Erro inesperado ao limpar orders draft',
      details: error.message 
    });
  }
}

