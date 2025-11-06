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
    // Se tiver email, incluir todos os campos obrigatórios do customer
    const customer = customerEmail ? {
      name: customerName || 'Cliente',
      cellphone: customerPhone || '',
      email: customerEmail,
      taxId: customerTaxId || '',
    } : undefined;
    
    const pixData: any = {
      amount: amountInCents,
      expiresIn: ONE_MINUTE * 30, // 30 minutos em segundos
      description: order.nome_campanha || `Pedido #${orderId} - Campanha ALL SEE`,
      metadata: {
        orderId: orderId.toString(),
        userId: order.id_user?.toString() || '',
        externalId: `ORDER_${orderId}`
      }
    };

    // Adicionar customer apenas se tiver dados completos
    if (customer && customer.email && customer.name) {
      pixData.customer = customer;
    }

    console.log('🔷 Criando pagamento PIX via Abacate Pay:', {
      orderId,
      amount: amountInCents,
      amountFormatted: `R$ ${amount}`,
      endpoint: `${ABACATE_PAY_API_URL}/pixQrCode/create`
    });

    // Criar pagamento PIX via Abacate Pay usando o endpoint correto
    const response = await fetch(`${ABACATE_PAY_API_URL}/pixQrCode/create`, {
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

    console.log('✅ PIX criado - resposta completa:', JSON.stringify(pixResult, null, 2));
    console.log('✅ Pagamento PIX criado:', {
      pixId: pixResult.id,
      status: pixResult.status
    });

    // Extrair informações do PIX - estrutura da resposta da API Abacate Pay
    // A API retorna: qrCode (base64), brCode (string do PIX), paymentLink, etc.
    const qrCodeText = pixResult.brCode || pixResult.qrCode || pixResult.qrcode || pixResult.qrCodeText || '';
    const qrCodeBase64 = pixResult.qrCode || pixResult.qr_code_base64 || '';
    const paymentLink = pixResult.paymentLink || pixResult.payment_link || pixResult.link || pixResult.pixLink || '';
    const pixId = pixResult.id || '';

    return res.status(200).json({ 
      success: true,
      billingId: pixId,
      qrCode: qrCodeText || qrCodeBase64,
      qrCodeText: qrCodeText,
      qrCodeBase64: qrCodeBase64,
      paymentLink: paymentLink,
      status: pixResult.status,
      expiresAt: pixResult.expiresAt || pixResult.expires_at
    });
  } catch (error: any) {
    console.error('❌ Erro ao criar pagamento PIX:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao criar pagamento PIX' 
    });
  }
}

