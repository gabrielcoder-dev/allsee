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

  // Data/hora limite: agora - 24 horas
  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('order')
    .delete()
    .lt('created_at', limite)
    .eq('status', 'pendente');

  if (error) {
    console.error('Erro ao deletar orders pendentes antigas:', error);
    return res.status(500).json({ error: 'Erro ao deletar orders pendentes antigas' });
  }

  return res.status(200).json({ message: 'Orders pendentes antigas deletadas com sucesso!' });
} 