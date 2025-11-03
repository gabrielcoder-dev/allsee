import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { atualizarStatusCompra } from '@/lib/utils';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;

  try {
    // Verificar webhook secret (você deve adicionar isso no .env)
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(
        req.body as any,
        sig,
        webhookSecret
      );
    } else {
      // Em desenvolvimento, pode usar uma validação mais simples
      // Mas em produção, sempre use o webhook secret
      return res.status(400).json({ error: 'Webhook secret não configurado' });
    }
  } catch (err: any) {
    console.error('❌ Erro ao verificar webhook:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    // Processar diferentes tipos de eventos
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('✅ Pagamento concluído:', {
        sessionId: session.id,
        orderId: session.metadata?.orderId,
        customerEmail: session.customer_email
      });

      const orderId = session.metadata?.orderId;

      if (orderId) {
        // Atualizar status do pedido para "pago"
        try {
          await atualizarStatusCompra(parseInt(orderId, 10), 'pago');
          console.log(`✅ Pedido ${orderId} atualizado para "pago"`);
        } catch (error) {
          console.error(`❌ Erro ao atualizar pedido ${orderId}:`, error);
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('❌ Erro ao processar webhook:', error);
    return res.status(500).json({ error: 'Erro ao processar webhook' });
  }
}

