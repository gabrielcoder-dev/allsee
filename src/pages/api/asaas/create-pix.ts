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
        error: 'KEY_API_ASAAS não configurada no ambiente',
        environment: ASAAS_ENVIRONMENT,
        solution: 'Configure a variável de ambiente KEY_API_ASAAS com uma chave válida do Asaas. Para sandbox, obtenha a chave em https://sandbox.asaas.com/'
      });
    }

    // Validar formato básico da chave (chaves do Asaas geralmente começam com letras)
    if (ASAAS_API_KEY.length < 20) {
      return res.status(500).json({ 
        success: false, 
        error: 'Chave de API inválida (formato muito curto)',
        environment: ASAAS_ENVIRONMENT,
        solution: 'Verifique se a chave KEY_API_ASAAS está completa e correta'
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
      console.log(`   Tamanho da chave: ${ASAAS_API_KEY.length} caracteres`);
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
      
      // Verificar se é erro de ambiente
      const isEnvironmentError = errorMessages.includes('não pertence a este ambiente') || 
                                 errorMessages.toLowerCase().includes('invalid_environment') ||
                                 errorsArray.some((e: any) => e.code === 'invalid_environment' || e.code === 'INVALID_ENVIRONMENT');
      
      if (isEnvironmentError) {
        console.error('⚠️ ERRO DE AMBIENTE DETECTADO:');
        console.error(`   Ambiente configurado: ${ASAAS_ENVIRONMENT}`);
        console.error(`   URL da API: ${ASAAS_API_URL}`);
        console.error('   SOLUÇÃO:');
        console.error('   1. Verifique se a chave KEY_API_ASAAS corresponde ao ambiente configurado');
        console.error(`   2. Para sandbox: Acesse https://sandbox.asaas.com/ e gere uma chave de API`);
        console.error('   3. Para produção: Acesse https://www.asaas.com/ e gere uma chave de API');
        console.error('   4. Certifique-se de que ASAAS_ENVIRONMENT e KEY_API_ASAAS estão alinhados');
        
        return res.status(500).json({ 
          success: false, 
          error: `Erro de ambiente: A chave de API não corresponde ao ambiente ${ASAAS_ENVIRONMENT}`,
          details: errorData,
          status,
          statusText,
          environment: ASAAS_ENVIRONMENT,
          hint: `Para resolver: 1) Acesse ${ASAAS_ENVIRONMENT === 'production' ? 'https://www.asaas.com/' : 'https://sandbox.asaas.com/'}, 2) Gere uma chave de API do ambiente ${ASAAS_ENVIRONMENT}, 3) Configure KEY_API_ASAAS com essa chave, 4) Reinicie o servidor`,
          solutionSteps: [
            `Acesse ${ASAAS_ENVIRONMENT === 'production' ? 'https://www.asaas.com/' : 'https://sandbox.asaas.com/'}`,
            'Faça login na sua conta',
            'Vá em Integrações → API',
            `Gere uma nova chave de API (do ambiente ${ASAAS_ENVIRONMENT})`,
            'Copie a chave e configure KEY_API_ASAAS',
            'Reinicie o servidor'
          ]
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        error: errorMessages || 'Erro ao criar pagamento PIX',
        details: errorData,
        status,
        statusText,
        environment: ASAAS_ENVIRONMENT
      });
    }

    const paymentResult = await createPaymentResponse.json();

    // Verificar se o externalReference foi salvo corretamente
    console.log('✅ Pagamento PIX criado no Asaas:', {
      paymentId: paymentResult.id,
      externalReferenceEnviado: paymentData.externalReference,
      externalReferenceRetornado: paymentResult.externalReference,
      orderId: orderId,
      environment: ASAAS_ENVIRONMENT
    });

    // Se o externalReference não foi retornado, avisar
    if (!paymentResult.externalReference) {
      console.warn('⚠️ ATENÇÃO: externalReference não foi retornado na resposta do Asaas!', {
        paymentId: paymentResult.id,
        externalReferenceEnviado: paymentData.externalReference,
        paymentResult: paymentResult
      });
    }

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
    console.log('💾 Salvando asaas_payment_id no pedido:', {
      orderId,
      orderIdType: typeof orderId,
      paymentId: paymentResult.id,
      customerId: asaasCustomerId
    });
    
    // Tentar atualizar com o orderId como está
    let { data: updatedOrder, error: updateError } = await supabase
      .from('order')
      .update({ 
        asaas_payment_id: paymentResult.id,
        asaas_customer_id: asaasCustomerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select('id, asaas_payment_id, asaas_customer_id')
      .single();

    // Se não funcionou, tentar como string ou número
    if (updateError) {
      console.warn('⚠️ Primeira tentativa falhou, tentando formatos alternativos...', {
        error: updateError.message,
        orderId,
        orderIdType: typeof orderId
      });

      // Tentar como string
      const orderIdString = String(orderId);
      const retryUpdate = await supabase
        .from('order')
        .update({ 
          asaas_payment_id: paymentResult.id,
          asaas_customer_id: asaasCustomerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderIdString)
        .select('id, asaas_payment_id, asaas_customer_id')
        .single();

      if (!retryUpdate.error && retryUpdate.data) {
        updatedOrder = retryUpdate.data;
        updateError = null;
        console.log('✅ Sucesso na segunda tentativa (como string)');
      } else if (!isNaN(Number(orderId))) {
        // Tentar como número
        const orderIdNumber = Number(orderId);
        const retryUpdateNumeric = await supabase
          .from('order')
          .update({ 
            asaas_payment_id: paymentResult.id,
            asaas_customer_id: asaasCustomerId,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderIdNumber)
          .select('id, asaas_payment_id, asaas_customer_id')
          .single();

        if (!retryUpdateNumeric.error && retryUpdateNumeric.data) {
          updatedOrder = retryUpdateNumeric.data;
          updateError = null;
          console.log('✅ Sucesso na terceira tentativa (como número)');
        } else {
          updateError = retryUpdateNumeric.error;
        }
      } else {
        updateError = retryUpdate.error;
      }
    }

    if (updateError) {
      console.error('❌ ERRO ao salvar asaas_payment_id:', {
        error: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
        orderId,
        orderIdType: typeof orderId,
        paymentId: paymentResult.id
      });
      // Não retornar erro aqui, apenas logar, pois o pagamento já foi criado no Asaas
    } else {
      console.log('✅ asaas_payment_id salvo com sucesso:', {
        orderId: updatedOrder?.id,
        asaas_payment_id: updatedOrder?.asaas_payment_id,
        asaas_customer_id: updatedOrder?.asaas_customer_id
      });

      // Verificar se realmente foi salvo
      const { data: verifyOrder } = await supabase
        .from('order')
        .select('id, asaas_payment_id')
        .eq('id', orderId)
        .single();

      if (verifyOrder?.asaas_payment_id !== paymentResult.id) {
        console.error('⚠️ ATENÇÃO: Verificação falhou! O asaas_payment_id não foi salvo corretamente.', {
          esperado: paymentResult.id,
          encontrado: verifyOrder?.asaas_payment_id,
          orderId
        });
      } else {
        console.log('✅ Verificação confirmada: asaas_payment_id está salvo corretamente');
      }
    }

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

