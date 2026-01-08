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
    if (!ASAAS_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'ASAAS_API_KEY não configurada' 
      });
    }

    // Tentar diferentes endpoints possíveis
    const endpoints = [
      `${ASAAS_API_URL}/municipalServices`,
      `${ASAAS_API_URL}/invoices/municipalServices`,
    ];

    let services: any[] = [];
    let lastError: any = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Tentando buscar serviços municipais em: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'access_token': ASAAS_API_KEY,
          },
        });

        if (response.ok) {
          const data = await response.json();
          services = data.data || data || [];
          
          if (Array.isArray(services) && services.length > 0) {
            console.log(`✅ Serviços municipais encontrados: ${services.length}`);
            break;
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          lastError = errorData;
          console.warn(`⚠️ Endpoint ${endpoint} retornou erro:`, errorData);
        }
      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ Erro ao buscar em ${endpoint}:`, error.message);
      }
    }

    if (services.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nenhum serviço municipal encontrado',
        message: 'Cadastre serviços municipais no Asaas: Notas Fiscais > Configurações > Serviços',
        details: lastError,
        help: {
          steps: [
            '1. Acesse o painel do Asaas',
            '2. Vá em "Notas Fiscais" > "Configurações"',
            '3. Clique em "Serviços" ou "Cadastrar Serviço"',
            '4. Adicione o código de serviço municipal, alíquota de ISS e descrição',
            '5. Após cadastrar, o ID aparecerá aqui ou você pode usar a variável ASAAS_MUNICIPAL_SERVICE_ID'
          ]
        }
      });
    }

    return res.status(200).json({
      success: true,
      services: services.map((service: any) => ({
        id: service.id,
        code: service.code || service.municipalServiceCode,
        description: service.description || service.municipalServiceName,
        issTax: service.issTax || service.iss,
        name: service.name
      })),
      total: services.length,
      message: 'Use o campo "id" como municipalServiceId na criação de notas fiscais'
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar serviços municipais:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao buscar serviços municipais'
    });
  }
}
