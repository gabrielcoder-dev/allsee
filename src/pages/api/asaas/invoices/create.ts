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
    const { paymentId, serviceDescription, value, effectiveDate, municipalServiceId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'paymentId é obrigatório' 
      });
    }

    if (!ASAAS_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'ASAAS_API_KEY não configurada' 
      });
    }

    // Validar e converter valor
    let invoiceValue = 0;
    if (value) {
      invoiceValue = typeof value === 'number' ? value : parseFloat(String(value));
    }
    
    // Garantir que o valor seja um número válido maior que 0
    if (isNaN(invoiceValue) || invoiceValue <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valor da nota fiscal inválido. O valor deve ser maior que zero.',
        details: { receivedValue: value, calculatedValue: invoiceValue }
      });
    }

    // Validar formato da data (YYYY-MM-DD)
    let invoiceDate = effectiveDate || new Date().toISOString().split('T')[0];
    
    // Se a data foi fornecida, validar formato
    if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Formato de data inválido. Use o formato YYYY-MM-DD.',
        details: { receivedDate: effectiveDate, calculatedDate: invoiceDate }
      });
    }

    // Verificar se o payment existe e está válido
    try {
      const paymentCheckResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
      });

      if (!paymentCheckResponse.ok) {
        const paymentError = await paymentCheckResponse.json().catch(() => ({}));
        return res.status(400).json({ 
          success: false, 
          error: `Pagamento não encontrado ou inválido: ${paymentError.message || 'Erro ao buscar pagamento'}`,
          details: paymentError
        });
      }

      const paymentData = await paymentCheckResponse.json();
      
      // Verificar se o payment está deletado
      if (paymentData.deleted === true) {
        return res.status(400).json({ 
          success: false, 
          error: 'Não é possível criar nota fiscal para pagamento deletado'
        });
      }

      // Se o valor não foi fornecido, usar o valor do pagamento
      if (!value && paymentData.value) {
        invoiceValue = typeof paymentData.value === 'number' ? paymentData.value : parseFloat(String(paymentData.value));
        if (isNaN(invoiceValue) || invoiceValue <= 0) {
          return res.status(400).json({ 
            success: false, 
            error: 'Valor do pagamento inválido para criar nota fiscal',
            details: { paymentValue: paymentData.value }
          });
        }
      }
    } catch (paymentCheckError: any) {
      console.warn('⚠️ Erro ao verificar pagamento, continuando mesmo assim:', paymentCheckError.message);
    }

    // Preparar dados da nota fiscal
    const invoiceData: any = {
      payment: paymentId,
      serviceDescription: (serviceDescription || 'Serviço de publicidade em totens digitais').substring(0, 500), // Limitar tamanho
      value: invoiceValue.toFixed(2), // Formatar com 2 casas decimais
      effectiveDate: invoiceDate,
    };

    // municipalServiceId é opcional, mas se fornecido, deve ser incluído
    if (municipalServiceId) {
      invoiceData.municipalServiceId = municipalServiceId;
    }

    // Validações finais antes de enviar
    if (!invoiceData.payment || !invoiceData.value || !invoiceData.effectiveDate) {
      const missingFields = [];
      if (!invoiceData.payment) missingFields.push('payment');
      if (!invoiceData.value) missingFields.push('value');
      if (!invoiceData.effectiveDate) missingFields.push('effectiveDate');
      
      return res.status(400).json({ 
        success: false, 
        error: `Campos obrigatórios faltando: ${missingFields.join(', ')}`,
        details: { missingFields }
      });
    }

    console.log('📝 Criando nota fiscal:', invoiceData);

    const response = await fetch(`${ASAAS_API_URL}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify(invoiceData),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
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
          errorMessages.push(`Erro ao criar nota fiscal (${response.status})`);
        }
      }
      
      const errorMessage = errorMessages.join('; ');
      
      console.error('❌ Erro ao criar nota fiscal:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        errorMessages,
        invoiceData: {
          ...invoiceData,
          value: invoiceData.value, // Já formatado
        }
      });
      
      return res.status(response.status).json({
        success: false,
        error: errorMessage,
        details: errorData,
        invoiceData: invoiceData // Incluir dados enviados para debug
      });
    }

    // Parse da resposta de sucesso
    let invoice: any;
    try {
      invoice = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse da resposta de sucesso:', parseError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao processar resposta da API do Asaas',
        details: { responseText: responseText.substring(0, 500) }
      });
    }

    return res.status(200).json({
      success: true,
      invoice
    });

  } catch (error: any) {
    console.error('❌ Erro inesperado ao criar nota fiscal:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao criar nota fiscal'
    });
  }
}
