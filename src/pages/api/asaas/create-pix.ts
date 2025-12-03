import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ASAAS_ENVIRONMENT = process.env.ASAAS_ENVIRONMENT || 'sandbox';
const ASAAS_API_URL = ASAAS_ENVIRONMENT === 'production' 
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
    const { orderId, customer } = req.body;

    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        error: 'orderId é obrigatório' 
      });
    }

    if (!ASAAS_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'ASAAS_API_KEY não configurada' 
      });
    }

    // Log do ambiente sendo usado (sem expor a chave)
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔧 CONFIGURAÇÃO ASAAS:');
    console.log(`   Ambiente: ${ASAAS_ENVIRONMENT.toUpperCase()}`);
    console.log(`   URL da API: ${ASAAS_API_URL}`);
    console.log(`   Chave configurada: ${ASAAS_API_KEY ? 'SIM' : 'NÃO'}`);
    if (ASAAS_API_KEY) {
      console.log(`   Prefixo da chave: ${ASAAS_API_KEY.substring(0, 15)}...`);
    }
    console.log('═══════════════════════════════════════════════════════');

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
    } catch (error: any) {
      console.warn('⚠️ Erro ao buscar cliente existente, criando novo:', {
        message: error.message,
        customerData: { cpfCnpj: customerData.cpfCnpj },
        error
      });
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
          environment: ASAAS_ENVIRONMENT,
          apiUrl: ASAAS_API_URL,
          url: `${ASAAS_API_URL}/customers`,
          customerData,
          errorData: JSON.parse(JSON.stringify(errorData)), // Garantir que arrays sejam expandidos
          errorsArray: errorsArray,
          errorMessages: errorMessages,
          responseHeaders: Object.fromEntries(createCustomerResponse.headers.entries())
        });
        
        // Se o erro for de ambiente inválido, adicionar mensagem mais clara
        if (errorMessages.includes('não pertence a este ambiente') || errorsArray.some((e: any) => e.code === 'invalid_environment')) {
          console.error('⚠️ ATENÇÃO: A chave de API não corresponde ao ambiente configurado!');
          console.error(`   Ambiente configurado: ${ASAAS_ENVIRONMENT}`);
          console.error(`   URL da API: ${ASAAS_API_URL}`);
          console.error(`   Solução: Verifique se a chave KEY_API_ASAAS corresponde ao ambiente ${ASAAS_ENVIRONMENT}`);
          console.error(`   - Se ambiente é "sandbox", use chave de sandbox`);
          console.error(`   - Se ambiente é "production", use chave de produção`);
        }
        
        // Logar cada erro individualmente se for array
        if (Array.isArray(errorsArray) && errorsArray.length > 0) {
          console.error('📋 Detalhes dos erros do Asaas:');
          errorsArray.forEach((err: any, index: number) => {
            console.error(`  Erro ${index + 1}:`, JSON.parse(JSON.stringify(err)));
          });
        }
        
        // Mensagem de erro mais clara para erro de ambiente
        let finalErrorMessage = errorMessages || 'Erro ao criar cliente no Asaas';
        if (errorMessages.includes('não pertence a este ambiente') || errorsArray.some((e: any) => e.code === 'invalid_environment')) {
          finalErrorMessage = `Erro de ambiente: A chave de API não corresponde ao ambiente configurado (${ASAAS_ENVIRONMENT}). Verifique se KEY_API_ASAAS está correta para este ambiente.`;
        }
        
        return res.status(500).json({ 
          success: false, 
          error: finalErrorMessage,
          details: errorData,
          status,
          statusText,
          environment: ASAAS_ENVIRONMENT,
          hint: errorMessages.includes('não pertence a este ambiente') 
            ? `Verifique se a chave KEY_API_ASAAS corresponde ao ambiente ${ASAAS_ENVIRONMENT}. Configure ASAAS_ENVIRONMENT=sandbox para testes ou ASAAS_ENVIRONMENT=production para produção.`
            : undefined
        });
      }

      const customerResult = await createCustomerResponse.json();
      asaasCustomerId = customerResult.id;
    }

    // Criar pagamento PIX
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const paymentData = {
      customer: asaasCustomerId,
      billingType: 'PIX',
      value: parseFloat(order.preco || 0).toFixed(2),
      dueDate: tomorrow.toISOString().split('T')[0],
      description: `Pedido #${orderId} - ${order.nome_campanha || 'Campanha ALL SEE'}`,
      externalReference: orderId.toString(),
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
      const errorData = await createPaymentResponse.json().catch(() => ({ message: 'Erro ao parsear resposta de erro' }));
      const statusText = createPaymentResponse.statusText;
      const status = createPaymentResponse.status;
      
      // Extrair erros do array se existir
      const errorsArray = errorData?.errors || errorData?.error || [];
      const errorMessages = Array.isArray(errorsArray) 
        ? errorsArray.map((err: any) => err.description || err.message || err.code || JSON.stringify(err)).join('; ')
        : (typeof errorsArray === 'string' ? errorsArray : JSON.stringify(errorsArray));
      
      console.error('❌ Erro ao criar pagamento PIX:', {
        status,
        statusText,
        url: `${ASAAS_API_URL}/payments`,
        paymentData,
        errorData: JSON.parse(JSON.stringify(errorData)), // Garantir que arrays sejam expandidos
        errorsArray: errorsArray,
        errorMessages: errorMessages,
        orderId,
        asaasCustomerId,
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
        error: errorMessages || 'Erro ao criar pagamento PIX',
        details: errorData,
        status,
        statusText
      });
    }

    const paymentResult = await createPaymentResponse.json();

    // Extrair dados do PIX do resultado
    // O Asaas retorna o QR Code em diferentes formatos dependendo da API
    let pixQrCode = paymentResult.pixQrCode || paymentResult.encodedImage;
    let pixCopyPaste = paymentResult.pixCopyPaste || paymentResult.payload || paymentResult.pixCopiaECola;

    // Se não veio no resultado, tentar buscar separadamente
    if (!pixCopyPaste && paymentResult.id) {
      try {
        // Aguardar um pouco para o PIX ser processado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const qrCodeResponse = await fetch(
          `${ASAAS_API_URL}/payments/${paymentResult.id}/pixQrCode`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'access_token': ASAAS_API_KEY,
            },
          }
        );

        if (qrCodeResponse.ok) {
          const qrCodeData = await qrCodeResponse.json();
          pixQrCode = qrCodeData.encodedImage || qrCodeData.pixQrCode;
          pixCopyPaste = qrCodeData.payload || qrCodeData.pixCopyPaste || qrCodeData.pixCopiaECola;
        }
      } catch (error: any) {
        console.warn('⚠️ Erro ao buscar QR Code separadamente:', {
          message: error.message,
          paymentId: paymentResult.id,
          error
        });
      }
    }

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
      qrCode: pixQrCode,
      qrCodeText: pixCopyPaste || paymentResult.pixCopyPaste,
      paymentLink: paymentResult.invoiceUrl,
      billingId: paymentResult.id,
      payment: paymentResult,
    });

  } catch (error: any) {
    console.error('❌ Erro inesperado ao criar pagamento PIX:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      orderId: req.body?.orderId,
      customer: req.body?.customer,
      fullError: error
    });
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro desconhecido ao criar pagamento PIX',
      details: process.env.NODE_ENV === 'development' ? { stack: error.stack, name: error.name } : undefined
    });
  }
}

