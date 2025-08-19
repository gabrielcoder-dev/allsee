// pages/api/mercado-pago/webhook.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { Payment, MercadoPagoConfig } from "mercadopago";
import { atualizarStatusCompra } from "@/lib/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      body: parsedBody,
      headers: req.headers
    });

    const paymentId = parsedBody?.data?.id || (req.query?.id as string);
    const topic = parsedBody?.type || (req.query?.type as string) || (req.query?.topic as string);

    // Validações básicas
    if (topic !== "payment" || !paymentId) {
      console.error("❌ Payload inválido:", req.body);
      return res.status(400).json({ error: "Payload inválido" });
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
      return res.status(500).json({ error: "Token de acesso não configurado" });
    }

    // Inicializar cliente do Mercado Pago
    const mercadoPagoClient = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
    });

    const paymentClient = new Payment(mercadoPagoClient);

    // Buscar dados do pagamento
    const payment = await paymentClient.get({ id: paymentId });
    const isLiveMode = payment?.live_mode ?? req.headers['x-test-event'] !== 'true';
    console.log("🌐 Ambiente do evento:", { liveMode: isLiveMode });
    
    console.log("📊 Dados do pagamento:", {
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
      amount: payment.transaction_amount,
      payment_method: payment.payment_method?.type
    });

    const externalReference = payment.external_reference;
    const status = payment.status;

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
        internalStatus = 'aprovado';
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

    // Atualizar status da compra no banco
    await atualizarStatusCompra(externalReference, internalStatus);
    
    console.log("🎉 Order atualizado com sucesso!", {
      orderId: externalReference,
      status: internalStatus,
      originalStatus: status
    });

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
    
    return res.status(500).json({ 
      error: "Erro ao processar webhook",
      details: error.message || "Erro desconhecido"
    });
  }
}





