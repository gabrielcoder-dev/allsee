import type { NextApiRequest, NextApiResponse } from "next"
import { Payment, MercadoPagoConfig } from "mercadopago"
import { supabaseServer } from "@/lib/supabaseServer" // usa a service role key

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
      console.log("📊 Dados do pagamento:", {
        id: payment.id,
        status: payment.status,
        external_reference: payment.external_reference,
        amount: payment.transaction_amount,
        payment_method: payment.payment_method?.type,
      })
    } catch (err: any) {
      console.error("❌ Erro ao buscar pagamento:", err.message)
      return sendResponse(200, {
        received: true,
        message: "Erro ao buscar pagamento",
        error: err.message || "Erro desconhecido",
      })
    }

    const externalReference = payment.external_reference?.toString().trim()
    const status = payment.status

    if (!externalReference || externalReference === 'null' || externalReference === 'undefined') {
      console.error("❌ Referência externa inválida:", externalReference)
      return sendResponse(200, {
        received: true,
        message: "Pagamento sem referência externa válida",
        externalReference: externalReference
      })
    }

    // Mapeamento simples de status
    let internalStatus = "pendente"
    if (status === "approved") {
      internalStatus = "pago"
    }

    console.log("🔄 Atualizando status no banco:", {
      orderId: externalReference,
      statusInterno: internalStatus,
      statusOriginal: status,
    })

    // Atualizar diretamente - usar upsert para garantir que funcione
    const { error: updateError, data: updateData } = await supabaseServer
      .from("order")
      .update({
        status: internalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", externalReference)
      .select()

    if (updateError) {
      console.error("❌ Erro ao atualizar order:", {
        orderId: externalReference,
        error: updateError.message,
        code: updateError.code
      })
      
      return sendResponse(200, {
        received: true,
        message: "Erro ao atualizar order",
        error: updateError.message,
        orderId: externalReference
      })
    }

    if (!updateData || updateData.length === 0) {
      console.error("❌ Order não encontrada para atualizar:", externalReference)
      
      return sendResponse(200, {
        received: true,
        message: "Order não encontrada no banco",
        orderId: externalReference,
      })
    }

    console.log("✅ Order atualizada com sucesso:", {
      orderId: externalReference,
      statusAnterior: updateData[0]?.status,
      statusNovo: internalStatus
    })

    return sendResponse(200, {
      received: true,
      message: "Status atualizado com sucesso",
      orderId: externalReference,
      status: internalStatus,
      originalStatus: status,
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