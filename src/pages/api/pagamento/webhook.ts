import type { NextApiRequest, NextApiResponse } from "next"
import { Payment, MercadoPagoConfig } from "mercadopago"
import { supabaseServer } from "@/lib/supabaseServer" // usa a service role key

// Define a type for the expected body, replace with your actual body structure
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
      return sendResponse(200, {
        received: true,
        message: "Erro ao buscar pagamento",
        error: err.message || "Erro desconhecido",
      })
    }

    const externalReference = payment.external_reference?.toString().trim()
    const status = payment.status

    if (!externalReference || externalReference === 'null' || externalReference === 'undefined') {
      return sendResponse(200, {
        received: true,
        message: "Pagamento sem referência externa válida",
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

    // Primeiro verificar se a order existe
    console.log("📊 Verificando se order existe...")
    const { data: existingOrder, error: findError } = await supabaseServer
      .from("order")
      .select("id, status")
      .eq("id", externalReference)
      .single()

    if (findError) {
      return sendResponse(200, {
        received: true,
        message: "Order não encontrada",
        error: findError.message,
      })
    }

    if (!existingOrder) {
      return sendResponse(200, {
        received: true,
        message: "Order não encontrada no banco",
        externalReference,
      })
    }

    console.log("📊 Order encontrada, atualizando status...")
    const { error: updateError } = await supabaseServer
      .from("order")
      .update({
        status: internalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", externalReference)

    if (updateError) {
      return sendResponse(200, {
        received: true,
        message: "Erro ao atualizar order",
        error: updateError.message,
      })
    }

    console.log("✅ Order atualizada com sucesso:", externalReference)

    return sendResponse(200, {
      received: true,
      message: "Status atualizado com sucesso",
      orderId: externalReference,
      status: internalStatus,
      originalStatus: status,
    })
  } catch (error: any) {
    return sendResponse(200, {
      received: true,
      message: "Erro interno ao processar webhook",
      error: error.message || "Erro desconhecido",
      timestamp: new Date().toISOString()
    })
  }
}