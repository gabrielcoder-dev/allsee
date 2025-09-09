import type { NextApiRequest, NextApiResponse } from "next"
import { Payment, MercadoPagoConfig } from "mercadopago"
import { supabaseServer } from "@/lib/supabaseServer" // usa a service role key

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("🚀 Webhook iniciado - Método:", req.method)

  if (req.method !== "POST") {
    console.log("❌ Método não permitido:", req.method)
    return res.status(405).json({ error: "Método não permitido" })
  }

  try {
    // Garantir que o body seja JSON
    const rawBody = typeof req.body === "string" ? req.body : undefined
    let parsedBody: any = req.body
    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody)
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
      return res.status(200).json({ received: true, error: "Token não configurado" })
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
      return res.status(200).json({
        received: true,
        message: "Erro ao buscar pagamento",
        error: err.message || "Erro desconhecido",
      })
    }

    const externalReference = payment.external_reference
    const status = payment.status

    if (!externalReference) {
      console.log("⚠️ Pagamento sem referência externa")
      return res.status(200).json({
        received: true,
        message: "Pagamento sem referência externa",
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

    const { error: updateError } = await supabaseServer
      .from("order")
      .update({
        status: internalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", externalReference)

    if (updateError) {
      console.error("❌ Erro ao atualizar order:", updateError)
      return res.status(200).json({
        received: true,
        message: "Erro ao atualizar order",
        error: updateError.message,
      })
    }

    console.log("✅ Order atualizada com sucesso:", externalReference)

    return res.status(200).json({
      received: true,
      message: "Status atualizado com sucesso",
      orderId: externalReference,
      status: internalStatus,
      originalStatus: status,
    })
  } catch (error: any) {
    console.error("❌ Erro no webhook:", error)
    return res.status(200).json({
      received: true,
      message: "Erro interno ao processar webhook",
      error: error.message || "Erro desconhecido",
    })
  }
}
