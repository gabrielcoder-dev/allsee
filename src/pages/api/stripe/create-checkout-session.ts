import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

// Validar se a chave secreta do Stripe está configurada
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY não está configurada nas variáveis de ambiente');
}

const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2025-10-29.clover',
});

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
      success: false, 
      error: 'Configuração do Stripe não encontrada. Verifique STRIPE_SECRET_KEY nas variáveis de ambiente.' 
    });
  }

  try {
    const { orderId, amount, orderData } = req.body;

    // Validação
    if (!orderId || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'orderId e amount são obrigatórios' 
      });
    }

    // Converter amount para centavos (Stripe trabalha com centavos)
    const amountInCents = Math.round(parseFloat(amount) * 100);

    if (amountInCents <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valor deve ser maior que zero' 
      });
    }

    console.log('💳 Criando sessão de checkout Stripe:', {
      orderId,
      amount: amountInCents,
      amountFormatted: `R$ ${amount}`
    });

    // Criar sessão de checkout com suporte para cartão
    // PIX pode ser adicionado depois de ativar no dashboard do Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: orderData?.nome_campanha || 'Campanha ALL SEE',
              description: `Pedido #${orderId} - Campanha publicitária`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin || 'https://allseeads.com.br'}/pagamento-concluido?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${req.headers.origin || 'https://allseeads.com.br'}/pagamento?canceled=true`,
      client_reference_id: orderId.toString(), // Garantir que o orderId esteja disponível no webhook
      metadata: {
        orderId: orderId.toString(),
        userId: orderData?.id_user || '',
      },
      customer_email: orderData?.email || undefined,
    });

    console.log('✅ Sessão de checkout criada:', {
      sessionId: session.id,
      url: session.url
    });

    return res.status(200).json({ 
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error: any) {
    console.error('❌ Erro ao criar sessão de checkout:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao criar sessão de pagamento' 
    });
  }
}

