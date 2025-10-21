import type { NextApiRequest, NextApiResponse } from "next"
import { Payment, MercadoPagoConfig } from "mercadopago"
import { supabaseServer } from "@/lib/supabaseServer"

interface WebhookResponse {
  success: boolean
  message: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<WebhookResponse>) {
  // Sempre retornar 200 para o Mercado Pago para evitar reenvios
  const sendResponse = (status: number, data: WebhookResponse) => {
    res.status(status).json(data)
  }

  if (req.method !== "POST") {
    return sendResponse(405, { success: false, message: "Método não permitido" })
  }

  try {
    // Parse do payload
    let payload: any
    try {
      payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    } catch (error) {
      return sendResponse(200, { success: false, message: "Payload inválido" })
    }

    // Verificar se é um evento de pagamento
    if (payload.type !== "payment" || !payload.data?.id) {
      return sendResponse(200, { success: true, message: "Evento ignorado" })
    }

    const paymentId = payload.data.id

    // Validar configurações necessárias
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return sendResponse(200, { success: false, message: "Configuração incompleta" })
    }

    // Inicializar cliente do Mercado Pago
    const mpClient = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
    })
    const paymentClient = new Payment(mpClient)

    // Buscar detalhes do pagamento
    let payment
    try {
      payment = await paymentClient.get({ id: paymentId })
    } catch (error: any) {
      return sendResponse(200, { success: false, message: "Erro ao buscar pagamento" })
    }

    // Verificar external_reference (orderId)
    const externalReference = payment.external_reference
    if (!externalReference) {
      return sendResponse(200, { success: false, message: "Sem referência externa" })
    }

    // Converter external_reference para número
    let orderId: number
    try {
      orderId = parseInt(externalReference.toString(), 10)
      if (isNaN(orderId)) {
        return sendResponse(200, { success: false, message: "Referência externa inválida" })
      }
    } catch (error) {
      return sendResponse(200, { success: false, message: "Erro na conversão da referência" })
    }

    // Mapear status do Mercado Pago para status interno
    const statusMapping: Record<string, string> = {
      "approved": "pago",
      "pending": "pendente", 
      "rejected": "cancelado",
      "cancelled": "cancelado",
      "refunded": "reembolsado"
    }

    const paymentStatus = payment.status || "unknown"
    const internalStatus = statusMapping[paymentStatus] || "pendente"

    // Atualizar status da order diretamente
    const { error: updateError } = await supabaseServer
      .from("order")
      .update({
        status: internalStatus
      })
      .eq("id", orderId)

    if (updateError) {
      return sendResponse(200, { success: false, message: "Erro ao atualizar order" })
    }

    return sendResponse(200, { success: true, message: "Order atualizada com sucesso" })

  } catch (error: any) {
    return sendResponse(200, { success: false, message: "Erro interno" })
  }
}