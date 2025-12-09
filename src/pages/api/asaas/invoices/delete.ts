import type { NextApiRequest, NextApiResponse } from 'next';

const ASAAS_ENVIRONMENT = process.env.ASAAS_ENVIRONMENT || 'sandbox';
const ASAAS_API_URL = ASAAS_ENVIRONMENT === 'production' 
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_API_KEY = process.env.KEY_API_ASAAS;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { invoiceId } = req.query;

    if (!invoiceId) {
      return res.status(400).json({ 
        success: false, 
        error: 'invoiceId é obrigatório' 
      });
    }

    if (!ASAAS_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'ASAAS_API_KEY não configurada' 
      });
    }

    const response = await fetch(
      `${ASAAS_API_URL}/invoices/${invoiceId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        success: false,
        error: errorData.message || 'Erro ao excluir nota fiscal'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Nota fiscal excluída com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro ao excluir nota fiscal:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao excluir nota fiscal'
    });
  }
}
