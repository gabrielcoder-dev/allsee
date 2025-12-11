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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { invoiceId, format = 'pdf' } = req.query;

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

    // Validar formato
    const validFormats = ['pdf', 'xml'];
    if (!validFormats.includes(format as string)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Formato inválido. Use "pdf" ou "xml"' 
      });
    }

    // Construir URL de download baseado no formato
    const downloadUrl = format === 'xml' 
      ? `${ASAAS_API_URL}/invoices/${invoiceId}/xml`
      : `${ASAAS_API_URL}/invoices/${invoiceId}/download`;

    // Buscar URL de download da nota fiscal
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        success: false,
        error: errorData.message || 'Erro ao baixar nota fiscal'
      });
    }

    // Para XML, retornar o conteúdo diretamente
    if (format === 'xml') {
      const contentType = response.headers.get('content-type');
      const isXml = contentType?.includes('application/xml') || contentType?.includes('text/xml');
      
      if (isXml) {
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="nota-fiscal-${invoiceId}.xml"`);
        return res.send(Buffer.from(buffer));
      }
      
      // Se retornar URL para XML
      const data = await response.json();
      if (data.url) {
        return res.status(200).json({
          success: true,
          url: data.url,
          format: 'xml'
        });
      }
    }

    // Para PDF, verificar se retornou PDF diretamente
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/pdf')) {
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="nota-fiscal-${invoiceId}.pdf"`);
      return res.send(Buffer.from(buffer));
    }

    // Se retornar URL
    const data = await response.json();
    if (data.url) {
      return res.status(200).json({
        success: true,
        url: data.url,
        format: format as string
      });
    }

    return res.status(200).json({
      success: true,
      data,
      format: format as string
    });

  } catch (error: any) {
    console.error('❌ Erro ao baixar nota fiscal:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao baixar nota fiscal'
    });
  }
}
