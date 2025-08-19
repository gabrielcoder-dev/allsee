// pages/api/mercado-pago/webhook.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { Payment, MercadoPagoConfig } from "mercadopago";
import { atualizarStatusCompra } from "@/lib/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("🚀 Webhook iniciado - Método:", req.method);
  
  if (req.method !== "POST") {
    console.log("❌ Método não permitido:", req.method);
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // Alguns providers enviam body como string quando o content-type não é application/json
    const rawBody = typeof req.body === 'string' ? req.body : undefined;
    let parsedBody: any = req.body;
    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch (e) {
        console.warn("⚠️ Body não estava em JSON válido, mantendo como texto.");
      }
    }

    console.log("📨 Webhook recebido:", {
      method: req.method,
      url: req.url,
      body: parsedBody,
      headers: req.headers,
      query: req.query
    });

    const paymentId = parsedBody?.data?.id || (req.query?.id as string);
    const topic = parsedBody?.type || (req.query?.type as string) || (req.query?.topic as string);

    // Validações básicas
    if (topic !== "payment" || !paymentId) {
      console.error("❌ Payload inválido:", req.body);
      return res.status(200).json({ 
        received: true,
        message: "Webhook recebido mas payload inválido",
        error: "Payload inválido",
        topic: topic,
        paymentId: paymentId
      });
    }

    // Verificar se é um teste do Mercado Pago
    if (paymentId === "123456") {
      console.log("🧪 Teste do Mercado Pago detectado");
      return res.status(200).json({ 
        received: true, 
        message: "Teste do webhook recebido com sucesso",
        test: true
      });
    }

    console.log("💳 Processando pagamento ID:", paymentId);

    // Validar token de acesso
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error("❌ MERCADO_PAGO_ACCESS_TOKEN não configurado");
      return res.status(200).json({ 
        received: true, 
        message: "Webhook recebido mas token não configurado",
        error: "Token de acesso não configurado" 
      });
    }

    // Inicializar cliente do Mercado Pago
    const mercadoPagoClient = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
    });

    const paymentClient = new Payment(mercadoPagoClient);

    // Buscar dados do pagamento
    let payment;
    try {
      payment = await paymentClient.get({ id: paymentId });
      const isLiveMode = payment?.live_mode ?? req.headers['x-test-event'] !== 'true';
      console.log("🌐 Ambiente do evento:", { liveMode: isLiveMode });
      
      console.log("📊 Dados do pagamento:", {
        id: payment.id,
        status: payment.status,
        external_reference: payment.external_reference,
        amount: payment.transaction_amount,
        payment_method: payment.payment_method?.type
      });
    } catch (paymentError: any) {
      console.error("❌ Erro ao buscar pagamento:", paymentError);
      return res.status(200).json({ 
        received: true, 
        message: "Webhook recebido mas erro ao buscar pagamento",
        error: paymentError.message || "Erro desconhecido",
        paymentId: paymentId
      });
    }

    const externalReference = payment.external_reference;
    const status = payment.status;
    
    console.log("🔍 Status do pagamento:", status);

    if (!externalReference) {
      console.log("⚠️ Pagamento sem referência externa");
      return res.status(200).json({ 
        received: true, 
        message: "Pagamento processado mas sem referência externa",
        status: status
      });
    }

    // Mapear status do Mercado Pago para status interno
    let internalStatus = 'pendente';
    switch (status) {
      case 'approved':
        internalStatus = 'pago'; // Mudança: 'aprovado' -> 'pago'
        break;
      case 'rejected':
        internalStatus = 'rejeitado';
        break;
      case 'cancelled':
        internalStatus = 'cancelado';
        break;
      case 'pending':
        internalStatus = 'pendente';
        break;
      case 'in_process':
        internalStatus = 'em_processamento';
        break;
      default:
        internalStatus = 'pendente';
    }
    
    console.log("🔄 Mapeamento de status:", { 
      statusOriginal: status, 
      statusInterno: internalStatus 
    });

    // Atualizar status da compra no banco
    try {
      await atualizarStatusCompra(externalReference, internalStatus);
      
      console.log("🎉 Order atualizado com sucesso!", {
        orderId: externalReference,
        status: internalStatus,
        originalStatus: status
      });
    } catch (updateError: any) {
      console.error("❌ Erro ao atualizar status:", updateError);
      return res.status(200).json({ 
        received: true, 
        message: "Webhook recebido mas erro ao atualizar status",
        error: updateError.message || "Erro desconhecido",
        orderId: externalReference,
        status: internalStatus
      });
    }

    return res.status(200).json({ 
      received: true, 
      message: "Status atualizado com sucesso",
      orderId: externalReference,
      status: internalStatus,
      originalStatus: status
    });

  } catch (error: any) {
    console.error("❌ Erro no webhook:", error);
    
    // Log detalhado do erro
    if (error.message) {
      console.error("Mensagem de erro:", error.message);
    }
    if (error.cause) {
      console.error("Causa do erro:", error.cause);
    }
    
    // Sempre retornar 200 para evitar falha de entrega
    return res.status(200).json({ 
      received: true,
      message: "Webhook recebido mas erro interno",
      error: "Erro ao processar webhook",
      details: error.message || "Erro desconhecido"
    });
  }
}





