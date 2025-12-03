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

interface CustomerData {
  name: string;
  email: string;
  phone?: string;
  cpfCnpj?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { orderId, paymentMethod, customer, billingType } = req.body;

    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        error: 'orderId é obrigatório' 
      });
    }

    if (!paymentMethod || !['PIX', 'CREDIT_CARD', 'BOLETO'].includes(paymentMethod)) {
      return res.status(400).json({ 
        success: false, 
        error: 'paymentMethod deve ser PIX, CREDIT_CARD ou BOLETO' 
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

    // Preparar dados do cliente para Asaas
    const customerData: CustomerData = {
      name: customer?.nome || customer?.razaoSocial || 'Cliente',
      email: customer?.email || order.email || '',
      phone: customer?.telefone || customer?.telefonej || '',
      cpfCnpj: customer?.cpf || customer?.cnpj || '',
      postalCode: customer?.cep || customer?.cepJ || '',
      address: customer?.endereco || customer?.enderecoJ || '',
      addressNumber: customer?.numero || customer?.numeroJ || '',
      complement: customer?.complemento || customer?.complementoJ || '',
      province: customer?.bairro || customer?.bairroJ || '',
      city: customer?.cidade || customer?.cidadeJ || '',
      state: customer?.estado || customer?.estadoJ || '',
    };

    // Criar ou buscar cliente no Asaas
    let asaasCustomerId: string | undefined;
    
    try {
      // Tentar buscar cliente existente por CPF/CNPJ
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
    } catch (error: any) {
      console.warn('⚠️ Erro ao buscar cliente existente, criando novo:', {
        message: error.message,
        customerData: { cpfCnpj: customerData.cpfCnpj },
        error
      });
    }

    // Se não encontrou cliente, criar novo
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
        const errorData = await createCustomerResponse.json().catch(() => ({ message: 'Erro ao parsear resposta de erro' }));
        const statusText = createCustomerResponse.statusText;
        const status = createCustomerResponse.status;
        
        // Extrair erros do array se existir
        const errorsArray = errorData?.errors || errorData?.error || [];
        const errorMessages = Array.isArray(errorsArray) 
          ? errorsArray.map((err: any) => err.description || err.message || err.code || JSON.stringify(err)).join('; ')
          : (typeof errorsArray === 'string' ? errorsArray : JSON.stringify(errorsArray));
        
        console.error('❌ Erro ao criar cliente no Asaas:', {
          status,
          statusText,
          url: `${ASAAS_API_URL}/customers`,
          customerData,
          errorData: JSON.parse(JSON.stringify(errorData)), // Garantir que arrays sejam expandidos
          errorsArray: errorsArray,
          errorMessages: errorMessages,
          responseHeaders: Object.fromEntries(createCustomerResponse.headers.entries())
        });
        
        // Logar cada erro individualmente se for array
        if (Array.isArray(errorsArray) && errorsArray.length > 0) {
          console.error('📋 Detalhes dos erros do Asaas:');
          errorsArray.forEach((err: any, index: number) => {
            console.error(`  Erro ${index + 1}:`, JSON.parse(JSON.stringify(err)));
          });
        }
        
        return res.status(500).json({ 
          success: false, 
          error: errorMessages || 'Erro ao criar cliente no Asaas',
          details: errorData,
          status,
          statusText
        });
      }

      const customerResult = await createCustomerResponse.json();
      asaasCustomerId = customerResult.id;
    }

    // Preparar dados do pagamento
    const paymentData: any = {
      customer: asaasCustomerId,
      billingType: billingType || paymentMethod,
      value: parseFloat(order.preco || 0).toFixed(2),
      dueDate: new Date(Date.now() + (paymentMethod === 'BOLETO' ? 3 : 1) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // Formato YYYY-MM-DD
      description: `Pedido #${orderId} - ${order.nome_campanha || 'Campanha ALL SEE'}`,
      externalReference: orderId.toString(),
    };

    // Configurações específicas por tipo de pagamento
    if (paymentMethod === 'PIX') {
      paymentData.billingType = 'PIX';
    } else if (paymentMethod === 'BOLETO') {
      paymentData.billingType = 'BOLETO';
    } else if (paymentMethod === 'CREDIT_CARD') {
      paymentData.billingType = 'CREDIT_CARD';
      
      // Se tiver dados do cartão na requisição
      if (req.body.creditCard) {
        paymentData.creditCard = req.body.creditCard;
      }
    }

    // Criar pagamento no Asaas
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
      const errorData = await createPaymentResponse.json().catch(() => ({ message: 'Erro ao parsear resposta de erro' }));
      const statusText = createPaymentResponse.statusText;
      const status = createPaymentResponse.status;
      
      // Extrair erros do array se existir
      const errorsArray = errorData?.errors || errorData?.error || [];
      const errorMessages = Array.isArray(errorsArray) 
        ? errorsArray.map((err: any) => err.description || err.message || err.code || JSON.stringify(err)).join('; ')
        : (typeof errorsArray === 'string' ? errorsArray : JSON.stringify(errorsArray));
      
      console.error('❌ Erro ao criar pagamento no Asaas:', {
        status,
        statusText,
        url: `${ASAAS_API_URL}/payments`,
        paymentData,
        errorData: JSON.parse(JSON.stringify(errorData)), // Garantir que arrays sejam expandidos
        errorsArray: errorsArray,
        errorMessages: errorMessages,
        orderId,
        asaasCustomerId,
        paymentMethod,
        responseHeaders: Object.fromEntries(createPaymentResponse.headers.entries())
      });
      
      // Logar cada erro individualmente se for array
      if (Array.isArray(errorsArray) && errorsArray.length > 0) {
        console.error('📋 Detalhes dos erros do Asaas:');
        errorsArray.forEach((err: any, index: number) => {
          console.error(`  Erro ${index + 1}:`, JSON.parse(JSON.stringify(err)));
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        error: errorMessages || 'Erro ao criar pagamento no Asaas',
        details: errorData,
        status,
        statusText
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

    return res.status(200).json({
      success: true,
      payment: paymentResult,
      paymentId: paymentResult.id,
      customerId: asaasCustomerId,
    });

  } catch (error: any) {
    console.error('❌ Erro inesperado ao criar pagamento:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      orderId: req.body?.orderId,
      paymentMethod: req.body?.paymentMethod,
      customer: req.body?.customer,
      fullError: error
    });
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro desconhecido ao criar pagamento',
      details: process.env.NODE_ENV === 'development' ? { stack: error.stack, name: error.name } : undefined
    });
  }
}

