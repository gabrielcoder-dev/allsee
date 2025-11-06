import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { atualizarStatusCompra } from '@/lib/utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Chave secreta do webhook (se o Abacate Pay usar)
const ABACATE_PAY_WEBHOOK_SECRET = process.env.ABACATE_PAY_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Validar secret do webhook (se configurado)
    if (ABACATE_PAY_WEBHOOK_SECRET) {
      const secret = req.query.secret || req.headers['x-webhook-secret'] || req.headers['abacatepay-secret'];
      
      if (secret !== ABACATE_PAY_WEBHOOK_SECRET) {
        console.error('❌ Secret do webhook inválido');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } else {
      console.warn('⚠️ ABACATE_PAY_WEBHOOK_SECRET não configurado. Webhook sem validação de secret.');
    }

    const event = req.body;

    console.log('📥 Webhook recebido do Abacate Pay:', {
      type: event.type || event.event,
      id: event.id || event.eventId,
      data: event.data ? 'presente' : 'ausente',
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      }
    });

    // Log completo do evento para debug
    console.log('📋 Evento completo:', JSON.stringify(event, null, 2));

    // Verificar tipo de evento - Abacate Pay usa 'billing.paid' para pagamento concluído
    const eventType = event.type || event.event || event.eventType;
    
    // Eventos de pagamento concluído podem ter diferentes nomes:
    // - billing.paid (principal)
    // - payment.completed
    // - pix.paid
    // - payment_succeeded
    const isPaymentCompleted = 
      eventType === 'billing.paid' ||
      eventType === 'payment.completed' ||
      eventType === 'pix.paid' ||
      eventType === 'pix.payment.completed' ||
      eventType === 'billing.payment.completed' ||
      eventType === 'payment_succeeded';

    if (!isPaymentCompleted) {
      console.log(`ℹ️ Evento ignorado: ${eventType}`);
      return res.status(200).json({ received: true, message: 'Evento ignorado' });
    }

    // Extrair dados do pagamento
    // A estrutura pode ser: event.data ou event.data.pixQrCode ou event.data.billing
    const paymentData = event.data || event.payment || event.pix || event.billing || event;
    const pixQrCode = paymentData.pixQrCode || paymentData.pix || paymentData;
    
    console.log('💳 Dados do pagamento:', {
      id: paymentData.id || pixQrCode.id,
      status: paymentData.status || pixQrCode.status,
      amount: paymentData.amount || pixQrCode.amount,
      metadata: paymentData.metadata || pixQrCode.metadata,
      externalId: pixQrCode.externalId
    });

    // Extrair orderId dos metadados ou externalId
    // O Abacate Pay pode retornar o orderId em:
    // - metadata.orderId (que enviamos ao criar o pagamento)
    // - externalId (se configurado)
    // - pixQrCode.externalId (conforme documentação)
    let orderId = paymentData.metadata?.orderId || 
                  pixQrCode.metadata?.orderId ||
                  event.metadata?.orderId ||
                  paymentData.metadata?.order_id ||
                  pixQrCode.metadata?.order_id;

    // Se não encontrou nos metadados, tentar extrair do externalId
    if (!orderId) {
      const externalId = pixQrCode.externalId || paymentData.externalId;
      if (externalId) {
        // Se externalId for "ORDER_123", extrair apenas "123"
        if (typeof externalId === 'string' && externalId.startsWith('ORDER_')) {
          orderId = externalId.replace('ORDER_', '');
        } else {
          orderId = externalId;
        }
      }
    }

    if (!orderId) {
      console.error('❌ orderId não encontrado nos metadados do webhook');
      console.error('Metadados disponíveis:', {
        paymentDataMetadata: paymentData.metadata,
        pixQrCodeMetadata: pixQrCode.metadata,
        eventMetadata: event.metadata,
        externalId: pixQrCode.externalId || paymentData.externalId
      });
      return res.status(400).json({ 
        error: 'orderId não encontrado nos metadados',
        received: true 
      });
    }

    console.log('✅ Pagamento concluído:', {
      paymentId: paymentData.id,
      orderId: orderId,
      status: paymentData.status,
      amount: paymentData.amount
    });

    // Atualizar status do pedido para "pago"
    try {
      const orderIdNumber = parseInt(orderId.toString(), 10);
      
      if (isNaN(orderIdNumber)) {
        throw new Error(`orderId inválido: ${orderId}`);
      }

      await atualizarStatusCompra(orderIdNumber, 'pago');
      console.log(`✅ Pedido ${orderIdNumber} atualizado para "pago"`);
      
      return res.status(200).json({ 
        received: true,
        message: `Pedido ${orderIdNumber} atualizado para "pago"`,
        orderId: orderIdNumber
      });
    } catch (error: any) {
      console.error(`❌ Erro ao atualizar pedido ${orderId}:`, error);
      return res.status(500).json({ 
        error: `Erro ao atualizar pedido: ${error.message}`,
        received: true
      });
    }
  } catch (error: any) {
    console.error('❌ Erro ao processar webhook:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar webhook',
      message: error.message 
    });
  }
}

