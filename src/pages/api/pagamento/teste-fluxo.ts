// Teste do fluxo completo: checkout -> webhook
// src/pages/api/pagamento/teste-fluxo.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServer } from '@/lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { orderId, testStatus = 'pago' } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId é obrigatório' });
    }

    console.log('🧪 TESTE DO FLUXO COMPLETO');
    console.log('📋 orderId:', orderId);

    // 1. Simular metadata do checkout
    const metadata = {
      order_id: orderId.toString(),
      user_id: 'test-user-123'
    };

    console.log('📦 Metadata simulado:', metadata);

    // 2. Simular extração do orderId (como no webhook)
    let extractedOrderId = null;
    
    if (metadata.order_id) {
      extractedOrderId = metadata.order_id.toString();
      console.log('✅ OrderId extraído do metadata:', extractedOrderId);
    }

    // 3. Verificar se a order existe
    console.log('🔍 Verificando se order existe...');
    
    const numericOrderId = parseInt(extractedOrderId, 10);
    let existingOrder = null;
    
    if (!isNaN(numericOrderId)) {
      const { data: orderData, error: orderError } = await supabaseServer
        .from("order")
        .select("id, status")
        .eq("id", numericOrderId)
        .single();
      
      if (!orderError && orderData) {
        existingOrder = orderData;
        console.log('✅ Order encontrada:', existingOrder);
      } else {
        console.log('❌ Order não encontrada:', orderError?.message);
      }
    }

    // 4. Simular atualização de status
    if (existingOrder) {
      console.log('🔄 Simulando atualização de status...');
      
      const { data: updatedOrder, error: updateError } = await supabaseServer
        .from("order")
        .update({ 
          status: testStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingOrder.id)
        .select("id, status, updated_at")
        .single();

      if (updateError) {
        console.error('❌ Erro na atualização:', updateError);
        return res.status(500).json({ 
          error: 'Erro ao atualizar order', 
          details: updateError.message 
        });
      }

      console.log('✅ Status atualizado:', updatedOrder);

      return res.status(200).json({
        success: true,
        message: 'Teste do fluxo concluído com sucesso',
        metadata: metadata,
        extractedOrderId: extractedOrderId,
        originalOrder: existingOrder,
        updatedOrder: updatedOrder
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Order não encontrada para teste',
        metadata: metadata,
        extractedOrderId: extractedOrderId
      });
    }

  } catch (error: any) {
    console.error('❌ Erro no teste:', error);
    return res.status(500).json({ 
      error: 'Erro interno', 
      details: error.message 
    });
  }
}
