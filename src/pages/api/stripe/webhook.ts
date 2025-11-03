import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { atualizarStatusCompra } from '@/lib/utils';

// Validar se as chaves do Stripe estão configuradas
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY não está configurada nas variáveis de ambiente');
}

// STRIPE_WEBHOOK_SECRET é opcional por enquanto, mas recomendado para produção
if (!webhookSecret) {
  console.warn('⚠️ STRIPE_WEBHOOK_SECRET não está configurada. Recomendado para produção.');
}

const stripe = new Stripe(stripeSecretKey || '', {
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

  // Validar se a chave secreta está configurada
  if (!stripeSecretKey) {
    return res.status(500).json({ 
      error: 'Configuração do Stripe não encontrada. Verifique STRIPE_SECRET_KEY nas variáveis de ambiente.' 
    });
  }

  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;

  try {
    // Verificar webhook secret (opcional por enquanto, mas recomendado para produção)
    if (!webhookSecret) {
      console.warn('⚠️ Webhook secret não configurado. Processando sem validação de assinatura.');
      // Em produção, sempre use o webhook secret
      // Por enquanto, vamos apenas logar o evento sem validação
      return res.status(400).json({ 
        error: 'Webhook secret não configurado. Configure STRIPE_WEBHOOK_SECRET para produção.' 
      });
    }

    event = stripe.webhooks.constructEvent(
      req.body as any,
      sig,
      webhookSecret
    );
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

