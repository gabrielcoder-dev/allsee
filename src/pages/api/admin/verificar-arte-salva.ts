import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { orderId, userId } = req.query;

    if (!orderId || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('🔍 Verificando arte salva:', { orderId, userId });

    // Buscar a última arte criada para este order e user
    const { data: arteCampanha, error } = await supabase
      .from('arte_campanha')
      .select('id, id_order, id_user, created_at')
      .eq('id_order', orderId)
      .eq('id_user', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("❌ Erro ao buscar arte:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!arteCampanha) {
      console.log("❌ Nenhuma arte encontrada");
      return res.status(404).json({ success: false, error: 'Arte não encontrada' });
    }

    console.log('✅ Arte encontrada:', {
      id: arteCampanha.id,
      id_order: arteCampanha.id_order,
      id_user: arteCampanha.id_user,
      created_at: arteCampanha.created_at
    });

    return res.status(200).json({ 
      success: true, 
      arte_campanha_id: arteCampanha.id 
    });

  } catch (error) {
    console.error("❌ Erro no endpoint verificar-arte-salva:", error);
    return res.status(500).json({ success: false, error: 'Erro ao verificar arte' });
  }
}
