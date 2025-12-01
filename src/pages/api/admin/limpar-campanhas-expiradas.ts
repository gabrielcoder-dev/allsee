import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Função para calcular se a campanha expirou (mesma lógica do ProgressAdmin)
function campanhaExpirada(inicioCampanha: string, duracaoSemanas: number): boolean {
  const dataInicio = new Date(inicioCampanha);
  const dataAtual = new Date();
  
  // Converter semanas para dias
  const duracaoDias = duracaoSemanas * 7;
  const dataFim = new Date(dataInicio);
  dataFim.setDate(dataFim.getDate() + duracaoDias);
  
  // Se a data atual é maior ou igual à data fim, a campanha expirou
  return dataAtual >= dataFim;
}

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
    console.log('🧹 Iniciando limpeza de campanhas expiradas...');

    // Buscar todas as orders com status "pago" que têm campanha
    const { data: orders, error: ordersError } = await supabase
      .from('order')
      .select('id, inicio_campanha, duracao_campanha, nome_campanha, status')
      .eq('status', 'pago')
      .not('inicio_campanha', 'is', null)
      .not('duracao_campanha', 'is', null);

    if (ordersError) {
      console.error('❌ Erro ao buscar orders:', ordersError);
      return res.status(500).json({
        error: 'Erro ao buscar orders',
        details: ordersError.message
      });
    }

    if (!orders || orders.length === 0) {
      console.log('✅ Nenhuma order com campanha encontrada');
      return res.status(200).json({
        success: true,
        message: 'Nenhuma campanha expirada encontrada',
        deleted: 0
      });
    }

    console.log(`📋 Verificando ${orders.length} orders com campanhas...`);

    // Filtrar orders com campanhas expiradas
    const ordersExpiradas = orders.filter(order => {
      if (!order.inicio_campanha || !order.duracao_campanha) {
        return false;
      }
      return campanhaExpirada(order.inicio_campanha, order.duracao_campanha);
    });

    if (ordersExpiradas.length === 0) {
      console.log('✅ Nenhuma campanha expirada encontrada');
      return res.status(200).json({
        success: true,
        message: 'Nenhuma campanha expirada encontrada',
        deleted: 0,
        checked: orders.length
      });
    }

    console.log(`📋 Encontradas ${ordersExpiradas.length} campanhas expiradas para deletar:`, 
      ordersExpiradas.map(o => ({ 
        id: o.id, 
        nome: o.nome_campanha,
        inicio: o.inicio_campanha,
        duracao: o.duracao_campanha
      }))
    );

    // Deletar cada order expirada
    const resultados: Array<{ orderId: string | number; success: boolean; error?: string }> = [];
    
    for (const order of ordersExpiradas) {
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

    console.log(`✅ Limpeza concluída: ${sucessos} deletadas com sucesso, ${falhas} falhas`);

    return res.status(200).json({
      success: true,
      message: `${sucessos} campanhas expiradas deletadas com sucesso!`,
      deleted: sucessos,
      failed: falhas,
      checked: orders.length,
      results: resultados
    });
  } catch (error: any) {
    console.error('❌ Erro inesperado ao limpar campanhas expiradas:', error);
    return res.status(500).json({
      error: 'Erro inesperado ao limpar campanhas expiradas',
      details: error.message
    });
  }
}

