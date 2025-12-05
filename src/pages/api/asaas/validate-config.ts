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
    const config = {
      environment: ASAAS_ENVIRONMENT,
      apiUrl: ASAAS_API_URL,
      hasApiKey: !!ASAAS_API_KEY,
      apiKeyLength: ASAAS_API_KEY?.length || 0,
      apiKeyPrefix: ASAAS_API_KEY ? `${ASAAS_API_KEY.substring(0, 15)}...` : null,
    };

    // Se não há chave configurada, retornar erro imediatamente
    if (!ASAAS_API_KEY) {
      return res.status(400).json({
        valid: false,
        config,
        error: 'KEY_API_ASAAS não configurada',
        solution: {
          title: 'Como configurar:',
          steps: [
            '1. Acesse https://sandbox.asaas.com/ (para sandbox) ou https://www.asaas.com/ (para produção)',
            '2. Faça login na sua conta',
            '3. Vá em Integrações → API',
            '4. Gere uma nova chave de API',
            '5. Copie a chave e adicione como variável de ambiente KEY_API_ASAAS',
            '6. Configure ASAAS_ENVIRONMENT=sandbox (ou production)',
            '7. Reinicie o servidor'
          ]
        }
      });
    }

    // Validar formato da chave
    if (ASAAS_API_KEY.length < 20) {
      return res.status(400).json({
        valid: false,
        config,
        error: 'Chave de API inválida (muito curta)',
        solution: {
          title: 'A chave parece estar incompleta:',
          steps: [
            'Verifique se a chave KEY_API_ASAAS foi copiada completamente',
            'Certifique-se de que não há espaços antes ou depois da chave',
            'Gere uma nova chave no painel do Asaas se necessário'
          ]
        }
      });
    }

    // Testar a chave fazendo uma chamada simples à API
    try {
      const testResponse = await fetch(`${ASAAS_API_URL}/myAccount`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
      });

      const testData = await testResponse.json().catch(() => ({}));
      
      if (!testResponse.ok) {
        const errorsArray = testData?.errors || testData?.error || [];
        const errorMessages = Array.isArray(errorsArray) 
          ? errorsArray.map((err: any) => err.description || err.message || err.code || JSON.stringify(err)).join('; ')
          : (typeof errorsArray === 'string' ? errorsArray : JSON.stringify(errorsArray));

        // Verificar se é erro de ambiente
        const isEnvironmentError = errorMessages.includes('não pertence a este ambiente') || 
                                   errorMessages.toLowerCase().includes('invalid_environment') ||
                                   errorsArray.some((e: any) => e.code === 'invalid_environment' || e.code === 'INVALID_ENVIRONMENT') ||
                                   testResponse.status === 401;

        if (isEnvironmentError) {
          return res.status(400).json({
            valid: false,
            config,
            error: `A chave de API não pertence ao ambiente ${ASAAS_ENVIRONMENT}`,
            status: testResponse.status,
            details: testData,
            solution: {
              title: `SOLUÇÃO PARA ERRO DE AMBIENTE:`,
              description: `A chave de API configurada não corresponde ao ambiente ${ASAAS_ENVIRONMENT}`,
              steps: [
                `1. Acesse ${ASAAS_ENVIRONMENT === 'production' ? 'https://www.asaas.com/' : 'https://sandbox.asaas.com/'}`,
                '2. Faça login na sua conta',
                '3. Vá em Integrações → API',
                `4. Gere uma nova chave de API (do ambiente ${ASAAS_ENVIRONMENT})`,
                '5. Copie a chave COMPLETA',
                '6. No seu arquivo .env.local ou no painel do Vercel, configure:',
                `   ASAAS_ENVIRONMENT=${ASAAS_ENVIRONMENT}`,
                '   KEY_API_ASAAS=sua_chave_aqui',
                '7. Reinicie o servidor após configurar'
              ],
              important: [
                '⚠️ Chaves de SANDBOX só funcionam com ASAAS_ENVIRONMENT=sandbox',
                '⚠️ Chaves de PRODUÇÃO só funcionam com ASAAS_ENVIRONMENT=production',
                '⚠️ As chaves são diferentes entre os ambientes'
              ]
            }
          });
        }

        return res.status(400).json({
          valid: false,
          config,
          error: errorMessages || 'Erro ao validar chave de API',
          status: testResponse.status,
          details: testData
        });
      }

      // Sucesso! A configuração está válida
      return res.status(200).json({
        valid: true,
        config: {
          ...config,
          accountName: testData.name || testData.companyName || 'Conta válida'
        },
        message: 'Configuração do ASAAS está válida!'
      });

    } catch (testError: any) {
      return res.status(500).json({
        valid: false,
        config,
        error: 'Erro ao testar conexão com ASAAS',
        details: testError.message
      });
    }

  } catch (error: any) {
    return res.status(500).json({
      valid: false,
      error: error.message || 'Erro desconhecido',
      details: process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
    });
  }
}
