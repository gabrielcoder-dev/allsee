import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service Role Key para insert
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const dados = req.body;

  // Garante que inicio_campanha será apenas yyyy-MM-dd
  if (dados.inicio_campanha) {
    dados.inicio_campanha = dados.inicio_campanha.substring(0, 10);
  }

  console.log('Body recebido em criar-compra:', JSON.stringify(dados, null, 2));

  // Adiciona status pendente
  const { data, error } = await supabase
    .from('order')
    .insert([{ ...dados, status: 'pendente' }])
    .select('id')
    .single();

  if (error) {
    console.error('Erro ao criar order:', error);
    return res.status(500).json({ error: 'Erro ao criar order', details: error });
  }

  return res.status(200).json({ id: data.id });
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1000mb',
    },
  },
}; 