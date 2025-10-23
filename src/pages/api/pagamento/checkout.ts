// src/pages/api/pagamento/checkout.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Preference } from 'mercadopago';
import { mercadoPagoClient, validateMercadoPagoConfig } from '@/services/mercado-pago';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { total, orderId, arteCampanhaId, payerData } = req.body;

    // 🧩 Validação básica
    if (!total || !orderId || !payerData) {
      return res.status(400).json({ success: false, error: 'Dados incompletos' });
    }

    if (typeof total !== 'number' || total <= 0) {
      return res.status(400).json({ success: false, error: 'Total deve ser um número positivo' });
    }

    // 🔧 Validar config do Mercado Pago
    validateMercadoPagoConfig();

    console.log('🛒 Iniciando checkout:', {
      orderId,
      total,
      arteCampanhaId,
      payerData,
    });

    // 🔗 URL do webhook
    const webhookUrl =
      process.env.MERCADO_PAGO_WEBHOOK_URL ||
      `${req.headers.origin}/api/pagamento/webhook`;

    console.log('🔔 notification_url do Mercado Pago:', webhookUrl);

    // 🧾 Criar corpo da preferência
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
      external_reference: orderId.toString(),
      notification_url: webhookUrl,
      payment_methods: {
        installments: 12,
        default_installments: 1,
      },
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // expira em 30 min
      statement_descriptor: 'ALLSEE',
      payer: {
        name: payerData.name || 'Cliente Allsee',
        email: payerData.email || 'cliente@allsee.com',
      },
    };

    // 🔎 Adicionar dados opcionais do pagador
    if (payerData.cpf) {
      preferenceBody.payer.identification = {
        type: 'CPF',
        number: payerData.cpf.replace(/\D/g, ''),
      };
    }
    if (payerData.telefone) {
      preferenceBody.payer.phone = {
        area_code: payerData.telefone.replace(/\D/g, '').substring(0, 2),
        number: payerData.telefone.replace(/\D/g, '').substring(2),
      };
    }
    if (payerData.cep) {
      preferenceBody.payer.address = {
        zip_code: payerData.cep.replace(/\D/g, ''),
        street_name: payerData.rua || '',
        street_number: payerData.numero || '',
        neighborhood: payerData.bairro || '',
        city: payerData.cidade || '',
        state: payerData.estado || '',
      };
    }

    console.log('📋 external_reference enviado ao Mercado Pago:', preferenceBody.external_reference);

    // 💳 Criar preferência no Mercado Pago
    const preference = new Preference(mercadoPagoClient);
    const result = await preference.create({ body: preferenceBody });

    console.log('✅ Preferência criada com sucesso:', {
      preferenceId: result.id,
      initPoint: result.init_point,
    });

    return res.status(200).json({
      success: true,
      init_point: result.init_point,
      preference_id: result.id,
    });
  } catch (error: any) {
    console.error('❌ Erro no checkout:', error);

    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error?.message || null,
    });
  }
}
