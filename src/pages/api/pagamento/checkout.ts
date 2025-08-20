import type { NextApiRequest, NextApiResponse } from 'next';
import { Preference } from 'mercadopago';
import { mercadoPagoClient, validateMercadoPagoConfig } from '@/services/mercado-pago';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { total, orderId, payerData } = req.body;

    // Validações
    if (!total || !orderId) {
      return res.status(400).json({ error: 'Total e orderId são obrigatórios' });
    }

    if (typeof total !== 'number' || total <= 0) {
      return res.status(400).json({ error: 'Total deve ser um número positivo' });
    }

    // Validar configuração do Mercado Pago
    validateMercadoPagoConfig();

    console.log('🛒 Iniciando checkout:', {
      orderId,
      total,
      hasPayerData: !!payerData
    });

    const preference = new Preference(mercadoPagoClient);

    // Resolver URL do webhook (sempre absoluta)
    const envWebhookUrl = process.env.MERCADO_PAGO_WEBHOOK_URL;
    const forwardedProto = (req.headers["x-forwarded-proto"] as string) || (req.headers["x-forwarded-protocol"] as string);
    const proto = envWebhookUrl ? undefined : (forwardedProto || (req.headers.origin?.toString().startsWith("http") ? new URL(req.headers.origin as string).protocol.replace(":", "") : undefined) || (process.env.NODE_ENV === "development" ? "http" : "https"));
    const host = envWebhookUrl ? undefined : ((req.headers["x-forwarded-host"] as string) || req.headers.host);
    const computedWebhookUrl = envWebhookUrl || (proto && host ? `${proto}://${host}/api/pagamento/webhook` : `${req.headers.origin}/api/pagamento/webhook`);

    console.log("🔔 notification_url do Mercado Pago:", {
      envWebhookUrl: !!envWebhookUrl,
      computedWebhookUrl
    });

    // Configuração da preferência
    const preferenceBody: any = {
      items: [
        {
          id: `order-${orderId}`,
          title: 'Anúncio Allsee',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: total,
        },
      ],
      back_urls: {
        success: `${req.headers.origin}/pagamento-concluido?orderId=${orderId}`,
        failure: `${req.headers.origin}/pagamento-concluido?orderId=${orderId}&status=failed`,
        pending: `${req.headers.origin}/pagamento-concluido?orderId=${orderId}&status=pending`,
      },
      auto_return: 'approved',
      external_reference: orderId,
      notification_url: computedWebhookUrl,
      payment_methods: {
        installments: 1,
        default_installments: 1
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
          street_name: payerData.endereco || '',
          street_number: payerData.numero || '',
          neighborhood: payerData.bairro || '',
          city: payerData.cidade || '',
          state: payerData.estado || ''
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
    console.error('❌ Erro no checkout:', error);
    
    // Log detalhado do erro
    if (error.message) {
      console.error('Mensagem de erro:', error.message);
    }
    if (error.cause) {
      console.error('Causa do erro:', error.cause);
    }
    
    return res.status(500).json({ 
      error: 'Erro ao processar checkout',
      details: error.message || 'Erro desconhecido'
    });
  }
}
