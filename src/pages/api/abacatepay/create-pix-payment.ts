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

    // Função para limpar e validar CPF/CNPJ (remover caracteres especiais)
    const cleanTaxId = (taxId: string): string | null => {
      if (!taxId) return null;
      // Remove todos os caracteres não numéricos
      const cleaned = taxId.replace(/\D/g, '');
      // Valida se tem 11 dígitos (CPF) ou 14 dígitos (CNPJ)
      if (cleaned.length === 11 || cleaned.length === 14) {
        return cleaned;
      }
      return null;
    };

    // Preparar dados para criar o pagamento PIX
    // Se tiver email, incluir todos os campos obrigatórios do customer
    const cleanedTaxId = cleanTaxId(customerTaxId);
    const cleanedPhone = customerPhone ? customerPhone.replace(/\D/g, '') : '';
    
    const customer = customerEmail ? {
      name: customerName || 'Cliente',
      cellphone: cleanedPhone || '',
      email: customerEmail,
      ...(cleanedTaxId && { taxId: cleanedTaxId }),
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
    console.log('✅ Chaves disponíveis na resposta:', Object.keys(pixResult));

    // Extrair informações do PIX - tentar todas as possibilidades de nomes de campos
    // A API pode retornar: brCode, qrCode, pixQrCode, paymentLink, pixLink, etc.
    const qrCodeText = pixResult.brCode || 
                      pixResult.br_code || 
                      pixResult.pixCode || 
                      pixResult.pix_code ||
                      pixResult.qrCodeText || 
                      pixResult.qr_code_text ||
                      pixResult.code ||
                      '';
    
    const qrCodeBase64 = pixResult.qrCode || 
                        pixResult.qr_code || 
                        pixResult.qrcode || 
                        pixResult.qr_code_base64 ||
                        pixResult.pixQrCode ||
                        pixResult.pix_qr_code ||
                        '';
    
    const paymentLink = pixResult.paymentLink || 
                       pixResult.payment_link || 
                       pixResult.link || 
                       pixResult.pixLink ||
                       pixResult.pix_link ||
                       pixResult.url ||
                       pixResult.checkoutUrl ||
                       pixResult.checkout_url ||
                       '';

    const pixId = pixResult.id || pixResult.pixId || pixResult.pix_id || '';

    console.log('✅ Dados extraídos:', {
      qrCodeText: qrCodeText ? `${qrCodeText.substring(0, 50)}...` : 'VAZIO',
      qrCodeBase64: qrCodeBase64 ? 'PRESENTE' : 'VAZIO',
      paymentLink: paymentLink || 'VAZIO',
      pixId
    });

    // Se não tiver qrCodeText, tentar usar o qrCodeBase64 como fallback
    const finalQrCodeText = qrCodeText || qrCodeBase64;

    if (!finalQrCodeText && !paymentLink) {
      console.error('⚠️ ATENÇÃO: Nenhum código PIX ou link encontrado na resposta!');
      console.error('Resposta completa:', JSON.stringify(pixResult, null, 2));
    }

    return res.status(200).json({ 
      success: true,
      billingId: pixId,
      qrCode: finalQrCodeText,
      qrCodeText: finalQrCodeText,
      qrCodeBase64: qrCodeBase64,
      paymentLink: paymentLink,
      status: pixResult.status,
      expiresAt: pixResult.expiresAt || pixResult.expires_at || pixResult.expiresIn,
      // Incluir resposta completa para debug
      _debug: process.env.NODE_ENV === 'development' ? pixResult : undefined
    });
  } catch (error: any) {
    console.error('❌ Erro ao criar pagamento PIX:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao criar pagamento PIX' 
    });
  }
}

