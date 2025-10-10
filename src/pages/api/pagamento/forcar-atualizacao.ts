// Endpoint para forçar manualmente a atualização do status
// Use quando souber o payment_id do Mercado Pago
import type { NextApiRequest, NextApiResponse } from 'next';
import { Payment, MercadoPagoConfig } from 'mercadopago';
import { supabaseServer } from '@/lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ 
        error: 'paymentId é obrigatório',
        example: { paymentId: '1234567890' }
      });
    }

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Token do Mercado Pago não configurado' });
    }

    // 1. Buscar o pagamento no Mercado Pago
    const mpClient = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    });
    const paymentClient = new Payment(mpClient);

    let payment;
    try {
      payment = await paymentClient.get({ id: paymentId });
    } catch (err: any) {
      return res.status(404).json({
        error: 'Pagamento não encontrado no Mercado Pago',
        paymentId,
        details: err.message
      });
    }

    console.log('💳 Pagamento encontrado:', {
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
      amount: payment.transaction_amount
    });

    const externalReference = payment.external_reference;

    if (!externalReference || externalReference === null || externalReference === undefined) {
      return res.status(400).json({
        error: 'Pagamento sem external_reference válido',
        payment: {
          id: payment.id,
          status: payment.status,
          external_reference: payment.external_reference
        }
      });
    }

    // 2. Buscar a order no banco
    const { data: order, error: orderError } = await supabaseServer
      .from('order')
      .select('*')
      .eq('id', externalReference)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        error: 'Order não encontrada no banco',
        external_reference: externalReference,
        details: orderError?.message,
        hint: 'Verifique se o ID da order existe na tabela'
      });
    }

    // 3. Mapear status
    let internalStatus = "pendente";
    if (payment.status === "approved") {
      internalStatus = "pago";
    }

    // 4. Atualizar a order
    const { error: updateError, data: updateData } = await supabaseServer
      .from('order')
      .update({
        status: internalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', externalReference)
      .select();

    if (updateError) {
      return res.status(500).json({
        error: 'Erro ao atualizar order',
        details: updateError.message
      });
    }

    console.log('✅ Order atualizada com sucesso');

    return res.status(200).json({
      success: true,
      message: 'Status atualizado com sucesso!',
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.transaction_amount
      },
      order: {
        id: externalReference,
        statusAnterior: order.status,
        statusNovo: internalStatus,
        updated_at: updateData[0]?.updated_at
      }
    });

  } catch (error: any) {
    console.error('Erro ao forçar atualização:', error);
    return res.status(500).json({ 
      error: 'Erro ao forçar atualização',
      details: error.message 
    });
  }
}

