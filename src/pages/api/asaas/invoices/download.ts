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

    // Primeiro, buscar informações da nota fiscal para obter a URL de download
    const invoiceInfoUrl = `${ASAAS_API_URL}/invoices/${invoiceId}`;
    const invoiceInfoResponse = await fetch(invoiceInfoUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
    });

    if (!invoiceInfoResponse.ok) {
      const errorData = await invoiceInfoResponse.json().catch(() => ({}));
      console.error('❌ Erro ao buscar informações da nota fiscal:', errorData);
      return res.status(invoiceInfoResponse.status).json({
        success: false,
        error: errorData.message || `Nota fiscal não encontrada (ID: ${invoiceId})`
      });
    }

    const invoiceData = await invoiceInfoResponse.json();
    console.log('📄 Dados da nota fiscal:', { id: invoiceId, status: invoiceData.status, data: invoiceData });

    // Verificar se a nota fiscal está autorizada
    if (invoiceData.status !== 'AUTHORIZED') {
      return res.status(400).json({
        success: false,
        error: `Nota fiscal não está autorizada. Status atual: ${invoiceData.status}`
      });
    }

    // Tentar obter URL de download da resposta ou construir endpoint
    let downloadUrl: string;

    // Verificar se há URL de download nos dados da nota fiscal
    if (invoiceData.downloadUrl) {
      downloadUrl = invoiceData.downloadUrl;
    } else if (format === 'xml' && invoiceData.xmlUrl) {
      downloadUrl = invoiceData.xmlUrl;
    } else if (format === 'pdf' && invoiceData.pdfUrl) {
      downloadUrl = invoiceData.pdfUrl;
    } else {
      // Construir URL de download baseado no formato (tentar diferentes endpoints)
      if (format === 'xml') {
        downloadUrl = `${ASAAS_API_URL}/invoices/${invoiceId}/xml`;
      } else {
        // Tentar diferentes endpoints para PDF
        downloadUrl = `${ASAAS_API_URL}/invoices/${invoiceId}/download`;
      }
    }

    console.log('🔗 URL de download:', downloadUrl);

    // Buscar arquivo de download
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
    });

    if (!response.ok) {
      // Se o endpoint direto não funcionar, tentar retornar URL se disponível
      if (response.status === 404 && invoiceData.downloadUrl) {
        return res.status(200).json({
          success: true,
          url: invoiceData.downloadUrl,
          format: format as string
        });
      }

      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Erro ao baixar nota fiscal:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      return res.status(response.status).json({
        success: false,
        error: errorData.message || `Erro ao baixar nota fiscal (${response.status})`
      });
    }

    // Verificar o tipo de conteúdo da resposta
    const contentType = response.headers.get('content-type') || '';
    console.log('📦 Content-Type da resposta:', contentType);

    // Se for PDF ou XML binário, retornar diretamente
    if (contentType.includes('application/pdf')) {
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="nota-fiscal-${invoiceId}.pdf"`);
      return res.send(Buffer.from(buffer));
    }

    if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="nota-fiscal-${invoiceId}.xml"`);
      return res.send(Buffer.from(buffer));
    }

    // Se não for binário, tentar ler como JSON ou texto
    const responseText = await response.text();
    console.log('📄 Resposta (primeiros 200 chars):', responseText.substring(0, 200));

    // Tentar parsear como JSON
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      // Se não for JSON, pode ser XML ou outro formato de texto
      if (format === 'xml' || responseText.trim().startsWith('<?xml')) {
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="nota-fiscal-${invoiceId}.xml"`);
        return res.send(responseText);
      }
      
      // Se não conseguir determinar, retornar como texto
      return res.status(200).json({
        success: false,
        error: 'Formato de resposta não reconhecido',
        contentType,
        preview: responseText.substring(0, 100)
      });
    }

    // Se retornou JSON com URL
    if (data.url) {
      return res.status(200).json({
        success: true,
        url: data.url,
        format: format as string
      });
    }

    // Se retornou JSON com dados da nota fiscal que contém URL
    if (data.downloadUrl) {
      return res.status(200).json({
        success: true,
        url: data.downloadUrl,
        format: format as string
      });
    }

    // Se não encontrou URL, retornar erro informativo
    return res.status(200).json({
      success: false,
      error: 'URL de download não encontrada na resposta da API',
      data: data,
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
