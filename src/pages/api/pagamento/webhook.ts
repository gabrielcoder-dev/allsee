// src/pages/api/pagamento/webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Payment, MercadoPagoConfig } from "mercadopago";
import { supabaseServer } from "@/lib/supabaseServer";

interface WebhookResponse {
  success: boolean;
  message: string;
  details?: string;
  orderId?: string;
  updateId?: any;
  newStatus?: string;
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
    
    let existingOrder = null;
    let checkError = null;
    
    // Primeira tentativa: buscar por número (formato mais comum)
    const numericOrderId = parseInt(orderId, 10);
    if (!isNaN(numericOrderId)) {
      console.log(`🔢 Buscando por número: ${numericOrderId}`);
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
      // Segunda tentativa: buscar por string (caso seja UUID)
      console.log(`🔤 Buscando por string: ${orderId}`);
      const { data: orderData, error: orderError } = await supabaseServer
        .from("order")
        .select("id, status")
        .eq("id", orderId)
        .single();
      
      if (!orderError && orderData) {
        existingOrder = orderData;
        console.log(`✅ Order encontrada por string:`, existingOrder);
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
    console.log(`🔍 ID da order encontrada: ${existingOrder.id} (tipo: ${typeof existingOrder.id})`);
    
    // Usar o ID correto (UUID ou número) para atualizar
    const updateId = existingOrder.id;
    console.log(`🔄 Executando update com ID: ${updateId}`);
    
    const { data: updatedOrder, error: updateError } = await supabaseServer
      .from("order")
      .update({ 
        status: internalStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", updateId)
      .select("id, status, updated_at")
      .single();

    if (updateError) {
      console.error("❌ Erro ao atualizar status no Supabase:", {
        error: updateError,
        updateId: updateId,
        internalStatus: internalStatus,
        orderId: orderId
      });
      return sendResponse(200, { 
        success: false, 
        message: "Erro ao atualizar order",
        details: updateError.message 
      });
    }

    console.log("✅ Status da order atualizado com sucesso:", {
      id: updatedOrder.id,
      status_novo: updatedOrder.status,
      updated_at: updatedOrder.updated_at
    });

    // 🔍 Verificar se a atualização persistiu
    const { data: verifyOrder, error: verifyError } = await supabaseServer
      .from("order")
      .select("id, status, updated_at")
      .eq("id", updateId)
      .single();

    if (verifyError) {
      console.warn("⚠️ Erro ao verificar atualização:", verifyError);
    } else {
      console.log("✅ Verificação final:", verifyOrder);
    }

    return sendResponse(200, { 
      success: true, 
      message: "Order atualizada com sucesso",
      orderId: orderId,
      updateId: updateId,
      newStatus: internalStatus
    });
  } catch (error: any) {
    console.error("❌ Erro inesperado no webhook:", error);
    return sendResponse(200, { success: false, message: "Erro interno" });
  }
}
