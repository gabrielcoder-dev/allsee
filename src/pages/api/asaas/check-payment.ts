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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        error: 'orderId é obrigatório' 
      });
    }

    if (!ASAAS_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'ASAAS_API_KEY não configurada' 
      });
    }

    console.log(`🔍 Verificando pagamento para orderId: ${orderId}`);

    // Buscar pedido no banco
    const { data: order, error: orderError } = await supabase
      .from('order')
      .select('id, status, asaas_payment_id, preco')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('❌ Pedido não encontrado:', orderId, orderError);
      return res.status(404).json({ 
        success: false, 
        error: 'Pedido não encontrado' 
      });
    }

    console.log(`📦 Pedido encontrado:`, {
      id: order.id,
      status: order.status,
      asaas_payment_id: order.asaas_payment_id
    });

    // Se já está pago no banco, retornar sucesso
    if (order.status === 'pago') {
      console.log(`✅ Pedido já está marcado como pago no banco`);
      return res.status(200).json({
        success: true,
        paid: true,
        status: 'pago',
        source: 'database'
      });
    }

    // Se não tem asaas_payment_id, tentar buscar pelo externalReference
    if (!order.asaas_payment_id) {
      console.warn('⚠️ Pedido não tem asaas_payment_id, tentando buscar no Asaas pelo externalReference...');
      
      try {
        // Buscar pagamentos com o externalReference igual ao orderId
        const searchResponse = await fetch(
          `${ASAAS_API_URL}/payments?customer=${orderId}&limit=100`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'access_token': ASAAS_API_KEY,
            },
          }
        );

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          // Procurar pagamento com externalReference igual ao orderId
          const payment = searchData.data?.find((p: any) => 
            p.externalReference === orderId || 
            p.external_reference === orderId ||
            p.externalReference === String(orderId)
          );

          if (payment) {
            console.log('✅ Pagamento encontrado no Asaas pelo externalReference:', {
              paymentId: payment.id,
              status: payment.status,
              externalReference: payment.externalReference
            });

            // Salvar o asaas_payment_id no pedido
            await supabase
              .from('order')
              .update({ 
                asaas_payment_id: payment.id,
                updated_at: new Date().toISOString()
              })
              .eq('id', orderId);

            // Verificar se está pago
            const isPaid = payment.status === 'RECEIVED' || 
                           payment.status === 'CONFIRMED' ||
                           payment.status === 'RECEIVED_IN_CASH_OFFLINE';

            if (isPaid && order.status !== 'pago') {
              console.log('🔄 Pagamento confirmado no Asaas, atualizando banco...');
              await supabase
                .from('order')
                .update({ 
                  status: 'pago',
                  updated_at: new Date().toISOString()
                })
                .eq('id', orderId);
            }

            return res.status(200).json({
              success: true,
              paid: isPaid,
              status: isPaid ? 'pago' : order.status,
              asaasStatus: payment.status,
              source: 'asaas',
              paymentId: payment.id
            });
          }
        }
      } catch (searchError: any) {
        console.warn('⚠️ Erro ao buscar pagamento pelo externalReference:', searchError);
      }

      console.warn('⚠️ Não foi possível encontrar pagamento no Asaas, verificando apenas no banco');
      return res.status(200).json({
        success: true,
        paid: false,
        status: order.status,
        source: 'database',
        message: 'Pagamento ainda não foi processado ou não encontrado no Asaas'
      });
    }

    // Verificar status do pagamento diretamente no Asaas
    try {
      console.log(`🔄 Verificando pagamento no Asaas: ${order.asaas_payment_id}`);
      
      const paymentResponse = await fetch(
        `${ASAAS_API_URL}/payments/${order.asaas_payment_id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'access_token': ASAAS_API_KEY,
          },
        }
      );

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json().catch(() => ({}));
        console.error('❌ Erro ao buscar pagamento no Asaas:', {
          status: paymentResponse.status,
          error: errorData
        });
        
        // Se não conseguir verificar no Asaas, retornar status do banco
        return res.status(200).json({
          success: true,
          paid: order.status === 'pago',
          status: order.status,
          source: 'database',
          message: 'Não foi possível verificar no Asaas, usando status do banco'
        });
      }

      const paymentData = await paymentResponse.json();
      
      console.log(`📋 Status do pagamento no Asaas:`, {
        id: paymentData.id,
        status: paymentData.status,
        billingType: paymentData.billingType,
        value: paymentData.value
      });

      // Verificar se o pagamento está confirmado/recebido
      const isPaid = paymentData.status === 'RECEIVED' || 
                     paymentData.status === 'CONFIRMED' ||
                     paymentData.status === 'RECEIVED_IN_CASH_OFFLINE';

      // Se está pago no Asaas mas não no banco, atualizar o banco
      if (isPaid && order.status !== 'pago') {
        console.log(`🔄 Pagamento confirmado no Asaas, atualizando banco...`);
        
        const { error: updateError } = await supabase
          .from('order')
          .update({ 
            status: 'pago',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (updateError) {
          console.error('❌ Erro ao atualizar status no banco:', updateError);
        } else {
          console.log(`✅ Status atualizado para "pago" no banco`);
        }
      }

      return res.status(200).json({
        success: true,
        paid: isPaid,
        status: isPaid ? 'pago' : order.status,
        asaasStatus: paymentData.status,
        source: 'asaas',
        paymentData: {
          id: paymentData.id,
          status: paymentData.status,
          billingType: paymentData.billingType,
          value: paymentData.value,
          dueDate: paymentData.dueDate
        }
      });

    } catch (asaasError: any) {
      console.error('❌ Erro ao verificar pagamento no Asaas:', asaasError);
      
      // Em caso de erro, retornar status do banco
      return res.status(200).json({
        success: true,
        paid: order.status === 'pago',
        status: order.status,
        source: 'database',
        error: 'Erro ao verificar no Asaas, usando status do banco'
      });
    }

  } catch (error: any) {
    console.error('❌ Erro inesperado ao verificar pagamento:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao verificar pagamento'
    });
  }
}
