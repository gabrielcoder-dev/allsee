import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { atualizarStatusCompra } from '@/lib/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ASAAS_ENVIRONMENT = process.env.ASAAS_ENVIRONMENT || 'sandbox';
const ASAAS_API_URL = ASAAS_ENVIRONMENT === 'production' 
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_API_KEY = process.env.KEY_API_ASAAS;

// Função auxiliar para criar nota fiscal automaticamente para pessoa jurídica
async function criarNotaFiscalAutomatica(order: any, paymentId: string) {
  console.log('='.repeat(80));
  console.log('🔍 VERIFICANDO SE DEVE CRIAR NOTA FISCAL');
  console.log('='.repeat(80));
  console.log('📋 Dados do order recebidos:', {
    id: order?.id,
    cnpj: order?.cnpj,
    cpf: order?.cpf,
    razao_social: order?.razao_social,
    preco: order?.preco,
    nome_campanha: order?.nome_campanha,
    email: order?.email,
    telefone: order?.telefone,
    cep: order?.cep,
    endereco: order?.endereco,
    cidade: order?.cidade,
    estado: order?.estado,
    hasCnpj: !!order?.cnpj,
    hasCpf: !!order?.cpf,
    cnpjType: typeof order?.cnpj,
    cnpjValue: order?.cnpj,
    cpfValue: order?.cpf
  });
  console.log('📋 Payment ID:', paymentId);
  console.log('📋 ASAAS_API_KEY configurada:', !!ASAAS_API_KEY);
  
  // Verificar se é pessoa jurídica (tem CNPJ válido e não tem CPF)
  const cnpjValido = order?.cnpj && 
                      typeof order.cnpj === 'string' && 
                      order.cnpj.trim().length > 0 &&
                      order.cnpj !== 'null' &&
                      order.cnpj !== 'undefined';
  
  const temCpf = order?.cpf && 
                 typeof order.cpf === 'string' && 
                 order.cpf.trim().length > 0 &&
                 order.cpf !== 'null' &&
                 order.cpf !== 'undefined';
  
  const isPessoaJuridica = cnpjValido && !temCpf;
  
  console.log('📋 Verificação:', {
    cnpjValido,
    temCpf,
    isPessoaJuridica,
    paymentIdValido: !!paymentId,
    apiKeyValida: !!ASAAS_API_KEY
  });
  
  if (!isPessoaJuridica || !paymentId || !ASAAS_API_KEY) {
    if (!isPessoaJuridica) {
      console.log('ℹ️ Pessoa física detectada ou CNPJ inválido - Nota fiscal não será criada automaticamente');
      console.log('📋 Motivo:', {
        cnpjValido,
        temCpf,
        cnpj: order?.cnpj,
        cpf: order?.cpf
      });
    }
    if (!paymentId) {
      console.log('⚠️ Payment ID não fornecido');
    }
    if (!ASAAS_API_KEY) {
      console.log('⚠️ ASAAS_API_KEY não configurada');
    }
    return { success: false, reason: !isPessoaJuridica ? 'pessoa_fisica' : 'payment_id_ou_api_key_ausente' };
  }

  console.log('='.repeat(80));
  console.log('📄 PESSOA JURÍDICA DETECTADA - Criando nota fiscal automaticamente');
  console.log('='.repeat(80));
  console.log('📋 CNPJ:', order.cnpj);
  console.log('📋 Razão Social:', order.razao_social);
  console.log('📋 Payment ID:', paymentId);
  console.log('📋 Valor:', order.preco);
  console.log('📋 Campanha:', order.nome_campanha);
  
  try {
    // Primeiro, verificar se o payment existe e buscar informações do customer
    console.log('🔍 Verificando payment no Asaas...');
    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json().catch(() => ({}));
      console.error('❌ Erro ao buscar payment:', errorData);
      return { 
        success: false, 
        error: `Payment não encontrado: ${errorData.message || 'Erro ao buscar payment'}`,
        details: errorData
      };
    }

    const paymentData = await paymentResponse.json();
    console.log('✅ Payment encontrado:', {
      id: paymentData.id,
      customer: paymentData.customer,
      status: paymentData.status,
      value: paymentData.value,
      deleted: paymentData.deleted
    });

    // Verificar se o payment está deletado - se sim, não criar nota fiscal
    if (paymentData.deleted === true) {
      console.log('⚠️ Pagamento está deletado - Não será criada nota fiscal');
      return { 
        success: false, 
        reason: 'payment_deleted',
        error: 'Não é possível criar nota fiscal para pagamento deletado'
      };
    }

    // Verificar se o customer existe e tem dados completos
    const customerId = paymentData.customer;
    if (customerId) {
      console.log('🔍 Verificando customer no Asaas...');
      const customerResponse = await fetch(`${ASAAS_API_URL}/customers/${customerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
      });

      if (customerResponse.ok) {
        const customerData = await customerResponse.json();
        console.log('✅ Customer encontrado:', {
          id: customerData.id,
          name: customerData.name,
          cpfCnpj: customerData.cpfCnpj,
          hasAddress: !!(customerData.postalCode && customerData.address)
        });

        // Verificar se o customer precisa ser atualizado com dados completos
        const needsUpdate = !customerData.postalCode || !customerData.address || !customerData.city || !customerData.state;
        
        if (needsUpdate && order.cep && order.endereco && order.cidade && order.estado) {
          console.log('🔄 Atualizando customer com dados completos...');
          const updateCustomerData = {
            name: order.razao_social || customerData.name,
            cpfCnpj: order.cnpj,
            email: order.email || customerData.email,
            phone: order.telefone || customerData.phone,
            postalCode: order.cep,
            address: order.endereco,
            addressNumber: order.numero || '',
            complement: order.complemento || '',
            province: order.bairro || '',
            city: order.cidade,
            state: order.estado,
          };

          const updateResponse = await fetch(`${ASAAS_API_URL}/customers/${customerId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'access_token': ASAAS_API_KEY,
            },
            body: JSON.stringify(updateCustomerData),
          });

          if (updateResponse.ok) {
            console.log('✅ Customer atualizado com sucesso');
          } else {
            const updateError = await updateResponse.json().catch(() => ({}));
            console.warn('⚠️ Erro ao atualizar customer, continuando mesmo assim:', updateError);
          }
        }
      }
    }

    // Buscar serviços municipais cadastrados no Asaas
    console.log('🔍 Buscando serviços municipais cadastrados no Asaas...');
    let municipalServiceId: string | null = null;
    let municipalServiceName: string | null = null;
    
    // Primeiro, tentar usar variável de ambiente se configurada
    if (process.env.ASAAS_MUNICIPAL_SERVICE_ID) {
      const envValue = process.env.ASAAS_MUNICIPAL_SERVICE_ID;
      console.log('✅ Usando valor da variável de ambiente ASAAS_MUNICIPAL_SERVICE_ID:', envValue);
      
      // Buscar serviços municipais para encontrar o serviço correspondente
      const endpoints = [
        `${ASAAS_API_URL}/municipalServices`,
        `${ASAAS_API_URL}/invoices/municipalServices`,
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Buscando serviço municipal em: ${endpoint}`);
          const servicesResponse = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'access_token': ASAAS_API_KEY,
            },
          });

          if (servicesResponse.ok) {
            const servicesData = await servicesResponse.json();
            const services = servicesData.data || servicesData || [];
            
            if (Array.isArray(services)) {
              // Procurar o serviço pelo ID OU pelo código
              // Pode ser que a variável contenha o ID (ex: "76174") ou o código (ex: "17.06")
              const foundService = services.find((s: any) => 
                s.id === envValue || 
                s.id === String(envValue) ||
                s.code === envValue ||
                s.municipalServiceCode === envValue ||
                String(s.code) === String(envValue) ||
                String(s.municipalServiceCode) === String(envValue)
              );
              
              if (foundService) {
                municipalServiceId = foundService.id; // Sempre usar o ID interno do Asaas
                municipalServiceName = foundService.municipalServiceName || 
                                      foundService.name || 
                                      foundService.description || 
                                      null;
                console.log('✅ Serviço municipal encontrado:', {
                  valorProcurado: envValue,
                  idEncontrado: municipalServiceId,
                  codigo: foundService.code || foundService.municipalServiceCode,
                  name: municipalServiceName
                });
                break;
              }
            }
          }
        } catch (servicesError: any) {
          console.warn(`⚠️ Erro ao buscar serviço em ${endpoint}:`, servicesError.message);
        }
      }
      
      // Se não encontrou pelo código, assumir que o valor da variável é o ID
      if (!municipalServiceId) {
        console.log('⚠️ Serviço não encontrado pelo código, assumindo que o valor é o ID interno');
        municipalServiceId = envValue;
        
        // Tentar buscar o nome do serviço imediatamente usando o ID assumido
        if (!municipalServiceName) {
          console.log('🔍 Tentando buscar nome do serviço usando o ID assumido:', municipalServiceId);
          const endpoints = [
            `${ASAAS_API_URL}/municipalServices`,
            `${ASAAS_API_URL}/invoices/municipalServices`,
          ];

          for (const endpoint of endpoints) {
            try {
              const servicesResponse = await fetch(endpoint, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'access_token': ASAAS_API_KEY,
                },
              });

              if (servicesResponse.ok) {
                const servicesData = await servicesResponse.json();
                const services = servicesData.data || servicesData || [];
                
                if (Array.isArray(services)) {
                  const foundService = services.find((s: any) => 
                    s.id === municipalServiceId || 
                    s.id === String(municipalServiceId) ||
                    s.code === municipalServiceId ||
                    s.municipalServiceCode === municipalServiceId ||
                    String(s.code) === String(municipalServiceId) ||
                    String(s.municipalServiceCode) === String(municipalServiceId)
                  );
                  
                  if (foundService) {
                    // Atualizar o ID para o ID interno do Asaas se encontrou pelo código
                    if (foundService.id !== municipalServiceId) {
                      municipalServiceId = foundService.id;
                      console.log('✅ ID atualizado para o ID interno do Asaas:', municipalServiceId);
                    }
                    
                    municipalServiceName = foundService.municipalServiceName || 
                                          foundService.name || 
                                          foundService.description || 
                                          null;
                    if (municipalServiceName) {
                      console.log('✅ Nome do serviço encontrado após assumir ID:', municipalServiceName);
                      break;
                    } else {
                      console.warn('⚠️ Serviço encontrado mas sem nome/descrição:', {
                        id: foundService.id,
                        code: foundService.code || foundService.municipalServiceCode,
                        availableFields: Object.keys(foundService)
                      });
                    }
                  }
                }
              }
            } catch (error: any) {
              console.warn(`⚠️ Erro ao buscar nome do serviço em ${endpoint}:`, error.message);
            }
          }
        }
      }
    } else {
      // Tentar buscar da API do Asaas (tentar ambos os endpoints possíveis)
      const endpoints = [
        `${ASAAS_API_URL}/municipalServices`,
        `${ASAAS_API_URL}/invoices/municipalServices`,
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Tentando buscar serviços municipais em: ${endpoint}`);
          const servicesResponse = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'access_token': ASAAS_API_KEY,
            },
          });

          if (servicesResponse.ok) {
            const servicesData = await servicesResponse.json();
            const services = servicesData.data || servicesData || [];
            
            if (Array.isArray(services) && services.length > 0) {
              // Usar o primeiro serviço disponível
              municipalServiceId = services[0].id;
              municipalServiceName = services[0].municipalServiceName || 
                                    services[0].name || 
                                    services[0].description || 
                                    null;
              console.log('✅ Serviço municipal encontrado:', {
                id: municipalServiceId,
                name: municipalServiceName,
                code: services[0].code || services[0].municipalServiceCode,
                description: services[0].description || services[0].municipalServiceName,
                totalServices: services.length,
                endpoint
              });
              break; // Parar se encontrou
            }
          } else {
            const servicesError = await servicesResponse.json().catch(() => ({}));
            console.warn(`⚠️ Endpoint ${endpoint} retornou erro:`, servicesError);
          }
        } catch (servicesError: any) {
          console.warn(`⚠️ Erro ao buscar em ${endpoint}:`, servicesError.message);
        }
      }
    }

    if (!municipalServiceId) {
      console.error('❌ municipalServiceId não encontrado! É necessário cadastrar um serviço municipal no Asaas ou configurar a variável ASAAS_MUNICIPAL_SERVICE_ID');
      return { 
        success: false, 
        error: 'municipalServiceId é obrigatório. Configure um serviço municipal no Asaas ou defina a variável ASAAS_MUNICIPAL_SERVICE_ID',
        details: 'O identificador único do serviço municipal precisa ser informado. Acesse o Asaas > Notas Fiscais > Configurações para cadastrar um serviço.'
      };
    }

    if (!municipalServiceName && municipalServiceId) {
      console.warn('⚠️ municipalServiceName não encontrado! Tentando buscar novamente pelo ID:', municipalServiceId);
      // Tentar buscar novamente o nome do serviço pelo ID ou código
      const endpoints = [
        `${ASAAS_API_URL}/municipalServices`,
        `${ASAAS_API_URL}/invoices/municipalServices`,
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Buscando nome do serviço em: ${endpoint}`);
          const servicesResponse = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'access_token': ASAAS_API_KEY,
            },
          });

          if (servicesResponse.ok) {
            const servicesData = await servicesResponse.json();
            const services = servicesData.data || servicesData || [];
            
            if (Array.isArray(services)) {
              console.log(`📋 Total de serviços encontrados: ${services.length}`);
              // Buscar pelo ID ou pelo código (caso o ID seja na verdade um código)
              const foundService = services.find((s: any) => 
                s.id === municipalServiceId || 
                s.id === String(municipalServiceId) ||
                s.code === municipalServiceId ||
                s.municipalServiceCode === municipalServiceId ||
                String(s.code) === String(municipalServiceId) ||
                String(s.municipalServiceCode) === String(municipalServiceId)
              );
              
              if (foundService) {
                console.log('✅ Serviço encontrado na segunda busca:', {
                  id: foundService.id,
                  code: foundService.code || foundService.municipalServiceCode,
                  availableFields: Object.keys(foundService)
                });
                
                // Atualizar o ID para o ID interno do Asaas se encontrou pelo código
                if (foundService.id !== municipalServiceId) {
                  municipalServiceId = foundService.id;
                  console.log('✅ ID atualizado para o ID interno do Asaas:', municipalServiceId);
                }
                
                municipalServiceName = foundService.municipalServiceName || 
                                      foundService.name || 
                                      foundService.description || 
                                      null;
                if (municipalServiceName) {
                  console.log('✅ Nome do serviço encontrado na segunda busca:', municipalServiceName);
                  break;
                } else {
                  console.error('❌ Serviço encontrado mas sem nome/descrição disponível:', {
                    id: foundService.id,
                    code: foundService.code || foundService.municipalServiceCode,
                    municipalServiceName: foundService.municipalServiceName,
                    name: foundService.name,
                    description: foundService.description
                  });
                }
              } else {
                console.warn(`⚠️ Serviço com ID/código "${municipalServiceId}" não encontrado em ${endpoint}`);
              }
            } else {
              console.warn(`⚠️ Resposta de ${endpoint} não é um array:`, typeof services);
            }
          } else {
            const errorData = await servicesResponse.json().catch(() => ({}));
            console.warn(`⚠️ Endpoint ${endpoint} retornou erro ${servicesResponse.status}:`, errorData);
          }
        } catch (error: any) {
          console.warn(`⚠️ Erro ao buscar nome do serviço em ${endpoint}:`, error.message);
        }
      }
    }

    // Log final do estado do serviço municipal
    console.log('📊 Estado final do serviço municipal:', {
      municipalServiceId: municipalServiceId,
      municipalServiceName: municipalServiceName,
      hasId: !!municipalServiceId,
      hasName: !!municipalServiceName
    });

    // Validar e preparar valor da nota fiscal
    let invoiceValue = 0;
    
    // Converter order.preco (pode ser string ou number do banco de dados)
    if (order.preco !== null && order.preco !== undefined && order.preco !== '') {
      if (typeof order.preco === 'number') {
        invoiceValue = order.preco;
      } else if (typeof order.preco === 'string') {
        // Remover caracteres não numéricos exceto ponto e vírgula
        const cleanedPrice = String(order.preco).replace(/[^\d.,-]/g, '').replace(',', '.');
        invoiceValue = parseFloat(cleanedPrice);
      } else {
        invoiceValue = parseFloat(String(order.preco));
      }
    }
    
    // Se não conseguiu obter do order, tentar do payment
    if ((isNaN(invoiceValue) || invoiceValue <= 0) && paymentData.value) {
      if (typeof paymentData.value === 'number') {
        invoiceValue = paymentData.value;
      } else if (typeof paymentData.value === 'string') {
        const cleanedPaymentValue = String(paymentData.value).replace(/[^\d.,-]/g, '').replace(',', '.');
        invoiceValue = parseFloat(cleanedPaymentValue);
      } else {
        invoiceValue = parseFloat(String(paymentData.value));
      }
    }
    
    // Garantir que o valor seja um número válido maior que 0
    if (isNaN(invoiceValue) || invoiceValue <= 0) {
      console.error('❌ Valor da nota fiscal inválido:', {
        orderPreco: order.preco,
        orderPrecoType: typeof order.preco,
        paymentValue: paymentData.value,
        paymentValueType: typeof paymentData.value,
        calculatedValue: invoiceValue,
        isNaN: isNaN(invoiceValue)
      });
      return { 
        success: false, 
        error: 'Valor da nota fiscal inválido. O valor deve ser maior que zero.',
        details: {
          orderPreco: order.preco,
          orderPrecoType: typeof order.preco,
          paymentValue: paymentData.value,
          paymentValueType: typeof paymentData.value,
          calculatedValue: invoiceValue
        }
      };
    }

    // Validar formato da data (YYYY-MM-DD)
    const today = new Date();
    const effectiveDate = today.toISOString().split('T')[0];
    
    // Validar se a data está no formato correto
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
      console.error('❌ Formato de data inválido:', effectiveDate);
      return { 
        success: false, 
        error: 'Formato de data inválido para a nota fiscal'
      };
    }

    // Verificar se o payment existe e está válido antes de criar nota fiscal
    if (paymentData.deleted === true) {
      console.error('❌ Não é possível criar nota fiscal para pagamento deletado');
      return { 
        success: false, 
        error: 'Não é possível criar nota fiscal para pagamento deletado',
        reason: 'payment_deleted'
      };
    }

    // Verificar se o payment está pago (pode ser necessário para criar nota fiscal)
    if (paymentData.status && !['RECEIVED', 'CONFIRMED', 'APPROVED', 'RECEIVED_IN_CASH_OFFLINE'].includes(paymentData.status)) {
      console.warn('⚠️ Pagamento não está confirmado. Status:', paymentData.status);
      // Não bloquear, mas avisar que pode dar erro na API
    }

    // Criar nota fiscal no Asaas
    const invoiceData: any = {
      payment: paymentId,
      serviceDescription: (order.nome_campanha || 'Serviço de publicidade em totens digitais').substring(0, 500), // Limitar tamanho
      value: invoiceValue.toFixed(2), // Formatar com 2 casas decimais
      effectiveDate: effectiveDate,
      municipalServiceId: municipalServiceId,
    };

    // Adicionar municipalServiceName se disponível (obrigatório pela API)
    if (municipalServiceName) {
      invoiceData.municipalServiceName = municipalServiceName;
    }

    console.log('📝 Dados da nota fiscal que serão enviados:', invoiceData);
    console.log('📝 URL da API:', `${ASAAS_API_URL}/invoices`);

    // Validações finais antes de enviar
    if (!invoiceData.payment || !invoiceData.municipalServiceId || !invoiceData.value || !invoiceData.effectiveDate) {
      const missingFields = [];
      if (!invoiceData.payment) missingFields.push('payment');
      if (!invoiceData.municipalServiceId) missingFields.push('municipalServiceId');
      if (!invoiceData.value) missingFields.push('value');
      if (!invoiceData.effectiveDate) missingFields.push('effectiveDate');
      
      console.error('❌ Campos obrigatórios faltando:', missingFields);
      return { 
        success: false, 
        error: `Campos obrigatórios faltando: ${missingFields.join(', ')}`,
        details: { missingFields, invoiceData }
      };
    }

    // Validar se municipalServiceName está presente (obrigatório pela API)
    if (!invoiceData.municipalServiceName) {
      console.error('❌ municipalServiceName é obrigatório mas não foi encontrado!');
      console.error('📋 Informações de debug:', {
        municipalServiceId: municipalServiceId,
        municipalServiceName: municipalServiceName,
        envValue: process.env.ASAAS_MUNICIPAL_SERVICE_ID,
        environment: ASAAS_ENVIRONMENT,
        apiUrl: ASAAS_API_URL,
        hasApiKey: !!ASAAS_API_KEY
      });
      return { 
        success: false, 
        error: 'municipalServiceName é obrigatório. Não foi possível obter o nome do serviço municipal.',
        details: {
          municipalServiceId: municipalServiceId,
          envValue: process.env.ASAAS_MUNICIPAL_SERVICE_ID,
          hint: 'Verifique se o serviço municipal está cadastrado corretamente no Asaas com nome/descrição. O serviço precisa ter pelo menos um dos campos: municipalServiceName, name ou description preenchido.',
          troubleshooting: [
            '1. Acesse o painel do Asaas e verifique se o serviço existe',
            '2. Confirme que o serviço tem nome/descrição preenchidos',
            '3. Verifique se a variável ASAAS_MUNICIPAL_SERVICE_ID está correta',
            '4. Verifique se está usando o ambiente correto (sandbox/production)',
            '5. Verifique se a chave KEY_API_ASAAS tem permissões para acessar serviços municipais'
          ]
        }
      };
    }

    const invoiceResponse = await fetch(`${ASAAS_API_URL}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify(invoiceData),
    });

    const responseText = await invoiceResponse.text();
    console.log('📋 Status da resposta:', invoiceResponse.status);
    console.log('📋 Headers da resposta:', Object.fromEntries(invoiceResponse.headers.entries()));
    console.log('📋 Corpo da resposta (primeiros 500 chars):', responseText.substring(0, 500));

    if (!invoiceResponse.ok) {
      let errorData: any = {};
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText, rawResponse: responseText };
      }
      
      // Extrair mensagens de erro específicas do array errors
      let errorMessages: string[] = [];
      if (errorData.errors && Array.isArray(errorData.errors)) {
        errorMessages = errorData.errors.map((err: any) => {
          if (typeof err === 'string') return err;
          if (err.message) return err.message;
          if (err.description) return err.description;
          if (err.code) return `${err.code}: ${err.description || err.message || ''}`;
          return JSON.stringify(err);
        }).filter(Boolean);
      }
      
      // Se não houver mensagens no array, usar message ou description
      if (errorMessages.length === 0) {
        if (errorData.message) errorMessages.push(errorData.message);
        if (errorData.description) errorMessages.push(errorData.description);
        if (errorMessages.length === 0) {
          errorMessages.push(`Erro ao criar nota fiscal (${invoiceResponse.status})`);
        }
      }
      
      const errorMessage = errorMessages.join('; ');
      
      console.error('❌ Erro ao criar nota fiscal:', {
        status: invoiceResponse.status,
        statusText: invoiceResponse.statusText,
        errorData,
        errorMessages,
        invoiceData: {
          ...invoiceData,
          value: invoiceData.value, // Já formatado
        }
      });
      
      return { 
        success: false, 
        error: errorMessage,
        details: errorData,
        status: invoiceResponse.status,
        invoiceData: invoiceData // Incluir dados enviados para debug
      };
    }

    let invoice: any;
    try {
      invoice = JSON.parse(responseText);
    } catch {
      invoice = { rawResponse: responseText };
    }

    console.log('✅ Nota fiscal criada com sucesso:', {
      id: invoice.id,
      status: invoice.status,
      payment: invoice.payment,
      value: invoice.value
    });
    
    return { 
      success: true, 
      invoice: {
        id: invoice.id,
        status: invoice.status,
        payment: invoice.payment,
        value: invoice.value
      }
    };
  } catch (error: any) {
    console.error('❌ Erro ao criar nota fiscal:', error);
    console.error('❌ Stack trace:', error.stack);
    return { 
      success: false, 
      error: error.message || 'Erro ao criar nota fiscal',
      stack: error.stack
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Aceitar apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const event = req.body;

    // Log completo do webhook recebido
    console.log('='.repeat(80));
    console.log('📥 WEBHOOK RECEBIDO DO ASAAS');
    console.log('='.repeat(80));
    console.log('📋 Timestamp:', new Date().toISOString());
    console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📋 Body completo:', JSON.stringify(event, null, 2));
    console.log('📋 Tipo do evento:', event.event);
    console.log('📋 Chaves do evento:', Object.keys(event));
    console.log('='.repeat(80));

    // O Asaas envia eventos no formato: 
    // - { event: 'PAYMENT_RECEIVED', payment: {...} } (eventos de pagamento)
    // - { event: 'INVOICE_SYNCHRONIZED', invoice: {...} } (eventos de fatura)
    const eventType = event.event;
    let payment = event.payment;
    const invoice = event.invoice;

    // Eventos que não devem processar atualização de status ou criar nota fiscal
    // Estes eventos são apenas informativos e devem retornar sucesso imediatamente
    const informationalEvents = [
      'PAYMENT_DELETED',
      'PAYMENT_REFUNDED',
      'PAYMENT_OVERDUE',
      'PAYMENT_RESTORED',
      'PAYMENT_AWAITING_RISK_ANALYSIS',
      'PAYMENT_APPROVED_BY_RISK_ANALYSIS',
      'PAYMENT_REPROVED_BY_RISK_ANALYSIS'
    ];

    if (eventType && informationalEvents.includes(eventType)) {
      console.log(`ℹ️ Evento informativo detectado: ${eventType} - Retornando sucesso sem processar`);
      return res.status(200).json({ 
        success: true,
        message: `Evento ${eventType} recebido e processado`,
        eventType,
        note: 'Este tipo de evento não atualiza status de pedido ou cria nota fiscal. Apenas para registro.'
      });
    }

    // Se não tem payment mas tem invoice, tentar extrair payment da invoice
    if (!payment && invoice) {
      console.log('📋 Evento com invoice em vez de payment, tentando extrair dados...');
      console.log('📋 Invoice recebido:', JSON.stringify(invoice, null, 2));
      
      // Alguns eventos de invoice podem ter payment dentro
      if (invoice.payment) {
        payment = invoice.payment;
        console.log('✅ Payment encontrado dentro da invoice');
      } else if (invoice.id) {
        // Se a invoice tem um ID, podemos buscar o pagamento relacionado
        // Mas por enquanto, vamos apenas logar e retornar sucesso para eventos de invoice
        console.log('ℹ️ Evento de invoice sem payment direto. Tipo:', eventType);
        
        // Para eventos de invoice que não são de pagamento, apenas confirmar recebimento
        if (eventType === 'INVOICE_SYNCHRONIZED' || eventType === 'INVOICE_CREATED') {
          console.log('✅ Evento de invoice processado (não requer atualização de status)');
          return res.status(200).json({ 
            success: true,
            message: 'Evento de invoice recebido e processado',
            eventType,
            note: 'Eventos de invoice não atualizam status de pedido. Aguarde evento de pagamento.'
          });
        }
      }
    }

    // Verificar se é um evento de pagamento válido
    if (!payment) {
      console.warn('⚠️ Webhook sem dados de pagamento');
      console.warn('📋 Estrutura completa do evento recebido:', {
        keys: Object.keys(event),
        eventType: event.event,
        hasPayment: !!event.payment,
        hasInvoice: !!event.invoice,
        fullEvent: event
      });
      
      // Para eventos que não são de pagamento, retornar sucesso mas sem processar
      if (eventType && !eventType.includes('PAYMENT')) {
        console.log('ℹ️ Evento não relacionado a pagamento, retornando sucesso sem processar');
        return res.status(200).json({ 
          success: true,
          message: 'Evento recebido mas não requer processamento',
          eventType,
          note: 'Este tipo de evento não atualiza status de pedido.'
        });
      }
      
      return res.status(200).json({ 
        success: false,
        error: 'Dados de pagamento não encontrados',
        eventType,
        note: 'Webhook recebido mas sem dados de pagamento para processar.'
      });
    }

    // Verificar se o pagamento foi deletado - se sim, não processar
    if (payment.deleted === true) {
      console.log(`ℹ️ Pagamento deletado detectado (payment.deleted: ${payment.deleted}) - Retornando sucesso sem processar`);
      return res.status(200).json({ 
        success: true,
        message: 'Webhook recebido para pagamento deletado',
        eventType,
        paymentId: payment.id,
        note: 'Pagamento deletado não deve atualizar status ou criar nota fiscal. Apenas para registro.'
      });
    }

    // Obter orderId do externalReference
    // Tentar múltiplas localizações possíveis
    let orderIdRaw = payment.externalReference || 
                     payment.external_reference || 
                     event.externalReference || 
                     event.external_reference ||
                     payment.orderId ||
                     event.orderId;

    // Log detalhado para debug
    console.log('='.repeat(80));
    console.log('🔍 BUSCANDO EXTERNALREFERENCE');
    console.log('='.repeat(80));
    console.log('📋 payment.externalReference:', payment.externalReference);
    console.log('📋 payment.external_reference:', payment.external_reference);
    console.log('📋 event.externalReference:', event.externalReference);
    console.log('📋 event.external_reference:', event.external_reference);
    console.log('📋 payment.orderId:', payment.orderId);
    console.log('📋 event.orderId:', event.orderId);
    console.log('📋 orderIdRaw encontrado:', orderIdRaw);
    console.log('📋 Tipo do orderIdRaw:', typeof orderIdRaw);
    console.log('📋 Chaves do payment:', Object.keys(payment));
    console.log('📋 Chaves do event:', Object.keys(event));
    console.log('📋 Payment completo:', JSON.stringify(payment, null, 2));
    console.log('='.repeat(80));
    
    if (!orderIdRaw) {
      console.warn('⚠️ Webhook sem externalReference (orderId)');
      console.warn('📋 Estrutura completa do payment recebido:', {
        paymentKeys: Object.keys(payment),
        paymentData: payment,
        eventKeys: Object.keys(event),
        fullEvent: event
      });
      
      // Tentar buscar o pedido pelo ID do pagamento (asaas_payment_id)
      const paymentId = payment.id;
      if (paymentId) {
        console.log(`🔄 Tentando buscar pedido pelo asaas_payment_id: ${paymentId}`);
        const { data: orderByPaymentId, error: orderByPaymentIdError } = await supabase
          .from('order')
          .select('id, status, preco')
          .eq('asaas_payment_id', paymentId)
          .single();
        
        if (!orderByPaymentIdError && orderByPaymentId) {
          console.log(`✅ Pedido encontrado pelo asaas_payment_id: ${orderByPaymentId.id}`);
          orderIdRaw = orderByPaymentId.id;
        } else {
          console.warn(`⚠️ Não foi possível encontrar pedido pelo asaas_payment_id: ${paymentId}`, orderByPaymentIdError);
        }
      }
      
      // Tentar buscar por subscription ID se disponível
      const subscriptionId = payment.subscription;
      if (!orderIdRaw && subscriptionId) {
        console.log(`🔄 Tentando buscar pedido pelo subscription ID: ${subscriptionId}`);
        // Nota: Se a tabela order tiver uma coluna asaas_subscription_id, usar aqui
        // Por enquanto, apenas logar
        console.log(`ℹ️ Subscription ID encontrado: ${subscriptionId}, mas busca por subscription ainda não implementada`);
      }
      
      // Se ainda não encontrou, retornar erro com logs detalhados
      // Mas não bloquear o webhook (retornar 200 para evitar retries infinitos)
      if (!orderIdRaw) {
        console.error('='.repeat(80));
        console.error('❌ ERRO: externalReference NÃO ENCONTRADO');
        console.error('='.repeat(80));
        console.error('📋 Payment ID:', payment.id);
        console.error('📋 Payment Status:', payment.status);
        console.error('📋 Payment BillingType:', payment.billingType);
        console.error('📋 Payment Value:', payment.value);
        console.error('📋 Payment Subscription:', payment.subscription);
        console.error('📋 Payment Deleted:', payment.deleted);
        console.error('📋 Payment completo:', JSON.stringify(payment, null, 2));
        console.error('📋 Event completo:', JSON.stringify(event, null, 2));
        console.error('='.repeat(80));
        
        // Retornar 200 para não gerar retry infinito do Asaas
        // Mas logar o erro para investigação
        return res.status(200).json({ 
          success: false,
          error: 'externalReference (orderId) não encontrado',
          receivedPaymentKeys: Object.keys(payment),
          receivedEventKeys: Object.keys(event),
          paymentId: payment.id,
          paymentStatus: payment.status,
          paymentBillingType: payment.billingType,
          paymentValue: payment.value,
          paymentSubscription: payment.subscription,
          hint: 'O pedido pode ter sido deletado ou o externalReference pode estar incorreto. Verifique os logs do servidor para mais detalhes.',
          note: 'Webhook processado mas pedido não encontrado. Verifique se o pedido existe no banco de dados. Não foi possível criar nota fiscal sem pedido.'
        });
      }
    }

    // Normalizar orderId (garantir que seja string, removendo espaços se houver)
    const orderId = typeof orderIdRaw === 'string' ? orderIdRaw.trim() : String(orderIdRaw);

    console.log(`🔍 OrderId recebido:`, {
      original: orderIdRaw,
      normalized: orderId,
      tipo: typeof orderIdRaw
    });

    const paymentId = payment.id;
    const paymentStatus = payment.status;
    const billingType = payment.billingType; // PIX, BOLETO, CREDIT_CARD
    const installments = payment.installments || 1; // Número total de parcelas
    const installmentNumber = payment.installment; // Número da parcela atual (se houver)
    const value = payment.value;

    // Identificar tipo de pagamento
    const paymentTypeName = 
      billingType === 'PIX' ? 'PIX' :
      billingType === 'BOLETO' ? 'BOLETO' :
      billingType === 'CREDIT_CARD' ? 'CARTÃO DE CRÉDITO' :
      billingType || 'DESCONHECIDO';

    console.log(`📋 Processando webhook para pedido ${orderId}:`, {
      eventType,
      paymentId,
      paymentStatus,
      billingType: paymentTypeName,
      installments,
      installmentNumber,
      valor: value,
      isParcelado: installments > 1,
    });

    // Verificar se o pedido existe - tentar com o orderId normalizado
    let order;
    let orderError;
    
    console.log('='.repeat(80));
    console.log('🔍 BUSCANDO PEDIDO NO BANCO DE DADOS');
    console.log('='.repeat(80));
    console.log('📋 orderId recebido:', orderId);
    console.log('📋 tipo do orderId:', typeof orderId);
    console.log('📋 orderId length:', orderId.length);
    console.log('📋 É UUID?', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId));
    console.log('='.repeat(80));
    
    // Tentar buscar primeiro com o orderId como está (pode ser UUID ou número)
    // Buscar TODOS os campos necessários incluindo dados de endereço para pessoa jurídica
    let { data: orderData, error: orderErrorData } = await supabase
      .from('order')
      .select('id, status, preco, cnpj, cpf, nome_campanha, razao_social, email, telefone, cep, endereco, numero, bairro, complemento, cidade, estado, setor')
      .eq('id', orderId)
      .single();

    console.log('📋 Primeira tentativa de busca (como recebido):', {
      encontrado: !!orderData,
      erro: orderErrorData?.message,
      code: orderErrorData?.code,
      dados: orderData
    });

    // Se não encontrar, tentar diferentes formatos
    if (orderErrorData || !orderData) {
        // Tentar como número (caso seja um ID numérico passado como string)
        const numericId = Number(orderId);
        if (!isNaN(numericId) && orderId !== String(numericId)) {
          console.log(`🔄 Tentativa 2: Buscando order como número: ${numericId}`);
          const { data: orderDataNumeric, error: orderErrorNumeric } = await supabase
            .from('order')
            .select('id, status, preco, cnpj, cpf, nome_campanha, razao_social, email, telefone, cep, endereco, numero, bairro, complemento, cidade, estado, setor')
            .eq('id', numericId)
            .single();
        
        console.log('📋 Tentativa numérica:', {
          encontrado: !!orderDataNumeric,
          erro: orderErrorNumeric?.message,
          code: orderErrorNumeric?.code,
          dados: orderDataNumeric
        });
        
        if (!orderErrorNumeric && orderDataNumeric) {
          orderData = orderDataNumeric;
          orderErrorData = null;
        }
      }
      
      // Se ainda não encontrou e parece ser UUID, tentar buscar sem hífens ou com formato diferente
      if ((orderErrorData || !orderData) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
        // Tentar buscar todos os pedidos recentes para debug (últimos 10)
        console.log(`🔄 Tentativa 3: Buscando pedidos recentes para debug...`);
        const { data: recentOrders, error: recentError } = await supabase
          .from('order')
          .select('id, status, preco, cnpj, cpf, nome_campanha, razao_social, email, telefone, cep, endereco, numero, bairro, complemento, cidade, estado, setor, created_at')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!recentError && recentOrders) {
          console.log('📋 Pedidos recentes encontrados:', recentOrders.map(o => ({
            id: o.id,
            tipo: typeof o.id,
            status: o.status
          })));
          
          // Verificar se algum pedido tem ID similar
          const matchingOrder = recentOrders.find(o => 
            String(o.id) === orderId || 
            String(o.id).replace(/-/g, '') === orderId.replace(/-/g, '')
          );
          
          if (matchingOrder) {
            console.log(`✅ Pedido encontrado por comparação manual:`, matchingOrder);
            orderData = matchingOrder;
            orderErrorData = null;
          }
        }
      }
      
      // Última tentativa: buscar pelo asaas_payment_id se disponível
      if ((orderErrorData || !orderData) && paymentId) {
        console.log(`🔄 Tentativa 4: Buscando pelo asaas_payment_id: ${paymentId}`);
        const { data: orderByPaymentId, error: orderByPaymentIdError } = await supabase
          .from('order')
          .select('id, status, preco, cnpj, cpf, nome_campanha, razao_social, email, telefone, cep, endereco, numero, bairro, complemento, cidade, estado, setor')
          .eq('asaas_payment_id', paymentId)
          .maybeSingle();
        
        console.log('📋 Busca por asaas_payment_id:', {
          encontrado: !!orderByPaymentId,
          erro: orderByPaymentIdError?.message,
          dados: orderByPaymentId
        });
        
        if (!orderByPaymentIdError && orderByPaymentId) {
          console.log(`✅ Pedido encontrado pelo asaas_payment_id: ${orderByPaymentId.id}`);
          orderData = orderByPaymentId;
          orderErrorData = null;
        }
      }
    }

    order = orderData;
    orderError = orderErrorData;
    
    console.log('='.repeat(80));
    console.log('📋 RESULTADO DA BUSCA DO PEDIDO');
    console.log('='.repeat(80));
    console.log('📋 Pedido encontrado:', !!order);
    if (order) {
      console.log('📋 ID do pedido:', order.id);
      console.log('📋 Status atual:', order.status);
      console.log('📋 Preço:', order.preco);
    }
    if (orderError) {
      console.log('📋 Erro:', orderError.message);
    }
    console.log('='.repeat(80));

    if (orderError || !order) {
      console.error('='.repeat(80));
      console.error('❌ PEDIDO NÃO ENCONTRADO');
      console.error('='.repeat(80));
      console.error('📋 orderId recebido:', orderId);
      console.error('📋 tipo do orderId:', typeof orderId);
      console.error('📋 Erro da busca:', orderError);
      console.error('📋 paymentId (asaas):', paymentId);
      console.error('📋 paymentStatus:', paymentStatus);
      console.error('📋 externalReference do payment:', payment.externalReference || payment.external_reference);
      console.error('='.repeat(80));
      
      // Retornar erro mais detalhado mas não bloquear o webhook (retornar 200 para não gerar retry infinito)
      return res.status(200).json({ 
        success: false,
        error: 'Pedido não encontrado no banco de dados',
        orderId,
        paymentId,
        paymentStatus,
        externalReference: payment.externalReference || payment.external_reference,
        hint: 'O pedido pode ter sido deletado ou o externalReference pode estar incorreto. Verifique se o pedido existe no banco de dados.',
        note: 'Webhook processado mas pedido não encontrado. Verifique os logs para mais detalhes.'
      });
    }

    console.log(`📦 Pedido encontrado:`, {
      id: order.id,
      statusAtual: order.status,
      valorPedido: order.preco,
      cnpj: order.cnpj,
      cpf: order.cpf,
      nome_campanha: order.nome_campanha,
      temCnpj: !!order.cnpj,
      temCpf: !!order.cpf,
      isPessoaJuridica: order.cnpj && !order.cpf
    });

    // Processar eventos de pagamento confirmado/recebido
    // Eventos que indicam pagamento confirmado:
    // - PAYMENT_RECEIVED
    // - PAYMENT_CONFIRMED
    // - PAYMENT_APPROVED
    // - Status: RECEIVED, CONFIRMED, APPROVED, RECEIVED_IN_CASH_OFFLINE
    const isStatusPaid = paymentStatus === 'RECEIVED' || 
                         paymentStatus === 'CONFIRMED' ||
                         paymentStatus === 'RECEIVED_IN_CASH_OFFLINE' ||
                         paymentStatus === 'APPROVED';
    
    const isEventPaid = eventType === 'PAYMENT_RECEIVED' ||
                        eventType === 'PAYMENT_CONFIRMED' ||
                        eventType === 'PAYMENT_APPROVED';
    
    // Considerar confirmado se o status OU o evento indicarem pagamento
    const isPaymentConfirmed = isStatusPaid || isEventPaid;

    // Log detalhado do evento recebido
    console.log('='.repeat(80));
    console.log('🔍 ANALISANDO EVENTO DE PAGAMENTO');
    console.log('='.repeat(80));
    console.log('📋 eventType:', eventType);
    console.log('📋 paymentStatus:', paymentStatus);
    console.log('📋 billingType:', billingType);
    console.log('📋 isStatusPaid:', isStatusPaid);
    console.log('📋 isEventPaid:', isEventPaid);
    console.log('📋 isPaymentConfirmed:', isPaymentConfirmed);
    console.log('📋 orderId:', orderId);
    console.log('📋 order.status atual:', order.status);
    console.log('='.repeat(80));
    
    // Se o status indica pagamento confirmado, ATUALIZAR SEMPRE, mesmo que o evento não seja reconhecido
    // Esta verificação garante que qualquer pagamento com status RECEIVED/CONFIRMED seja atualizado
    if (isStatusPaid && order.status !== 'pago') {
      console.log('🔄 STATUS INDICA PAGO - Forçando atualização independente do tipo de evento...');
      
      // Atualizar diretamente quando o status indica pagamento
      try {
        const { data: updatedOrder, error: directUpdateError } = await supabase
          .from('order')
          .update({ 
            status: 'pago',
            asaas_payment_id: paymentId,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .select('id, status, cnpj, cpf, preco, nome_campanha, razao_social, email, telefone, cep, endereco, numero, bairro, complemento, cidade, estado, setor')
          .single();

        if (directUpdateError) {
          console.error('❌ Erro na atualização direta (status pago):', directUpdateError);
          // Tentar função auxiliar
          try {
            await atualizarStatusCompra(orderId, 'pago');
            console.log(`✅ Status atualizado via função auxiliar (status pago)`);
            
          // Verificar se foi atualizado e buscar dados completos para criar nota fiscal
          const { data: verifyOrder } = await supabase
            .from('order')
            .select('id, status, cnpj, cpf, preco, nome_campanha, razao_social, email, telefone, cep, endereco, numero, bairro, complemento, cidade, estado, setor')
            .eq('id', orderId)
            .single();
          
          if (verifyOrder?.status === 'pago') {
            // Criar nota fiscal automaticamente se for pessoa jurídica
            const invoiceResult = await criarNotaFiscalAutomatica(verifyOrder, paymentId);
            
            return res.status(200).json({ 
              success: true,
              message: 'Pagamento confirmado e pedido atualizado (via função auxiliar)',
              orderId,
              status: 'pago',
              paymentType: paymentTypeName,
              paymentStatus,
              eventType,
              invoiceCreated: invoiceResult.success || false
            });
          }
          } catch (auxError: any) {
            console.error('❌ Erro também na função auxiliar:', auxError);
            // Mesmo com erro, retornar sucesso parcial pois o pagamento foi processado
            return res.status(200).json({ 
              success: true,
              message: 'Pagamento confirmado mas houve problema ao atualizar status',
              orderId,
              status: order.status,
              paymentType: paymentTypeName,
              paymentStatus,
              eventType,
              warning: 'Status pode não ter sido atualizado corretamente',
              error: auxError.message
            });
          }
        } else if (updatedOrder) {
          console.log(`✅ Status atualizado com sucesso (status pago):`, updatedOrder);
          
          // Verificar se realmente foi atualizado
          const { data: verifyOrder } = await supabase
            .from('order')
            .select('id, status, cnpj, cpf, preco, nome_campanha, razao_social, email, telefone, cep, endereco, numero, bairro, complemento, cidade, estado, setor')
            .eq('id', orderId)
            .single();
          
          if (verifyOrder?.status === 'pago') {
            console.log('✅ Verificação confirmada: status é "pago"');
            
            // Criar nota fiscal automaticamente se for pessoa jurídica
            const invoiceResult = await criarNotaFiscalAutomatica(verifyOrder, paymentId);
            
            return res.status(200).json({ 
              success: true,
              message: 'Pagamento confirmado e pedido atualizado (status pago)',
              orderId,
              status: 'pago',
              paymentType: paymentTypeName,
              paymentStatus,
              eventType,
              invoiceCreated: invoiceResult.success || false
            });
          } else {
            console.error(`❌ PROBLEMA: Status não foi atualizado! Status atual: "${verifyOrder?.status}"`);
            // Tentar forçar atualização novamente
            const { error: forceUpdateError } = await supabase
              .from('order')
              .update({ status: 'pago' })
              .eq('id', orderId);
            
            if (forceUpdateError) {
              console.error('❌ Erro ao forçar atualização:', forceUpdateError);
              // Mesmo com erro, retornar sucesso parcial pois o pagamento foi processado
              return res.status(200).json({ 
                success: true,
                message: 'Pagamento confirmado mas houve problema ao atualizar status',
                orderId,
                status: verifyOrder?.status || order.status,
                paymentType: paymentTypeName,
                paymentStatus,
                eventType,
                warning: 'Status pode não ter sido atualizado corretamente'
              });
            } else {
              console.log('✅ Atualização forçada concluída');
              
              // Buscar dados atualizados do pedido para criar nota fiscal
              const { data: updatedOrderForInvoice } = await supabase
                .from('order')
                .select('id, status, cnpj, cpf, preco, nome_campanha, razao_social, email, telefone, cep, endereco, numero, bairro, complemento, cidade, estado, setor')
                .eq('id', orderId)
                .single();
              
              // Criar nota fiscal automaticamente se for pessoa jurídica
              const invoiceResult = updatedOrderForInvoice 
                ? await criarNotaFiscalAutomatica(updatedOrderForInvoice, paymentId)
                : { success: false };
              
              return res.status(200).json({ 
                success: true,
                message: 'Pagamento confirmado e pedido atualizado (atualização forçada)',
                orderId,
                status: 'pago',
                paymentType: paymentTypeName,
                paymentStatus,
                eventType,
                invoiceCreated: invoiceResult.success || false
              });
            }
          }
        }
      } catch (error: any) {
        console.error('❌ Erro ao processar atualização (status pago):', error);
      }
    }

    if (isPaymentConfirmed) {
      // Verificar se deve atualizar o status baseado no tipo de pagamento
      let shouldUpdateStatus = false;
      let updateReason = '';

      // PIX: Sempre atualiza quando pagar (pagamento único)
      if (billingType === 'PIX') {
        shouldUpdateStatus = true;
        updateReason = 'Pagamento PIX recebido';
      }
      // BOLETO: Sempre atualiza quando pagar (pagamento único)
      else if (billingType === 'BOLETO') {
        shouldUpdateStatus = true;
        updateReason = 'Boleto pago';
      }
      // CARTÃO DE CRÉDITO: 
      // - Se não é parcelado (1 parcela), atualiza sempre
      // - Se é parcelado, atualiza quando for a primeira parcela (entrada)
      else if (billingType === 'CREDIT_CARD') {
        if (installments === 1 || !installmentNumber || installmentNumber === 1) {
          shouldUpdateStatus = true;
          updateReason = installments > 1 
            ? `Primeira parcela do cartão recebida (${installmentNumber}/${installments})`
            : 'Pagamento com cartão confirmado';
        } else {
          // Parcela subsequente - não atualiza status, mas registra
          console.log(`ℹ️ Parcela ${installmentNumber}/${installments} do cartão recebida para pedido ${orderId} - Status não alterado`);
          return res.status(200).json({ 
            success: true,
            message: `Parcela ${installmentNumber}/${installments} recebida - Status não alterado`,
            orderId,
            status: order.status,
            installmentNumber,
            installments
          });
        }
      }
      // Outros tipos de pagamento: atualiza sempre
      else {
        shouldUpdateStatus = true;
        updateReason = `Pagamento ${paymentTypeName} recebido`;
      }

      if (shouldUpdateStatus) {
        console.log(`🔄 Iniciando atualização do pedido:`, {
          orderId: orderId,
          tipo: typeof orderId,
          statusAtual: order.status,
          novoStatus: 'pago'
        });

        // Atualizar status do pedido diretamente no banco
        // Primeiro tentar atualizar diretamente com Supabase
        let updateSuccess = false;
        
        try {
          console.log(`📝 Tentando atualizar status diretamente no Supabase para orderId: ${orderId}...`);
          
          const { data: updatedOrder, error: directUpdateError } = await supabase
            .from('order')
            .update({ 
              status: 'pago',
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .select('id, status, cnpj, cpf, preco, nome_campanha, razao_social, email, telefone, cep, endereco, numero, bairro, complemento, cidade, estado, setor, updated_at')
            .single();

          if (directUpdateError) {
            console.error('❌ Erro na atualização direta:', directUpdateError);
            throw directUpdateError;
          }

          if (updatedOrder) {
            console.log(`✅ Status atualizado com sucesso (atualização direta):`, updatedOrder);
            updateSuccess = true;
          }
        } catch (directError: any) {
          console.warn(`⚠️ Erro na atualização direta, tentando função auxiliar:`, directError);
          
          // Se a atualização direta falhar, tentar usando a função auxiliar
          try {
            await atualizarStatusCompra(orderId, 'pago');
            console.log(`✅ Status do pedido ${orderId} atualizado via função auxiliar`);
            updateSuccess = true;
          } catch (updateError: any) {
            console.error('❌ Erro ao atualizar status do pedido (função auxiliar também falhou):', updateError);
            return res.status(500).json({ 
              error: 'Erro ao atualizar status do pedido',
              details: updateError.message,
              directError: directError.message
            });
          }
        }

          // Verificar se a atualização realmente funcionou e criar nota fiscal
          if (updateSuccess) {
            // Buscar dados completos do order atualizado
            const { data: verifyOrder, error: verifyError } = await supabase
              .from('order')
              .select('id, status, cnpj, cpf, preco, nome_campanha, razao_social, email, telefone, cep, endereco, numero, bairro, complemento, cidade, estado, setor')
              .eq('id', orderId)
              .single();

          if (verifyError) {
            console.error('❌ Erro ao verificar atualização:', verifyError);
          } else if (verifyOrder) {
            console.log(`✅ Verificação: Status atual do pedido é "${verifyOrder.status}"`);
            
            if (verifyOrder.status !== 'pago') {
              console.error(`❌ PROBLEMA: Status não foi atualizado! Status atual: "${verifyOrder.status}"`);
              // Tentar atualizar novamente de forma mais forçada
              const { error: forceUpdateError } = await supabase
                .from('order')
                .update({ status: 'pago' })
                .eq('id', orderId);
              
              if (forceUpdateError) {
                console.error('❌ Erro ao forçar atualização:', forceUpdateError);
              } else {
                console.log('✅ Atualização forçada concluída');
                
                // Buscar dados atualizados para criar nota fiscal
                const { data: orderForInvoice } = await supabase
                  .from('order')
                  .select('id, status, cnpj, cpf, preco, nome_campanha, razao_social, email, telefone, cep, endereco, numero, bairro, complemento, cidade, estado, setor')
                  .eq('id', orderId)
                  .single();
                
                if (orderForInvoice) {
                  await criarNotaFiscalAutomatica(orderForInvoice, paymentId);
                }
              }
            } else {
              // Status foi atualizado com sucesso, criar nota fiscal se for pessoa jurídica
              console.log('✅ Status atualizado com sucesso, tentando criar nota fiscal...');
              const invoiceResult = await criarNotaFiscalAutomatica(verifyOrder, paymentId);
              console.log('📋 Resultado da criação da nota fiscal:', invoiceResult.success ? 'Sucesso' : 'Falhou', invoiceResult.reason || invoiceResult.error);
            }
          }
        }

        // Tentar atualizar também o ID do pagamento no pedido (se a coluna existir)
        try {
          const { error: paymentIdError } = await supabase
            .from('order')
            .update({ 
              asaas_payment_id: paymentId,
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId);
          
          if (paymentIdError) {
            console.warn('⚠️ Aviso: não foi possível salvar asaas_payment_id:', paymentIdError.message);
          } else {
            console.log('✅ asaas_payment_id atualizado com sucesso');
          }
        } catch (updatePaymentIdError: any) {
          // Ignorar erro se a coluna não existir
          console.warn('⚠️ Aviso: não foi possível salvar asaas_payment_id (coluna pode não existir)');
        }

        // Criar nota fiscal automaticamente se for pessoa jurídica
        console.log('='.repeat(80));
        console.log('📄 TENTANDO CRIAR NOTA FISCAL AUTOMATICAMENTE');
        console.log('='.repeat(80));
        console.log('📋 Order antes de criar nota fiscal:', {
          id: order.id,
          cnpj: order.cnpj,
          cpf: order.cpf,
          preco: order.preco,
          nome_campanha: order.nome_campanha
        });
        console.log('📋 Payment ID:', paymentId);
        
        const invoiceResult = await criarNotaFiscalAutomatica(order, paymentId);
        
        console.log('='.repeat(80));
        console.log('📋 RESULTADO DA CRIAÇÃO DA NOTA FISCAL');
        console.log('='.repeat(80));
        console.log('📋 Sucesso:', invoiceResult.success);
        if (!invoiceResult.success) {
          console.log('📋 Motivo:', invoiceResult.reason || invoiceResult.error);
        }
        console.log('='.repeat(80));
        
        console.log(`✅ Pedido ${orderId} processado com sucesso!`, {
          tipo: paymentTypeName,
          motivo: updateReason,
          statusAnterior: order.status,
          statusNovo: 'pago',
          notaFiscalCriada: invoiceResult.success ? 'sim' : 'não',
          motivoNaoCriada: invoiceResult.reason || invoiceResult.error
        });
        
        return res.status(200).json({ 
          success: true,
          message: 'Pagamento confirmado e pedido atualizado',
          orderId,
          status: 'pago',
          paymentType: paymentTypeName,
          reason: updateReason,
          invoiceCreated: invoiceResult.success || false,
          invoice: invoiceResult.success ? invoiceResult.invoice : undefined
        });
      }
    }

    // Para outros eventos, verificar se ainda assim é um pagamento confirmado
    // Por exemplo, PIX pode vir com status diferente mas já estar pago
    // Esta verificação só é necessária se não entrou no bloco anterior
    console.log('='.repeat(80));
    console.log('⚠️ EVENTO NÃO RECONHECIDO COMO PAGAMENTO CONFIRMADO');
    console.log('='.repeat(80));
    console.log('📋 eventType:', eventType);
    console.log('📋 paymentStatus:', paymentStatus);
    console.log('📋 billingType:', billingType);
    console.log('📋 payment completo:', JSON.stringify(payment, null, 2));
    console.log('='.repeat(80));

    // Verificar se o status do pagamento indica que foi recebido/confirmado
    // Independente do tipo de evento, se o status é RECEIVED/CONFIRMED, deve atualizar
    // Esta é uma verificação de fallback caso o evento não tenha sido reconhecido anteriormente
    const isStatusPaidSecondCheck = paymentStatus === 'RECEIVED' || 
                                    paymentStatus === 'CONFIRMED' ||
                                    paymentStatus === 'RECEIVED_IN_CASH_OFFLINE' ||
                                    paymentStatus === 'APPROVED';

    // Só atualizar aqui se não foi atualizado anteriormente e o status indica pagamento
    if (isStatusPaidSecondCheck && order.status !== 'pago') {
      console.log('🔄 Status do pagamento indica PAGO - Atualizando status do pedido...');
      console.log(`📋 billingType: ${billingType}, paymentStatus: ${paymentStatus}`);
      
      try {
        // Atualizar status para pago
        const { data: updatedOrder, error: updateError } = await supabase
          .from('order')
          .update({ 
            status: 'pago',
            asaas_payment_id: paymentId,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .select('id, status, cnpj, cpf, preco, nome_campanha, razao_social, email, telefone, cep, endereco, numero, bairro, complemento, cidade, estado, setor')
          .single();

        if (updateError) {
          console.error('❌ Erro ao atualizar status:', {
            error: updateError.message,
            code: updateError.code,
            details: updateError.details,
            orderId,
            paymentId
          });
          
          // Tentar novamente com função auxiliar
          try {
            await atualizarStatusCompra(orderId, 'pago');
            console.log('✅ Status atualizado via função auxiliar');
            
            // Buscar order atualizado para criar nota fiscal
            const { data: orderAfterAux } = await supabase
              .from('order')
              .select('id, status, cnpj, cpf, preco, nome_campanha, razao_social, email, telefone, cep, endereco, numero, bairro, complemento, cidade, estado, setor')
              .eq('id', orderId)
              .single();
            
            if (orderAfterAux?.status === 'pago') {
              // Criar nota fiscal automaticamente se for pessoa jurídica
              await criarNotaFiscalAutomatica(orderAfterAux, paymentId);
            }
          } catch (auxError: any) {
            console.error('❌ Erro também na função auxiliar:', auxError);
          }
        } else if (updatedOrder) {
          console.log('✅ Status atualizado com sucesso:', {
            orderId: updatedOrder.id,
            status: updatedOrder.status
          });
          
          // Verificar se realmente foi atualizado
          const { data: verifyOrder } = await supabase
            .from('order')
            .select('id, status, cnpj, cpf, preco, nome_campanha, razao_social, email, telefone, cep, endereco, numero, bairro, complemento, cidade, estado, setor')
            .eq('id', orderId)
            .single();
          
          if (verifyOrder?.status === 'pago') {
            console.log('✅ Verificação confirmada: status é "pago"');
            
            // Criar nota fiscal automaticamente se for pessoa jurídica
            const invoiceResult = await criarNotaFiscalAutomatica(verifyOrder, paymentId);
            
            return res.status(200).json({ 
              success: true,
              message: `Pagamento ${billingType || 'confirmado'} e pedido atualizado`,
              orderId,
              status: 'pago',
              paymentType: billingType,
              paymentStatus,
              eventType,
              invoiceCreated: invoiceResult.success || false
            });
          } else {
            console.error(`❌ PROBLEMA: Status não foi atualizado! Status atual: "${verifyOrder?.status}"`);
            // Tentar forçar atualização
            const { data: forceUpdatedOrder } = await supabase
              .from('order')
              .update({ status: 'pago' })
              .eq('id', orderId)
              .select('id, status, cnpj, cpf, preco, nome_campanha, razao_social, email, telefone, cep, endereco, numero, bairro, complemento, cidade, estado, setor')
              .single();
            
            if (forceUpdatedOrder) {
              // Criar nota fiscal automaticamente se for pessoa jurídica
              const invoiceResult = await criarNotaFiscalAutomatica(forceUpdatedOrder, paymentId);
              
              return res.status(200).json({ 
                success: true,
                message: `Pagamento ${billingType || 'confirmado'} e pedido atualizado (forçado)`,
                orderId,
                status: 'pago',
                paymentType: billingType,
                paymentStatus,
                eventType,
                invoiceCreated: invoiceResult.success || false
              });
            }
          }
        }

        // Buscar order atualizado para tentar criar nota fiscal (fallback)
        const { data: finalOrder } = await supabase
          .from('order')
          .select('id, status, cnpj, cpf, preco, nome_campanha, razao_social, email, telefone, cep, endereco, numero, bairro, complemento, cidade, estado, setor')
          .eq('id', orderId)
          .single();
        
        let invoiceCreated = false;
        if (finalOrder?.status === 'pago') {
          const invoiceResult = await criarNotaFiscalAutomatica(finalOrder, paymentId);
          invoiceCreated = invoiceResult.success || false;
        }

        return res.status(200).json({ 
          success: true,
          message: `Pagamento ${billingType || 'confirmado'} e pedido atualizado`,
          orderId,
          status: 'pago',
          paymentType: billingType,
          paymentStatus,
          eventType,
          invoiceCreated
        });
      } catch (error: any) {
        console.error('❌ Erro ao processar atualização:', error);
        return res.status(200).json({ 
          success: true,
          message: 'Webhook recebido mas erro ao atualizar status',
          orderId,
          error: error.message
        });
      }
    }

    // Para outros eventos, apenas registrar
    console.log(`ℹ️ Evento processado mas não requer atualização de status:`, {
      eventType,
      paymentStatus,
      billingType: paymentTypeName,
      orderId,
    });

    return res.status(200).json({ 
      success: true,
      message: 'Webhook recebido com sucesso',
      orderId,
      eventType,
      paymentStatus,
      paymentType: paymentTypeName,
      note: 'Evento não reconhecido como pagamento confirmado. Verifique os logs para mais detalhes.'
    });

  } catch (error: any) {
    console.error('❌ Erro ao processar webhook do Asaas:', error);
    return res.status(500).json({
      error: 'Erro ao processar webhook',
      details: error.message
    });
  }
}
