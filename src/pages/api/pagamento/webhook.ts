// src/pages/api/pagamento/webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Payment, MercadoPagoConfig } from "mercadopago";
import { supabaseServer } from "@/lib/supabaseServer";

interface WebhookResponse {
  success: boolean;
  message: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<WebhookResponse>) {
  // ✅ Sempre responder 200 para o Mercado Pago (evita reenvio de webhook)
  const sendResponse = (status: number, data: WebhookResponse) => {
    res.status(status).json(data);
  };

  if (req.method !== "POST") {
    return sendResponse(405, { success: false, message: "Método não permitido" });
  }

  try {
    // 🧩 Parse do payload recebido
    let payload: any;
    try {
      payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (error) {
      console.error("❌ Erro ao parsear payload:", error);
      return sendResponse(200, { success: false, message: "Payload inválido" });
    }

    console.log("📦 Webhook recebido:", payload);

    // 🧩 Verificar se é um evento de pagamento
    if (payload.type !== "payment" || !payload.data?.id) {
      console.log("ℹ️ Evento ignorado (não é pagamento)");
      return sendResponse(200, { success: true, message: "Evento ignorado" });
    }

    const paymentId = payload.data.id;
    console.log("💳 ID do pagamento recebido:", paymentId);

    // 🧩 Validar tokens de ambiente
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error("❌ MERCADO_PAGO_ACCESS_TOKEN não configurado");
      return sendResponse(200, { success: false, message: "Token não configurado" });
    }

    // 🔧 Inicializar cliente Mercado Pago
    const mpClient = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    });
    const paymentClient = new Payment(mpClient);

    // 🔎 Buscar detalhes do pagamento
    let payment;
    try {
      payment = await paymentClient.get({ id: paymentId });
      console.log("🔍 Detalhes do pagamento obtidos:", payment);
    } catch (error: any) {
      console.error("❌ Erro ao buscar pagamento:", error);
      return sendResponse(200, { success: false, message: "Erro ao buscar pagamento" });
    }

    // 🧩 Extrair external_reference (orderId)
    const externalReference = payment.external_reference;
    if (!externalReference) {
      console.warn("⚠️ Pagamento sem external_reference");
      return sendResponse(200, { success: false, message: "Sem referência externa" });
    }

    const orderId = externalReference.toString(); // Suporte a UUID (string)
    console.log("🧾 orderId (external_reference):", orderId);

    // 📊 Mapear status do Mercado Pago → status interno
    const statusMapping: Record<string, string> = {
      approved: "pago",
      pending: "pendente",
      in_process: "processando",
      rejected: "cancelado",
      cancelled: "cancelado",
      refunded: "reembolsado",
      charged_back: "estornado",
    };

    const paymentStatus = payment.status || "unknown";
    const internalStatus = statusMapping[paymentStatus] || "pendente";

    console.log(`📈 Status do pagamento: ${paymentStatus} → ${internalStatus}`);

    // 🧮 Atualizar status no Supabase
    const { error: updateError } = await supabaseServer
      .from("order")
      .update({ status: internalStatus })
      .eq("id", orderId);

    if (updateError) {
      console.error("❌ Erro ao atualizar status no Supabase:", updateError);
      return sendResponse(200, { success: false, message: "Erro ao atualizar order" });
    }

    console.log("✅ Status da order atualizado com sucesso!");
    return sendResponse(200, { success: true, message: "Order atualizada com sucesso" });
  } catch (error: any) {
    console.error("❌ Erro inesperado no webhook:", error);
    return sendResponse(200, { success: false, message: "Erro interno" });
  }
}
