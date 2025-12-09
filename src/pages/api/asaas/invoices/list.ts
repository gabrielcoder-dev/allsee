import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const { userId, limit = 100, offset = 0 } = req.query;

    // Buscar notas fiscais no Asaas
    let url = `${ASAAS_API_URL}/invoices?limit=${limit}&offset=${offset}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Erro ao buscar notas fiscais:', errorData);
      return res.status(response.status).json({
        success: false,
        error: errorData.message || 'Erro ao buscar notas fiscais',
        details: errorData
      });
    }

    const data = await response.json();
    let invoices = data.data || data || [];

    // Se userId foi fornecido, filtrar apenas notas fiscais do usuário
    if (userId) {
      // Buscar pedidos do usuário
      const { data: orders, error: ordersError } = await supabase
        .from('order')
        .select('id, asaas_payment_id')
        .eq('id_user', userId);

      if (ordersError) {
        console.error('❌ Erro ao buscar pedidos do usuário:', ordersError);
      } else {
        const paymentIds = orders?.map(o => o.asaas_payment_id).filter(Boolean) || [];
        
        // Filtrar notas fiscais que pertencem aos pagamentos do usuário
        invoices = invoices.filter((invoice: any) => 
          paymentIds.includes(invoice.payment)
        );
      }
    }

    // Enriquecer com dados do pedido quando possível
    const enrichedInvoices = await Promise.all(
      invoices.map(async (invoice: any) => {
        if (invoice.payment) {
          // Buscar pedido pelo payment ID
          const { data: order } = await supabase
            .from('order')
            .select('id, nome_campanha, preco, id_user')
            .eq('asaas_payment_id', invoice.payment)
            .single();

          return {
            ...invoice,
            order: order || null
          };
        }
        return invoice;
      })
    );

    return res.status(200).json({
      success: true,
      invoices: enrichedInvoices,
      total: enrichedInvoices.length
    });

  } catch (error: any) {
    console.error('❌ Erro inesperado ao listar notas fiscais:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao listar notas fiscais'
    });
  }
}
