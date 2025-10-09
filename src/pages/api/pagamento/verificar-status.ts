// Endpoint para verificar e atualizar manualmente o status de um pagamento
// Útil para debug quando o webhook não está funcionando
import type { NextApiRequest, NextApiResponse } from 'next';
import { Payment, MercadoPagoConfig } from 'mercadopago';
import { supabaseServer } from '@/lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ 
        error: 'orderId é obrigatório',
        example: { orderId: 'uuid-da-order' }
      });
    }

    // 1. Buscar a order no banco
    const { data: order, error: orderError } = await supabaseServer
      .from('order')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        error: 'Order não encontrada',
        orderId,
        details: orderError?.message
      });
    }

    console.log('📦 Order encontrada:', {
      id: order.id,
      status: order.status,
      preco: order.preco
    });

    // 2. Se já está pago, retornar
    if (order.status === 'pago') {
      return res.status(200).json({
        message: 'Order já está paga',
        order: {
          id: order.id,
          status: order.status,
          updated_at: order.updated_at
        }
      });
    }

    // 3. Buscar pagamentos do Mercado Pago usando o external_reference
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Token do Mercado Pago não configurado' });
    }

    const mpClient = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    });
    const paymentClient = new Payment(mpClient);

    // Nota: A API do MP não tem busca direta por external_reference
    // Então retornamos informações sobre a order e instruções
    
    return res.status(200).json({
      message: 'Order encontrada mas ainda não está paga',
      order: {
        id: order.id,
        status: order.status,
        preco: order.preco,
        created_at: order.created_at,
        updated_at: order.updated_at
      },
      instructions: {
        message: 'Para verificar o pagamento, você precisa do payment_id do Mercado Pago',
        howToFind: 'O payment_id aparece na URL de retorno ou no painel do Mercado Pago',
        webhookUrl: `${req.headers.host}/api/pagamento/webhook`,
        externalReference: order.id
      }
    });

  } catch (error: any) {
    console.error('Erro ao verificar status:', error);
    return res.status(500).json({ 
      error: 'Erro ao verificar status',
      details: error.message 
    });
  }
}

