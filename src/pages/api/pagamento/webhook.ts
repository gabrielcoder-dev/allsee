import type { NextApiRequest, NextApiResponse } from "next"
import { Payment, MercadoPagoConfig } from "mercadopago"
import { supabaseServer } from "@/lib/supabaseServer"

// Interface para o payload do webhook do Mercado Pago
interface MercadoPagoWebhookPayload {
  id: number
  live_mode: boolean
  type: string
  date_created: string
  user_id: string
  api_version: string
  action: string
  data: {
    id: string
  }
}

// Interface para resposta padronizada
interface WebhookResponse {
  success: boolean
  message: string
  orderId?: string | number
  status?: string
  error?: string
  timestamp: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<WebhookResponse>) {
  const timestamp = new Date().toISOString()
  
  // Função para enviar resposta padronizada
  const sendResponse = (status: number, data: WebhookResponse) => {
    console.log(`📤 Resposta enviada [${status}]:`, data)
    res.status(status).json(data)
  }

  // Verificar método HTTP
  if (req.method !== "POST") {
    return sendResponse(405, {
      success: false,
      message: "Método não permitido",
      timestamp
    })
  }

  try {
    console.log("🔔 Webhook recebido:", {
      timestamp,
      headers: req.headers,
      body: req.body,
      query: req.query
    })

    // Validar configurações necessárias
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error("❌ MERCADO_PAGO_ACCESS_TOKEN não configurado")
      return sendResponse(200, {
        success: false,
        message: "Token do Mercado Pago não configurado",
        timestamp
      })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ SUPABASE_SERVICE_ROLE_KEY não configurado")
      return sendResponse(200, {
        success: false,
        message: "Chave do Supabase não configurada",
        timestamp
      })
    }

    // Parse do payload
    let payload: MercadoPagoWebhookPayload
    try {
      payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    } catch (error) {
      console.error("❌ Erro ao fazer parse do payload:", error)
      return sendResponse(200, {
        success: false,
        message: "Payload inválido",
        error: "JSON malformado",
        timestamp
      })
    }

    // Validar estrutura do payload
    if (!payload || !payload.data || !payload.data.id) {
      console.warn("⚠️ Payload inválido - campos obrigatórios ausentes")
      return sendResponse(200, {
        success: false,
        message: "Payload inválido - campos obrigatórios ausentes",
        timestamp
      })
    }

    // Verificar se é um evento de pagamento
    if (payload.type !== "payment") {
      console.log(`ℹ️ Evento ignorado - tipo: ${payload.type}`)
      return sendResponse(200, {
        success: true,
        message: `Evento ${payload.type} ignorado`,
        timestamp
      })
    }

    const paymentId = payload.data.id
    console.log(`💳 Processando pagamento ID: ${paymentId}`)

    // Inicializar cliente do Mercado Pago
    const mpClient = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
    })
    const paymentClient = new Payment(mpClient)

    // Buscar detalhes do pagamento
    let payment
    try {
      payment = await paymentClient.get({ id: paymentId })
      console.log(`✅ Pagamento encontrado:`, {
        id: payment.id,
        status: payment.status,
        external_reference: payment.external_reference
      })
    } catch (error: any) {
      console.error(`❌ Erro ao buscar pagamento ${paymentId}:`, error.message)
      return sendResponse(200, {
        success: false,
        message: "Erro ao buscar pagamento no Mercado Pago",
        error: error.message,
        timestamp
      })
    }

    // Validar external_reference (orderId)
    const externalReference = payment.external_reference
    if (!externalReference) {
      console.error(`❌ Pagamento ${paymentId} sem external_reference`)
      return sendResponse(200, {
        success: false,
        message: "Pagamento sem referência externa",
        timestamp
      })
    }

    console.log(`🔍 External reference encontrado: ${externalReference}`)

    // Converter external_reference para número (caso seja string)
    let orderId: number
    try {
      orderId = parseInt(externalReference.toString(), 10)
      if (isNaN(orderId)) {
        throw new Error("Não é um número válido")
      }
    } catch (error) {
      console.error(`❌ External reference inválido: ${externalReference}`)
      return sendResponse(200, {
        success: false,
        message: "External reference inválido",
        error: `Não é um número válido: ${externalReference}`,
        timestamp
      })
    }

    console.log(`🔢 Order ID convertido: ${orderId}`)

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
    console.log(`📊 Status mapeado: ${paymentStatus} → ${internalStatus}`)

    // Verificar se a order existe
    console.log(`🔍 Verificando se order ${orderId} existe...`)
    const { data: existingOrder, error: checkError } = await supabaseServer
      .from("order")
      .select("id, status, payment_id")
      .eq("id", orderId)
      .single()

    if (checkError) {
      console.error(`❌ Erro ao verificar order ${orderId}:`, checkError)
      return sendResponse(200, {
        success: false,
        message: "Erro ao verificar order no banco",
        error: checkError.message,
        timestamp
      })
    }

    if (!existingOrder) {
      console.error(`❌ Order ${orderId} não encontrada`)
      return sendResponse(200, {
        success: false,
        message: "Order não encontrada",
        error: `Order ${orderId} não existe`,
        timestamp
      })
    }

    console.log(`✅ Order encontrada:`, {
      id: existingOrder.id,
      status_atual: existingOrder.status,
      payment_id: existingOrder.payment_id
    })

    // Atualizar status da order
    console.log(`🔄 Atualizando order ${orderId} para status: ${internalStatus}`)
    const { data: updatedOrder, error: updateError } = await supabaseServer
      .from("order")
      .update({
        status: internalStatus,
        payment_id: paymentId,
        updated_at: timestamp
      })
      .eq("id", orderId)
      .select("id, status, payment_id, updated_at")
      .single()

    if (updateError) {
      console.error(`❌ Erro ao atualizar order ${orderId}:`, updateError)
      return sendResponse(200, {
        success: false,
        message: "Erro ao atualizar order",
        error: updateError.message,
        timestamp
      })
    }

    console.log(`✅ Order atualizada com sucesso:`, updatedOrder)

    // Resposta de sucesso
    return sendResponse(200, {
      success: true,
      message: "Order atualizada com sucesso",
      orderId: orderId,
      status: internalStatus,
      timestamp
    })

  } catch (error: any) {
    console.error("❌ Erro geral no webhook:", {
      message: error.message,
      stack: error.stack,
      timestamp
    })
    
    return sendResponse(200, {
      success: false,
      message: "Erro interno do servidor",
      error: error.message,
      timestamp
    })
  }
}