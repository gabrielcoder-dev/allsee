import type { NextApiRequest, NextApiResponse } from "next"
import { Payment, MercadoPagoConfig } from "mercadopago"
import { supabaseServer } from "@/lib/supabaseServer"

interface WebhookBody {
  type?: string;
  data?: {
    id?: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sempre retornar 200 para o Mercado Pago para evitar reenvios
  const sendResponse = (status: number, data: any) => {
    res.status(status).json(data)
  }

  if (req.method !== "POST") {
    return sendResponse(405, { error: "Método não permitido" })
  }

  try {
    // Garantir que o body seja JSON
    const rawBody = typeof req.body === "string" ? req.body : undefined
    let parsedBody: WebhookBody | any = req.body // try to parse to the interface, if it fails, keep as any
    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody) as WebhookBody
      } catch (e) {
        console.warn("⚠️ Body não estava em JSON válido, mantendo como texto.")
      }
    }

    console.log("📨 Webhook recebido:", {
      body: parsedBody,
      query: req.query,
      headers: req.headers,
    })

    const paymentId = parsedBody?.data?.id || (req.query?.id as string)
    const topic =
      parsedBody?.type ||
      (req.query?.type as string) ||
      (req.query?.topic as string)

    if (topic !== "payment" || !paymentId) {
      console.log("⚠️ Webhook ignorado - topic:", topic, "paymentId:", paymentId)
      return sendResponse(200, {
        received: true,
        message: "Webhook recebido mas payload inválido",
      })
    }

    // Aceitar tanto payment.created quanto payment.updated
    console.log("✅ Webhook de pagamento aceito:", { topic, paymentId })

    console.log("💳 Processando pagamento ID:", paymentId)

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return sendResponse(200, { received: true, error: "Token não configurado" })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return sendResponse(200, { received: true, error: "Supabase não configurado" })
    }

    // Inicializa client Mercado Pago
    const mpClient = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
    })
    const paymentClient = new Payment(mpClient)

    let payment
    try {
      payment = await paymentClient.get({ id: paymentId })
    } catch (err: any) {
      console.error("❌ Erro ao buscar pagamento:", err.message)
      return sendResponse(200, {
        received: true,
        message: "Erro ao buscar pagamento",
        error: err.message || "Erro desconhecido",
      })
    }

    const externalReference = payment.external_reference
    const status = payment.status

    // Mapeamento de status mais abrangente
    let internalStatus = "pendente"
    if (status === "approved") {
      internalStatus = "pago"
    } else if (status === "pending") {
      internalStatus = "pendente"
    } else if (status === "rejected" || status === "cancelled") {
      internalStatus = "cancelado"
    }

    if (!externalReference || externalReference === null || externalReference === undefined) {
      // Se não tem external_reference, tenta buscar por outros campos
      const { data: orderByPaymentId, error: errorByPaymentId } = await supabaseServer
        .from("order")
        .select("id, status")
        .eq("payment_id", payment.id)
        .single()
      
      if (orderByPaymentId) {
        // Atualiza usando o ID encontrado
        const { error: updateError } = await supabaseServer
          .from("order")
          .update({
            status: internalStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderByPaymentId.id)
        
        return sendResponse(200, {
          received: true,
          message: "Status atualizado via payment_id",
          orderId: orderByPaymentId.id,
          status: internalStatus
        })
      }
      
      return sendResponse(200, {
        received: true,
        message: "Pagamento sem referência válida e sem payment_id correspondente"
      })
    }


    // Buscar a order e atualizar diretamente
    const { error: updateError, data: updateData } = await supabaseServer
      .from("order")
      .update({
        status: internalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", externalReference)
      .select()

    if (updateError) {
      return sendResponse(200, {
        received: true,
        message: "Erro ao atualizar order",
        error: updateError.message
      })
    }

    if (!updateData || updateData.length === 0) {
      return sendResponse(200, {
        received: true,
        message: "Order não encontrada para atualizar"
      })
    }

    return sendResponse(200, {
      received: true,
      message: "Status atualizado com sucesso",
      orderId: externalReference,
      status: internalStatus
    })
  } catch (error: any) {
    console.error("❌ Erro geral no webhook:", {
      message: error.message,
      stack: error.stack
    })
    
    return sendResponse(200, {
      received: true,
      message: "Erro interno ao processar webhook",
      error: error.message || "Erro desconhecido",
      timestamp: new Date().toISOString()
    })
  }
}