import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { Readable } from 'stream';
import { atualizarStatusCompra } from '@/lib/utils';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY não está configurada nas variáveis de ambiente');
}

if (!webhookSecret) {
  console.warn('⚠️ STRIPE_WEBHOOK_SECRET não está configurada. Configure para produção.');
}

const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2025-10-29.clover',
});

export const config = {
  api: {
    bodyParser: false,
  },
};

const RELEVANT_EVENTS: Set<Stripe.Event['type']> = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'payment_intent.succeeded',
  'payment_intent.processing',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'payment_intent.requires_action',
]);

const SUCCESS_EVENTS: Set<Stripe.Event['type']> = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'payment_intent.succeeded',
]);

async function getRawBody(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function extractOrderId(metadata?: Stripe.Metadata | null): string | undefined {
  if (!metadata) return undefined;
  return (
    metadata.orderId ||
    metadata.order_id ||
    metadata.order ||
    metadata.ORDER_ID ||
    metadata.ORDERID ||
    metadata.id_order
  );
}

async function markOrderAsPaid(orderId: string | number) {
  const orderIdStr = typeof orderId === 'string' ? orderId : orderId.toString();
  if (!orderIdStr) {
    throw new Error('orderId vazio ao marcar como pago');
  }
  await atualizarStatusCompra(orderIdStr, 'pago');
  console.log(`✅ Pedido ${orderIdStr} atualizado para "pago"`);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!stripeSecretKey || !webhookSecret) {
    return res.status(500).json({
      error: 'Stripe não configurado corretamente. Verifique STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET.',
    });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('❌ Erro ao verificar webhook da Stripe:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    console.log(`ℹ️ Evento ${event.type} ignorado (não relevante)`);
    return res.status(200).json({ received: true, ignored: true });
  }

  console.log('📥 Evento Stripe recebido:', {
    type: event.type,
    id: event.id,
    created: event.created,
  });

  try {
    let orderId: string | undefined;

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Priorizar metadata.orderId, depois client_reference_id
        // NÃO usar payment_intent como fallback pois não é um UUID válido
        const metadataOrderId = extractOrderId(session.metadata);
        const clientRefId = session.client_reference_id;
        
        orderId = metadataOrderId || clientRefId || undefined;

        console.log('🧾 Dados da sessão:', {
          sessionId: session.id,
          paymentStatus: session.payment_status,
          metadataOrderId,
          clientReferenceId: clientRefId,
          orderId,
        });
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        // Tentar pegar o orderId dos metadados do payment_intent
        // Nota: O Stripe pode copiar automaticamente os metadados da sessão para o payment_intent
        orderId = extractOrderId(paymentIntent.metadata);
        
        // Se não encontrou, logar aviso mas não processar
        // O evento checkout.session.completed já deve ter processado o pagamento
        if (!orderId) {
          console.warn('⚠️ orderId não encontrado nos metadados do payment_intent. O evento checkout.session.completed deve processar este pagamento.');
        }

        console.log('💳 PaymentIntent sucedido:', {
          intentId: paymentIntent.id,
          amountReceived: paymentIntent.amount_received,
          orderId,
          hasMetadata: !!paymentIntent.metadata,
        });
        break;
      }
      case 'payment_intent.processing':
      case 'payment_intent.requires_action': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`⏳ ${event.type}:`, {
          intentId: paymentIntent.id,
          status: paymentIntent.status,
        });
        break;
      }
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled':
      case 'checkout.session.async_payment_failed': {
        const obj = event.data.object as Stripe.PaymentIntent | Stripe.Checkout.Session;
        const failureReason =
          (obj as Stripe.PaymentIntent).last_payment_error?.message ||
          (obj as Stripe.Checkout.Session).payment_status;
        console.warn(`⚠️ Pagamento falhou (${event.type}):`, {
          id: 'id' in obj ? obj.id : undefined,
          reason: failureReason,
          orderId: extractOrderId((obj as any).metadata),
        });
        break;
      }
      default:
        break;
    }

    if (orderId && SUCCESS_EVENTS.has(event.type)) {
      // Validar se o orderId não está vazio antes de tentar atualizar
      // A função atualizarStatusCompra aceita tanto UUID quanto number
      const orderIdStr = typeof orderId === 'string' ? orderId.trim() : String(orderId);
      if (!orderIdStr || orderIdStr === '') {
        console.error('❌ orderId vazio ou inválido:', {
          orderId,
          eventType: event.type,
          eventId: event.id,
        });
        return res.status(400).json({ 
          error: 'orderId inválido', 
          received: true 
        });
      }
      
      try {
        await markOrderAsPaid(orderIdStr);
        console.log(`✅ Webhook processado com sucesso para orderId: ${orderIdStr}`);
      } catch (error: any) {
        console.error('❌ Erro ao marcar pedido como pago:', {
          orderId: orderIdStr,
          error: error.message,
          eventType: event.type,
          eventId: event.id,
        });
        // Não retornar erro 500 aqui, pois o webhook foi recebido corretamente
        // Apenas logar o erro para investigação
      }
    } else if (SUCCESS_EVENTS.has(event.type) && !orderId) {
      console.error('❌ orderId não encontrado nos metadados para evento de sucesso', {
        eventType: event.type,
        eventId: event.id,
        sessionData: event.type.includes('checkout.session') ? {
          metadata: (event.data.object as Stripe.Checkout.Session).metadata,
          clientReferenceId: (event.data.object as Stripe.Checkout.Session).client_reference_id,
        } : undefined,
        paymentIntentData: event.type.includes('payment_intent') ? {
          metadata: (event.data.object as Stripe.PaymentIntent).metadata,
        } : undefined,
      });
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('❌ Erro ao processar evento Stripe:', error);
    return res.status(500).json({ error: 'Erro ao processar webhook', message: error.message });
  }
}

