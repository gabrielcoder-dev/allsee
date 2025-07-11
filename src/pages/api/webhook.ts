import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "Webhook secret not configured" });
  }


  const signature = req.headers["x-signature"] || req.headers["x-mercadopago-signature"];

 
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");


  if (signature !== expectedSignature) {
    return res.status(401).json({ error: "Assinatura inválida" });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const body = req.body;
  console.log('Webhook recebido:', JSON.stringify(body, null, 2));

  if (body.type === 'payment') {
    const paymentId = body.data.id;

    // Buscar detalhes do pagamento no Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
      },
    });

    const payment = await mpResponse.json();
    console.log('Detalhes do pagamento:', payment);

    if (payment.status === 'approved') {
      const orderId = payment.external_reference;

      // Atualizar status do pedido na tabela 'order'
      const { error } = await supabase
        .from('order')
        .update({ status: 'pago' })
        .eq('id', orderId);

      if (error) {
        console.error('Erro ao atualizar pedido:', error);
        return res.status(500).json({ error: 'Erro ao atualizar pedido' });
      }

      console.log(`Pedido ${orderId} atualizado para PAGO.`);
    }
  }

  return res.status(200).json({ received: true });
} 