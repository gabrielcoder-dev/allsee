import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const orderId = req.query.id;

    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID do pedido é obrigatório' 
      });
    }

    const { data: order, error } = await supabase
      .from('order')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      console.error("❌ Erro ao buscar pedido:", error);
      return res.status(500).json({ 
        success: false, 
        error: `Erro ao buscar pedido: ${error.message}` 
      });
    }

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Pedido não encontrado' 
      });
    }

    return res.status(200).json(order);
  } catch (error: any) {
    console.error('❌ Erro inesperado ao buscar pedido:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro desconhecido ao buscar pedido' 
    });
  }
}

