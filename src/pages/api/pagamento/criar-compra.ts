import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const dados = req.body;

    // Validações básicas
    if (!dados || typeof dados !== 'object') {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    // Formatar data de início da campanha
    if (dados.inicio_campanha) {
      dados.inicio_campanha = dados.inicio_campanha.substring(0, 10);
    }

    console.log('📝 Criando nova compra:', {
      empresa: dados.empresa,
      nicho: dados.nicho,
      valor: dados.valor,
      inicio_campanha: dados.inicio_campanha,
      alcance_campanha: dados.alcance_campanha,
      exibicoes_campanha: dados.exibicoes_campanha,
      duracao_campanha: dados.duracao_campanha
    });

    // Criar order com status pendente
    const { data, error } = await supabase
      .from('order')
      .insert([{ 
        ...dados, 
        status: 'pendente',
        created_at: new Date().toISOString()
      }])
      .select('id, status, created_at')
      .single();

    if (error) {
      console.error('❌ Erro ao criar order:', error);
      return res.status(500).json({ 
        error: 'Erro ao criar order', 
        details: error.message 
      });
    }

    console.log('✅ Order criado com sucesso:', {
      id: data.id,
      idType: typeof data.id,
      status: data.status
    });

    // Garantir que o orderId é retornado como string
    const orderId = data.id.toString()

    return res.status(200).json({ 
      success: true,
      orderId: orderId,
      status: data.status
    });

  } catch (error: any) {
    console.error('❌ Erro inesperado ao criar compra:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Aumentado para dados de compra
    },
  },
};
