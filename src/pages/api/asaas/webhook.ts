import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { atualizarStatusCompra } from '@/lib/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Aceitar apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const event = req.body;

    console.log('📥 Webhook recebido do Asaas:', JSON.stringify(event, null, 2));

    // O Asaas envia eventos no formato: { event: 'PAYMENT_RECEIVED', payment: {...} }
    const eventType = event.event;
    const payment = event.payment;

    // Verificar se é um evento de pagamento válido
    if (!payment) {
      console.warn('⚠️ Webhook sem dados de pagamento');
      return res.status(400).json({ error: 'Dados de pagamento não encontrados' });
    }

    // Obter orderId do externalReference
    const orderIdRaw = payment.externalReference;
    
    if (!orderIdRaw) {
      console.warn('⚠️ Webhook sem externalReference (orderId)');
      return res.status(400).json({ error: 'externalReference (orderId) não encontrado' });
    }

    // Normalizar orderId (garantir que seja string, removendo espaços se houver)
    const orderId = typeof orderIdRaw === 'string' ? orderIdRaw.trim() : String(orderIdRaw);

    console.log(`🔍 OrderId recebido:`, {
      original: orderIdRaw,
      normalized: orderId,
      tipo: typeof orderIdRaw
    });

    const paymentId = payment.id;
    const paymentStatus = payment.status;
    const billingType = payment.billingType; // PIX, BOLETO, CREDIT_CARD
    const installments = payment.installments || 1; // Número total de parcelas
    const installmentNumber = payment.installment; // Número da parcela atual (se houver)
    const value = payment.value;

    // Identificar tipo de pagamento
    const paymentTypeName = 
      billingType === 'PIX' ? 'PIX' :
      billingType === 'BOLETO' ? 'BOLETO' :
      billingType === 'CREDIT_CARD' ? 'CARTÃO DE CRÉDITO' :
      billingType || 'DESCONHECIDO';

    console.log(`📋 Processando webhook para pedido ${orderId}:`, {
      eventType,
      paymentId,
      paymentStatus,
      billingType: paymentTypeName,
      installments,
      installmentNumber,
      valor: value,
      isParcelado: installments > 1,
    });

    // Verificar se o pedido existe - tentar com o orderId normalizado
    let order;
    let orderError;
    
    // Tentar buscar primeiro com o orderId como está
    let { data: orderData, error: orderErrorData } = await supabase
      .from('order')
      .select('id, status, preco')
      .eq('id', orderId)
      .single();

    // Se não encontrar, tentar como número (caso seja um ID numérico)
    if (orderErrorData || !orderData) {
      const numericId = Number(orderId);
      if (!isNaN(numericId)) {
        console.log(`🔄 Tentando buscar order como número: ${numericId}`);
        const { data: orderDataNumeric, error: orderErrorNumeric } = await supabase
          .from('order')
          .select('id, status, preco')
          .eq('id', numericId)
          .single();
        
        if (!orderErrorNumeric && orderDataNumeric) {
          orderData = orderDataNumeric;
          orderErrorData = null;
        }
      }
    }

    order = orderData;
    orderError = orderErrorData;

    if (orderError || !order) {
      console.error('❌ Pedido não encontrado:', orderId, orderError);
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    console.log(`📦 Pedido encontrado:`, {
      id: order.id,
      statusAtual: order.status,
      valorPedido: order.preco,
    });

    // Processar eventos de pagamento confirmado/recebido
    // Eventos que indicam pagamento confirmado:
    // - PAYMENT_RECEIVED
    // - PAYMENT_CONFIRMED
    // - Status: RECEIVED, CONFIRMED
    const isPaymentConfirmed = 
      eventType === 'PAYMENT_RECEIVED' ||
      eventType === 'PAYMENT_CONFIRMED' ||
      paymentStatus === 'RECEIVED' ||
      paymentStatus === 'CONFIRMED';

    if (isPaymentConfirmed) {
      // Verificar se deve atualizar o status baseado no tipo de pagamento
      let shouldUpdateStatus = false;
      let updateReason = '';

      // PIX: Sempre atualiza quando pagar (pagamento único)
      if (billingType === 'PIX') {
        shouldUpdateStatus = true;
        updateReason = 'Pagamento PIX recebido';
      }
      // BOLETO: Sempre atualiza quando pagar (pagamento único)
      else if (billingType === 'BOLETO') {
        shouldUpdateStatus = true;
        updateReason = 'Boleto pago';
      }
      // CARTÃO DE CRÉDITO: 
      // - Se não é parcelado (1 parcela), atualiza sempre
      // - Se é parcelado, atualiza quando for a primeira parcela (entrada)
      else if (billingType === 'CREDIT_CARD') {
        if (installments === 1 || !installmentNumber || installmentNumber === 1) {
          shouldUpdateStatus = true;
          updateReason = installments > 1 
            ? `Primeira parcela do cartão recebida (${installmentNumber}/${installments})`
            : 'Pagamento com cartão confirmado';
        } else {
          // Parcela subsequente - não atualiza status, mas registra
          console.log(`ℹ️ Parcela ${installmentNumber}/${installments} do cartão recebida para pedido ${orderId} - Status não alterado`);
          return res.status(200).json({ 
            success: true,
            message: `Parcela ${installmentNumber}/${installments} recebida - Status não alterado`,
            orderId,
            status: order.status,
            installmentNumber,
            installments
          });
        }
      }
      // Outros tipos de pagamento: atualiza sempre
      else {
        shouldUpdateStatus = true;
        updateReason = `Pagamento ${paymentTypeName} recebido`;
      }

      if (shouldUpdateStatus) {
        console.log(`🔄 Iniciando atualização do pedido:`, {
          orderId: orderId,
          tipo: typeof orderId,
          statusAtual: order.status,
          novoStatus: 'pago'
        });

        // Atualizar status do pedido diretamente no banco
        // Primeiro tentar atualizar diretamente com Supabase
        let updateSuccess = false;
        
        try {
          console.log(`📝 Tentando atualizar status diretamente no Supabase para orderId: ${orderId}...`);
          
          const { data: updatedOrder, error: directUpdateError } = await supabase
            .from('order')
            .update({ 
              status: 'pago',
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .select('id, status, updated_at')
            .single();

          if (directUpdateError) {
            console.error('❌ Erro na atualização direta:', directUpdateError);
            throw directUpdateError;
          }

          if (updatedOrder) {
            console.log(`✅ Status atualizado com sucesso (atualização direta):`, updatedOrder);
            updateSuccess = true;
          }
        } catch (directError: any) {
          console.warn(`⚠️ Erro na atualização direta, tentando função auxiliar:`, directError);
          
          // Se a atualização direta falhar, tentar usando a função auxiliar
          try {
            await atualizarStatusCompra(orderId, 'pago');
            console.log(`✅ Status do pedido ${orderId} atualizado via função auxiliar`);
            updateSuccess = true;
          } catch (updateError: any) {
            console.error('❌ Erro ao atualizar status do pedido (função auxiliar também falhou):', updateError);
            return res.status(500).json({ 
              error: 'Erro ao atualizar status do pedido',
              details: updateError.message,
              directError: directError.message
            });
          }
        }

        // Verificar se a atualização realmente funcionou
        if (updateSuccess) {
          const { data: verifyOrder, error: verifyError } = await supabase
            .from('order')
            .select('id, status')
            .eq('id', orderId)
            .single();

          if (verifyError) {
            console.error('❌ Erro ao verificar atualização:', verifyError);
          } else if (verifyOrder) {
            console.log(`✅ Verificação: Status atual do pedido é "${verifyOrder.status}"`);
            
            if (verifyOrder.status !== 'pago') {
              console.error(`❌ PROBLEMA: Status não foi atualizado! Status atual: "${verifyOrder.status}"`);
              // Tentar atualizar novamente de forma mais forçada
              const { error: forceUpdateError } = await supabase
                .from('order')
                .update({ status: 'pago' })
                .eq('id', orderId);
              
              if (forceUpdateError) {
                console.error('❌ Erro ao forçar atualização:', forceUpdateError);
              } else {
                console.log('✅ Atualização forçada concluída');
              }
            }
          }
        }

        // Tentar atualizar também o ID do pagamento no pedido (se a coluna existir)
        try {
          const { error: paymentIdError } = await supabase
            .from('order')
            .update({ 
              asaas_payment_id: paymentId,
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId);
          
          if (paymentIdError) {
            console.warn('⚠️ Aviso: não foi possível salvar asaas_payment_id:', paymentIdError.message);
          } else {
            console.log('✅ asaas_payment_id atualizado com sucesso');
          }
        } catch (updatePaymentIdError: any) {
          // Ignorar erro se a coluna não existir
          console.warn('⚠️ Aviso: não foi possível salvar asaas_payment_id (coluna pode não existir)');
        }

        console.log(`✅ Pedido ${orderId} processado com sucesso!`, {
          tipo: paymentTypeName,
          motivo: updateReason,
          statusAnterior: order.status,
          statusNovo: 'pago'
        });
        
        return res.status(200).json({ 
          success: true,
          message: 'Pagamento confirmado e pedido atualizado',
          orderId,
          status: 'pago',
          paymentType: paymentTypeName,
          reason: updateReason
        });
      }
    }

    // Para outros eventos, apenas registrar
    console.log(`ℹ️ Evento processado mas não requer atualização de status:`, {
      eventType,
      paymentStatus,
      billingType: paymentTypeName,
      orderId,
    });

    return res.status(200).json({ 
      success: true,
      message: 'Webhook recebido com sucesso',
      orderId,
      eventType,
      paymentStatus,
      paymentType: paymentTypeName
    });

  } catch (error: any) {
    console.error('❌ Erro ao processar webhook do Asaas:', error);
    return res.status(500).json({
      error: 'Erro ao processar webhook',
      details: error.message
    });
  }
}
