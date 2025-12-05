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
    const orderId = payment.externalReference;
    
    if (!orderId) {
      console.warn('⚠️ Webhook sem externalReference (orderId)');
      return res.status(400).json({ error: 'externalReference (orderId) não encontrado' });
    }

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

    // Verificar se o pedido existe
    const { data: order, error: orderError } = await supabase
      .from('order')
      .select('id, status, preco')
      .eq('id', orderId)
      .single();

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
        // Verificar se o pedido já está pago (evitar atualizações desnecessárias)
        if (order.status === 'pago') {
          console.log(`ℹ️ Pedido ${orderId} já está com status "pago" - Atualizando apenas ID do pagamento`);
        } else {
          // Atualizar status do pedido para "pago" usando a função existente
          try {
            await atualizarStatusCompra(orderId, 'pago');
            console.log(`✅ Status do pedido ${orderId} atualizado para "pago" - Motivo: ${updateReason}`);
          } catch (updateError: any) {
            console.error('❌ Erro ao atualizar status do pedido:', updateError);
            return res.status(500).json({ 
              error: 'Erro ao atualizar status do pedido',
              details: updateError.message 
            });
          }
        }

        // Tentar atualizar também o ID do pagamento no pedido (se a coluna existir)
        try {
          await supabase
            .from('order')
            .update({ 
              asaas_payment_id: paymentId,
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId);
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
