import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { id_user, produtos, total, duracao, status, cliente, arte_campanha_url } = req.body;

    // Validação básica
    if (!id_user) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campo obrigatório faltando: id_user' 
      });
    }

    if (!produtos || !Array.isArray(produtos) || produtos.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campo obrigatório faltando: produtos (array não vazio)' 
      });
    }

    if (total === undefined || total === null) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campo obrigatório faltando: total' 
      });
    }

    console.log('📥 Criando pedido:', {
      id_user,
      totalProdutos: produtos.length,
      total,
      duracao,
      status: status || 'draft',
      temArte: !!arte_campanha_url,
      tipoCliente: cliente?.tipo || 'desconhecido'
    });

    // Preparar dados do pedido
    const orderData: any = {
      id_user,
      produtos: JSON.stringify(produtos),
      total: typeof total === 'number' ? total : parseFloat(total),
      duracao: duracao || '2',
      status: status || 'draft',
      cliente: cliente ? JSON.stringify(cliente) : null,
    };

    if (arte_campanha_url) {
      orderData.arte_campanha_url = arte_campanha_url;
    }

    // Inserir pedido no banco de dados
    const { data: order, error } = await supabase
      .from('order')
      .insert([orderData])
      .select('id, id_user, total, status, created_at')
      .single();

    if (error) {
      console.error("❌ Erro ao criar pedido:", error);
      return res.status(500).json({ 
        success: false, 
        error: `Erro ao salvar pedido: ${error.message}` 
      });
    }

    console.log('✅ Pedido criado com sucesso:', {
      id: order.id,
      id_user: order.id_user,
      total: order.total,
      status: order.status
    });

    // Headers para otimização
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    
    return res.status(200).json({ 
      success: true,
      orderId: order.id,
      order
    });
  } catch (error: any) {
    console.error('❌ Erro inesperado ao criar pedido:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro desconhecido ao criar pedido' 
    });
  }
}

