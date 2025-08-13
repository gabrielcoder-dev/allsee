import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('📨 Webhook recebido:', {
      method: req.method,
      body: req.body,
      headers: req.headers
    });

    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) {
      console.error('❌ MP_WEBHOOK_SECRET não configurado');
      return res.status(500).json({ error: "Webhook secret not configured" });
    }


  const signature = req.headers["x-signature"] || req.headers["x-mercadopago-signature"];

 
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");


    if (signature !== expectedSignature) {
      console.error('❌ Assinatura inválida:', { signature, expectedSignature });
      return res.status(401).json({ error: "Assinatura inválida" });
    }

    if (req.method !== 'POST') {
      console.error('❌ Método não permitido:', req.method);
      return res.status(405).json({ error: 'Método não permitido' });
    }

    const body = req.body;
    console.log('📋 Body do webhook:', JSON.stringify(body, null, 2));

    if (body.type === 'payment') {
      const paymentId = body.data.id;
      console.log('💳 Processando pagamento ID:', paymentId);

      // Verificar se o token de acesso está configurado
      if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
        console.error('❌ MERCADO_PAGO_ACCESS_TOKEN não configurado');
        return res.status(500).json({ error: 'Token de acesso não configurado' });
      }

      // Buscar detalhes do pagamento no Mercado Pago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        },
      });

      if (!mpResponse.ok) {
        console.error('❌ Erro ao buscar pagamento no MP:', mpResponse.status, mpResponse.statusText);
        return res.status(500).json({ error: 'Erro ao buscar pagamento no Mercado Pago' });
      }

      const payment = await mpResponse.json();
      console.log('📊 Detalhes do pagamento:', payment);

      if (payment.status === 'approved') {
        const orderId = payment.external_reference;
        console.log('✅ Pagamento aprovado, atualizando order:', orderId);

        // Atualizar status do pedido na tabela 'order'
        const { error } = await supabase
          .from('order')
          .update({ status: 'pago' })
          .eq('id', orderId);

        if (error) {
          console.error('❌ Erro ao atualizar pedido:', error);
          return res.status(500).json({ error: 'Erro ao atualizar pedido' });
        }

        console.log(`🎉 Pedido ${orderId} atualizado para PAGO.`);
      } else {
        console.log('⚠️ Pagamento não aprovado, status:', payment.status);
      }
    } else {
      console.log('ℹ️ Tipo de webhook não processado:', body.type);
    }

    console.log('✅ Webhook processado com sucesso');
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 