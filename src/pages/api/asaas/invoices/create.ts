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

    // Preparar dados da nota fiscal
    const invoiceData: any = {
      payment: paymentId,
      serviceDescription: serviceDescription || 'Serviço de publicidade em totens digitais',
      value: value || 0,
      effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
    };

    if (municipalServiceId) {
      invoiceData.municipalServiceId = municipalServiceId;
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Erro ao criar nota fiscal:', errorData);
      return res.status(response.status).json({
        success: false,
        error: errorData.message || 'Erro ao criar nota fiscal',
        details: errorData
      });
    }

    const invoice = await response.json();

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
