// src/pages/api/pagamento/checkout.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Preference } from 'mercadopago';
import { mercadoPagoClient, validateMercadoPagoConfig } from '@/services/mercado-pago';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { total, orderId, arteCampanhaId, payerData } = req.body; // Recebendo arteCampanhaId

    // 1. Validar dados
    if (!total || !orderId || !payerData) { // arteCampanhaId pode ser null
      return res.status(400).json({ success: false, error: 'Dados incompletos' });
    }

    if (typeof total !== 'number' || total <= 0) {
      return res.status(400).json({ error: 'Total deve ser um número positivo' });
    }

    // Validar configuração do Mercado Pago
    validateMercadoPagoConfig();

    console.log('🛒 Iniciando checkout:', {
      orderId,
      total,
      arteCampanhaId, // Mostrando que recebemos o ID da arte
      hasPayerData: !!payerData
    });

    const preference = new Preference(mercadoPagoClient);

    // URL do webhook - usar variável de ambiente ou construir baseada no origin
    const webhookUrl = process.env.MERCADO_PAGO_WEBHOOK_URL || `${req.headers.origin}/api/pagamento/webhook`;

    console.log("🔔 notification_url do Mercado Pago:", webhookUrl);

    // Configuração da preferência
    const preferenceBody: any = {
      items: [
        {
          title: 'Reserva de espaço na All See',
          quantity: 1,
          unit_price: total,
        },
      ],
      back_urls: {
        success: `${req.headers.origin}/meus-anuncios?orderId=${orderId}&status=success`,
        failure: `${req.headers.origin}/meus-anuncios?orderId=${orderId}&status=failed`,
        pending: `${req.headers.origin}/meus-anuncios?orderId=${orderId}&status=pending`,
      },
      auto_return: 'approved',
      external_reference: orderId,
      payer: payerData,
      notification_url: webhookUrl,
      payment_methods: {
        installments: 12,
        default_installments: 1,
        excluded_payment_methods: [],
        excluded_payment_types: [],
        default_payment_method_id: null
      },
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
      statement_descriptor: 'ALLSEE'
    };

    // Adicionar dados do pagador se disponíveis
    if (payerData) {
      preferenceBody.payer = {
        name: payerData.name || 'Cliente Allsee',
        email: payerData.email || 'cliente@allsee.com',
        identification: payerData.cpf ? {
          type: 'CPF',
          number: payerData.cpf.replace(/\D/g, '')
        } : undefined,
        phone: payerData.telefone ? {
          area_code: payerData.telefone.replace(/\D/g, '').substring(0, 2),
          number: payerData.telefone.replace(/\D/g, '').substring(2)
        } : undefined,
        address: payerData.cep ? {
          zip_code: payerData.cep.replace(/\D/g, ''),
          street_name: preferenceBody.payer.addressJ || '',
          street_number: preferenceBody.payer.numeroJ || '',
          neighborhood: preferenceBody.payer.bairroJ || '',
          city: preferenceBody.payer.cidadeJ || '',
          state: preferenceBody.payer.estadoJ || ''
        } : undefined
      };
    }

    console.log('🔧 Criando preferência no Mercado Pago...');

    const result = await preference.create({
      body: preferenceBody,
    });

    console.log('✅ Preferência criada com sucesso:', {
      preferenceId: result.id,
      initPoint: result.init_point
    });

    return res.status(200).json({ 
      success: true, 
      init_point: result.init_point,
      preference_id: result.id
    });

  } catch (error: any) {
    console.error("❌ Erro no checkout:", error);
    
    // Log detalhado do erro
    if (error.message) {
      console.error('Mensagem de erro:', error.message);
    }
    if (error.cause) {
      console.error('Causa do erro:', error.cause);
    }
    
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
}