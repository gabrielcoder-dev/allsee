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
    console.log("🔍 External reference encontrado:", {
      value: externalReference,
      type: typeof externalReference,
      isNull: externalReference === null,
      isUndefined: externalReference === undefined,
      isEmpty: externalReference === '',
      length: externalReference?.toString().length
    });

    if (!externalReference) {
      console.warn("⚠️ Pagamento sem external_reference");
      return sendResponse(200, { success: false, message: "Sem referência externa" });
    }

    const orderId = externalReference.toString();
    console.log("🧾 orderId (external_reference):", orderId);
    console.log("🔍 Tipo do orderId:", typeof orderId);
    console.log("🔍 É UUID?", orderId.includes('-') && orderId.length === 36);

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

    // 🔍 Verificar se a order existe antes de atualizar
    console.log(`🔍 Verificando se order ${orderId} existe...`);
    
    // Tentar buscar por UUID primeiro, depois por número se necessário
    let existingOrder = null;
    let checkError = null;
    
    // Primeira tentativa: buscar diretamente pelo orderId (UUID ou string)
    const { data: orderData, error: orderError } = await supabaseServer
      .from("order")
      .select("id, status")
      .eq("id", orderId)
      .single();
    
    if (!orderError && orderData) {
      existingOrder = orderData;
      console.log(`✅ Order encontrada por UUID/string:`, existingOrder);
    } else {
      // Segunda tentativa: se orderId for numérico, tentar como número
      const numericOrderId = parseInt(orderId, 10);
      if (!isNaN(numericOrderId)) {
        console.log(`🔢 Tentando buscar por número: ${numericOrderId}`);
        const { data: numericOrderData, error: numericOrderError } = await supabaseServer
          .from("order")
          .select("id, status")
          .eq("id", numericOrderId)
          .single();
        
        if (!numericOrderError && numericOrderData) {
          existingOrder = numericOrderData;
          console.log(`✅ Order encontrada por número:`, existingOrder);
        } else {
          checkError = numericOrderError;
        }
      } else {
        checkError = orderError;
      }
    }

    if (checkError) {
      console.error("❌ Erro ao verificar order:", checkError);
      return sendResponse(200, { success: false, message: "Erro ao verificar order" });
    }

    if (!existingOrder) {
      console.error(`❌ Order ${orderId} não encontrada no banco`);
      return sendResponse(200, { success: false, message: `Order ${orderId} não encontrada` });
    }

    console.log(`✅ Order encontrada:`, {
      id: existingOrder.id,
      status_atual: existingOrder.status
    });

    // 🧮 Atualizar status no Supabase
    console.log(`🔄 Atualizando order ${orderId} para status: ${internalStatus}`);
    
    // Usar o ID correto (UUID ou número) para atualizar
    const updateId = existingOrder.id;
    const { data: updatedOrder, error: updateError } = await supabaseServer
      .from("order")
      .update({ status: internalStatus })
      .eq("id", updateId)
      .select("id, status")
      .single();

    if (updateError) {
      console.error("❌ Erro ao atualizar status no Supabase:", updateError);
      return sendResponse(200, { success: false, message: "Erro ao atualizar order" });
    }

    console.log("✅ Status da order atualizado com sucesso:", {
      id: updatedOrder.id,
      status_novo: updatedOrder.status
    });
    return sendResponse(200, { success: true, message: "Order atualizada com sucesso" });
  } catch (error: any) {
    console.error("❌ Erro inesperado no webhook:", error);
    return sendResponse(200, { success: false, message: "Erro interno" });
  }
}
