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
  console.log("🚀 Webhook iniciado - Método:", req.method)

  if (req.method !== "POST") {
    console.log("❌ Método não permitido:", req.method)
    return res.status(405).json({ error: "Método não permitido" })
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
      console.error("❌ Payload inválido:", parsedBody)
      return res.status(200).json({
        received: true,
        message: "Webhook recebido mas payload inválido",
      })
    }

    console.log("💳 Processando pagamento ID:", paymentId)

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error("❌ MERCADO_PAGO_ACCESS_TOKEN não configurado")
      return res.status(500).json({ received: true, error: "Token não configurado" }) // Changed to 500
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
      console.error("❌ Erro ao buscar pagamento:", err)
      return res.status(500).json({ // Changed to 500
        received: true,
        message: "Erro ao buscar pagamento",
        error: err.message || "Erro desconhecido",
      })
    }

    // Garantir que external_reference é uma string
    const externalReference = payment.external_reference?.toString().trim()
    const status = payment.status

    if (!externalReference) {
      console.log("⚠️ Pagamento sem referência externa")
      return res.status(200).json({
        received: true,
        message: "Pagamento sem referência externa",
      })
    }

    console.log("🔍 External Reference extraída:", {
      externalReference,
      tipo: typeof externalReference,
      comprimento: externalReference.length,
    })

    // Mapeamento simples de status
    let internalStatus = "pendente"
    if (status === "approved") {
      internalStatus = "pago"
    }

    console.log("🔄 Atualizando status no banco:", {
      orderId: externalReference,
      orderIdType: typeof externalReference,
      statusInterno: internalStatus,
      statusOriginal: status,
    })

    // Primeiro, verificar se a order existe
    const { data: existingOrder, error: findError } = await supabaseServer
      .from("order")
      .select("id, status, user_id")
      .eq("id", externalReference)
      .single()

    if (findError) {
      console.error("❌ Erro ao buscar order:", findError)
      console.error("❌ External Reference usado:", externalReference)
      return res.status(500).json({
        received: true,
        message: "Order não encontrada",
        error: findError.message,
        externalReference,
      })
    }

    if (!existingOrder) {
      console.error("❌ Order não existe:", externalReference)
      return res.status(404).json({
        received: true,
        message: "Order não encontrada no banco",
        externalReference,
      })
    }

    console.log("📋 Order encontrada:", {
      id: existingOrder.id,
      statusAtual: existingOrder.status,
      novoStatus: internalStatus,
    })

    // Atualizar a order
    const { data: updatedOrder, error: updateError } = await supabaseServer
      .from("order")
      .update({
        status: internalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", externalReference)
      .select("id, status, updated_at")
      .single()

    if (updateError) {
      console.error("❌ Erro ao atualizar order:", updateError)
      return res.status(500).json({ // Changed to 500
        received: true,
        message: "Erro ao atualizar order",
        error: updateError.message,
      })
    }

    console.log("✅ Order atualizada com sucesso:", {
      orderId: updatedOrder.id,
      statusAnterior: existingOrder.status,
      statusNovo: updatedOrder.status,
      updatedAt: updatedOrder.updated_at,
    })

    return res.status(200).json({
      received: true,
      message: "Status atualizado com sucesso",
      orderId: externalReference,
      status: internalStatus,
      originalStatus: status,
    })
  } catch (error: any) {
    console.error("❌ Erro no webhook:", error)
    return res.status(500).json({ // Changed to 500
      received: true,
      message: "Erro interno ao processar webhook",
      error: error.message || "Erro desconhecido",
    })
  }
}