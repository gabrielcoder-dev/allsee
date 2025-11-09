import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { orderId } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId é obrigatório' });
    }

    const orderIdStr = String(orderId);

    console.log('🗑️ Iniciando exclusão do pedido:', orderIdStr);

    // Buscar artes relacionadas ao pedido
    const { data: arteCampanhas, error: arteFetchError } = await supabase
      .from('arte_campanha')
      .select('id')
      .eq('id_order', orderIdStr);

    if (arteFetchError) {
      console.error('❌ Erro ao buscar artes do pedido:', arteFetchError);
      return res.status(500).json({ success: false, error: 'Erro ao buscar artes relacionadas ao pedido' });
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
        console.error('❌ Erro ao buscar trocas relacionadas:', trocaFetchError);
        return res.status(500).json({ success: false, error: 'Erro ao buscar trocas relacionadas ao pedido' });
      }

      arteTrocaIds = (arteTrocaCampanhas || []).map((troca) => troca.id);

      if (arteTrocaIds.length > 0) {
        // Remover chunks temporários de troca
        const { error: deleteChunksTrocaError } = await supabase
          .from('chunks_temp_troca')
          .delete()
          .in('arte_troca_id', arteTrocaIds);

        if (deleteChunksTrocaError) {
          console.warn('⚠️ Erro ao remover chunks_temp_troca:', deleteChunksTrocaError);
        }

        const { error: deleteArteTrocaError } = await supabase
          .from('arte_troca_campanha')
          .delete()
          .in('id', arteTrocaIds);

        if (deleteArteTrocaError) {
          console.error('❌ Erro ao excluir arte_troca_campanha:', deleteArteTrocaError);
          return res.status(500).json({ success: false, error: 'Erro ao remover trocas relacionadas ao pedido' });
        }
      }

      // Remover chunks temporários das artes
      const { error: deleteChunksError } = await supabase
        .from('chunks_temp')
        .delete()
        .in('arte_id', arteCampanhaIds);

      if (deleteChunksError) {
        console.warn('⚠️ Erro ao remover chunks_temp:', deleteChunksError);
      }

      // Remover artes da campanha
      const { error: deleteArteError } = await supabase
        .from('arte_campanha')
        .delete()
        .in('id', arteCampanhaIds);

      if (deleteArteError) {
        console.error('❌ Erro ao excluir arte_campanha:', deleteArteError);
        return res.status(500).json({ success: false, error: 'Erro ao remover artes do pedido' });
      }
    }

    // Remover o pedido
    const { error: deleteOrderError } = await supabase
      .from('order')
      .delete()
      .eq('id', orderIdStr);

    if (deleteOrderError) {
      console.error('❌ Erro ao excluir pedido:', deleteOrderError);
      return res.status(500).json({ success: false, error: 'Erro ao remover o pedido' });
    }

    console.log('✅ Pedido e relacionamentos removidos com sucesso:', orderIdStr);

    return res.status(200).json({
      success: true,
      removedOrderId: orderIdStr,
      removedArteCampanhaIds: arteCampanhaIds,
      removedArteTrocaIds: arteTrocaIds,
    });
  } catch (error: any) {
    console.error('❌ Erro inesperado ao excluir pedido:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Erro inesperado ao excluir pedido' });
  }
}


