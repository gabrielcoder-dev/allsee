import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const ABACATE_PAY_API_KEY = process.env.ABACATE_PAY_API_KEY;
const ABACATE_PAY_API_URL = 'https://api.abacatepay.com/v1';
const ONE_MINUTE = 60; // Tempo de expiração em segundos

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Validar se a chave da API está configurada
  if (!ABACATE_PAY_API_KEY) {
    console.error('❌ ABACATE_PAY_API_KEY não está configurada nas variáveis de ambiente');
    return res.status(500).json({ 
      success: false, 
      error: 'Configuração do Abacate Pay não encontrada. Verifique ABACATE_PAY_API_KEY nas variáveis de ambiente.' 
    });
  }

  try {
    const { orderId, amount } = req.body;

    // Validação
    if (!orderId || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'orderId e amount são obrigatórios' 
      });
    }

    // Buscar informações do pedido
    const { data: order, error: orderError } = await supabase
      .from('order')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('❌ Erro ao buscar pedido:', orderError);
      return res.status(404).json({ 
        success: false, 
        error: 'Pedido não encontrado' 
      });
    }

    // Converter amount para centavos (Abacate Pay trabalha com centavos)
    const amountInCents = Math.round(parseFloat(amount) * 100);

    if (amountInCents <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valor deve ser maior que zero' 
      });
    }

    // Preparar dados do cliente
    const customerName = order.nome || order.razao_social || 'Cliente';
    const customerEmail = order.email || '';
    const customerPhone = order.telefone || '';
    const customerTaxId = order.cpf || order.cnpj || '';

    // Preparar dados para criar o pagamento PIX
    const origin = req.headers.origin || 'https://allseeads.com.br';
    
    // Se tiver email, incluir todos os campos obrigatórios do customer
    const customer = customerEmail ? {
      email: customerEmail,
      name: customerName || 'Cliente',
      document: customerTaxId || '',
      phone: customerPhone || '',
    } : undefined;
    
    const billingData: any = {
      frequency: "ONE_TIME",
      methods: ["PIX"],
      products: [
        {
          externalId: `ORDER_${orderId}`,
          name: order.nome_campanha || 'Campanha ALL SEE',
          quantity: 1,
          price: amountInCents
        }
      ],
      returnUrl: `${origin}/metodo-pagamento?orderId=${orderId}`,
      completionUrl: `${origin}/pagamento-concluido?order_id=${orderId}&payment_method=pix`,
      metadata: {
        orderId: orderId.toString(),
        userId: order.id_user?.toString() || '',
      }
    };

    // Adicionar customer apenas se tiver dados completos
    if (customer && customer.email) {
      billingData.customer = customer;
    }

    console.log('🔷 Criando pagamento PIX via Abacate Pay:', {
      orderId,
      amount: amountInCents,
      amountFormatted: `R$ ${amount}`
    });

    // Criar pagamento via Abacate Pay usando billing endpoint
    const response = await fetch(`${ABACATE_PAY_API_URL}/billing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ABACATE_PAY_API_KEY}`,
      },
      body: JSON.stringify(billingData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erro na API do Abacate Pay:', errorData);
      return res.status(response.status).json({ 
        success: false, 
        error: `Erro ao criar pagamento: ${errorData}` 
      });
    }

    const billing = await response.json();

    console.log('✅ Billing criado - resposta completa:', JSON.stringify(billing, null, 2));
    console.log('✅ Pagamento PIX criado:', {
      billingId: billing.id,
      status: billing.status,
      methods: billing.methods,
      pixData: billing.pix
    });

    // Buscar informações do PIX (QR code e link)
    let pixData = null;
    if (billing.id) {
      try {
        // Tentar buscar dados do PIX do billing
        const pixResponse = await fetch(`${ABACATE_PAY_API_URL}/billing/${billing.id}/pix`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ABACATE_PAY_API_KEY}`,
          },
        });

        if (pixResponse.ok) {
          pixData = await pixResponse.json();
        }
      } catch (error) {
        console.error('⚠️ Erro ao buscar dados PIX:', error);
      }
    }

    // Extrair informações do PIX - tentar múltiplas possibilidades
    const qrCodeText = pixData?.qr_code || pixData?.qrCode || pixData?.qrcode || pixData?.qrCodeText || 
                      billing.pix?.qr_code || billing.pix?.qrCode || billing.pix?.qrcode || 
                      billing.qr_code || billing.qrCode || billing.qrcode || '';
    
    const paymentLink = billing.paymentLink || billing.payment_link || billing.link || 
                       pixData?.payment_link || pixData?.paymentLink || pixData?.link || '';

    return res.status(200).json({ 
      success: true,
      billingId: billing.id,
      qrCode: qrCodeText,
      qrCodeText: qrCodeText,
      paymentLink: paymentLink,
      status: billing.status,
      expiresAt: billing.expiresAt || billing.expires_at
    });
  } catch (error: any) {
    console.error('❌ Erro ao criar pagamento PIX:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao criar pagamento PIX' 
    });
  }
}

