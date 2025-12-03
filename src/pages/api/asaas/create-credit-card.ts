import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ASAAS_API_URL = process.env.ASAAS_ENVIRONMENT === 'production' 
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_API_KEY = process.env.KEY_API_ASAAS;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { orderId, customer, creditCard, installments = 1 } = req.body;

    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        error: 'orderId é obrigatório' 
      });
    }

    if (!creditCard || !creditCard.holderName || !creditCard.number || !creditCard.expiryMonth || !creditCard.expiryYear || !creditCard.ccv) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dados do cartão de crédito incompletos' 
      });
    }

    if (!ASAAS_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'ASAAS_API_KEY não configurada' 
      });
    }

    // Buscar dados do pedido
    const { data: order, error: orderError } = await supabase
      .from('order')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Pedido não encontrado' 
      });
    }

    // Preparar dados do cliente
    const customerData: any = {
      name: customer?.nome || customer?.razaoSocial || 'Cliente',
      email: customer?.email || order.email || '',
    };

    if (customer?.cpf) customerData.cpfCnpj = customer.cpf;
    if (customer?.cnpj) customerData.cpfCnpj = customer.cnpj;
    if (customer?.telefone) customerData.phone = customer.telefone;
    if (customer?.telefonej) customerData.phone = customer.telefonej;

    // Criar ou buscar cliente no Asaas
    let asaasCustomerId: string | undefined;
    
    try {
      if (customerData.cpfCnpj) {
        const searchResponse = await fetch(
          `${ASAAS_API_URL}/customers?cpfCnpj=${customerData.cpfCnpj}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'access_token': ASAAS_API_KEY,
            },
          }
        );

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.data && searchData.data.length > 0) {
            asaasCustomerId = searchData.data[0].id;
          }
        }
      }
    } catch (error) {
      console.warn('Erro ao buscar cliente, criando novo:', error);
    }

    if (!asaasCustomerId) {
      const createCustomerResponse = await fetch(
        `${ASAAS_API_URL}/customers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access_token': ASAAS_API_KEY,
          },
          body: JSON.stringify(customerData),
        }
      );

      if (!createCustomerResponse.ok) {
        const errorData = await createCustomerResponse.json();
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao criar cliente no Asaas',
          details: errorData
        });
      }

      const customerResult = await createCustomerResponse.json();
      asaasCustomerId = customerResult.id;
    }

    // Criar pagamento com cartão de crédito
    const paymentData = {
      customer: asaasCustomerId,
      billingType: 'CREDIT_CARD',
      value: parseFloat(order.preco || 0).toFixed(2),
      dueDate: new Date().toISOString().split('T')[0],
      description: `Pedido #${orderId} - ${order.nome_campanha || 'Campanha ALL SEE'}`,
      externalReference: orderId.toString(),
      creditCard: {
        holderName: creditCard.holderName,
        number: creditCard.number.replace(/\s/g, ''),
        expiryMonth: String(creditCard.expiryMonth).padStart(2, '0'),
        expiryYear: String(creditCard.expiryYear),
        ccv: creditCard.ccv,
      },
      creditCardHolderInfo: {
        name: customerData.name,
        email: customerData.email,
        cpfCnpj: customerData.cpfCnpj || '',
        postalCode: customer?.cep || customer?.cepJ || '',
        addressNumber: customer?.numero || customer?.numeroJ || '',
        phone: customerData.phone || '',
      },
      installments: installments || 1,
    };

    const createPaymentResponse = await fetch(
      `${ASAAS_API_URL}/payments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
        body: JSON.stringify(paymentData),
      }
    );

    if (!createPaymentResponse.ok) {
      const errorData = await createPaymentResponse.json();
      console.error('Erro ao criar pagamento com cartão:', errorData);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao processar pagamento com cartão',
        details: errorData
      });
    }

    const paymentResult = await createPaymentResponse.json();

    // Salvar ID do pagamento no pedido
    await supabase
      .from('order')
      .update({ 
        asaas_payment_id: paymentResult.id,
        asaas_customer_id: asaasCustomerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    // Verificar status do pagamento
    if (paymentResult.status === 'CONFIRMED') {
      // Atualizar status do pedido para pago
      await supabase
        .from('order')
        .update({ 
          status: 'pago',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
    }

    return res.status(200).json({
      success: true,
      payment: paymentResult,
      paymentId: paymentResult.id,
      status: paymentResult.status,
      paymentLink: paymentResult.invoiceUrl,
    });

  } catch (error: any) {
    console.error('❌ Erro ao processar pagamento com cartão:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro desconhecido ao processar pagamento'
    });
  }
}

