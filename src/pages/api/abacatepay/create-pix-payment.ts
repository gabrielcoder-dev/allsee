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
    const pixData = {
      amount: amountInCents,
      description: order.nome_campanha || `Pedido #${orderId} - Campanha ALL SEE`,
      expires_in: ONE_MINUTE * 30, // 30 minutos
      customer: {
        name: customerName,
        email: customerEmail,
        cellphone: customerPhone,
        tax_id: customerTaxId,
      },
      metadata: {
        orderId: orderId.toString(),
        userId: order.id_user?.toString() || '',
      }
    };

    console.log('🔷 Criando pagamento PIX via Abacate Pay:', {
      orderId,
      amount: amountInCents,
      amountFormatted: `R$ ${amount}`
    });

    // Criar pagamento PIX via Abacate Pay
    const response = await fetch(`${ABACATE_PAY_API_URL}/pix/qrcode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ABACATE_PAY_API_KEY}`,
      },
      body: JSON.stringify(pixData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erro na API do Abacate Pay:', errorData);
      return res.status(response.status).json({ 
        success: false, 
        error: `Erro ao criar pagamento: ${errorData}` 
      });
    }

    const pixResult = await response.json();

    console.log('✅ Pagamento PIX criado:', {
      pixId: pixResult.id,
      status: pixResult.status
    });

    // Extrair informações do PIX
    const qrCodeText = pixResult.qr_code || pixResult.qrcode || pixResult.qrCodeText || '';
    const paymentLink = pixResult.payment_link || pixResult.paymentLink || pixResult.link || '';
    const pixId = pixResult.id || pixResult.pix_id || '';

    return res.status(200).json({ 
      success: true,
      billingId: pixId,
      qrCode: qrCodeText,
      qrCodeText: qrCodeText,
      paymentLink: paymentLink,
      status: pixResult.status,
      expiresAt: pixResult.expires_at || pixResult.expiresAt
    });
  } catch (error: any) {
    console.error('❌ Erro ao criar pagamento PIX:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao criar pagamento PIX' 
    });
  }
}

