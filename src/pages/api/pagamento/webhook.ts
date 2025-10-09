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

    console.log("🔍 Análise do external_reference:", {
      original: payment.external_reference,
      originalType: typeof payment.external_reference,
      converted: externalReference,
      convertedType: typeof externalReference,
      length: externalReference?.length
    })

    if (!externalReference || externalReference === 'null' || externalReference === 'undefined' || externalReference === '') {
      console.error("❌ Referência externa inválida:", {
        externalReference,
        paymentId: payment.id,
        paymentStatus: payment.status
      })
      return sendResponse(200, {
        received: true,
        message: "Pagamento sem referência externa válida",
        externalReference: externalReference,
        paymentId: payment.id
      })
    }

    console.log("✅ External reference (orderId) validado:", {
      orderId: externalReference,
      type: typeof externalReference,
      isNumeric: !isNaN(Number(externalReference))
    })

    // Mapeamento de status mais abrangente
    let internalStatus = "pendente"
    if (status === "approved") {
      internalStatus = "pago"
      console.log("🎉 PAGAMENTO APROVADO! Atualizando para 'pago'", {
        paymentId: payment.id,
        orderId: externalReference,
        amount: payment.transaction_amount
      })
    } else if (status === "pending") {
      internalStatus = "pendente"
    } else if (status === "rejected" || status === "cancelled") {
      internalStatus = "cancelado"
    }

    console.log("📋 Mapeamento de status:", {
      statusOriginal: status,
      statusInterno: internalStatus,
      paymentId: payment.id,
      willUpdateToPaid: status === "approved"
    })

    console.log("🔄 Atualizando status no banco:", {
      orderId: externalReference,
      orderIdType: typeof externalReference,
      statusInterno: internalStatus,
      statusOriginal: status,
    })

    // Tentar buscar a order tanto como string quanto como número
    let existingOrder, checkError
    
    // Primeiro tenta como string (orderId pode ser string)
    const { data: orderAsString, error: errorAsString } = await supabaseServer
      .from("order")
      .select("id, status, created_at")
      .eq("id", externalReference)
      .single()
    
    // Se não encontrou, tenta como número (caso o orderId seja numérico)
    if (errorAsString || !orderAsString) {
      const numericId = parseInt(externalReference)
      if (!isNaN(numericId)) {
        console.log("🔄 Tentando buscar como número:", numericId)
        const { data: orderAsNumber, error: errorAsNumber } = await supabaseServer
          .from("order")
          .select("id, status, created_at")
          .eq("id", numericId)
          .single()
        
        existingOrder = orderAsNumber
        checkError = errorAsNumber
        console.log("📊 Resultado da busca numérica:", { found: !!orderAsNumber, error: errorAsNumber?.message })
      } else {
        existingOrder = orderAsString
        checkError = errorAsString
        console.log("📊 Não é um número válido, usando resultado da busca como string")
      }
    } else {
      existingOrder = orderAsString
      checkError = errorAsString
      console.log("📊 Encontrado como string na primeira tentativa")
    }

    console.log("🔍 Verificação da order existente:", {
      found: !!existingOrder,
      error: checkError?.message,
      orderData: existingOrder
    })

    if (checkError || !existingOrder) {
      console.error("❌ Order não encontrada:", {
        orderId: externalReference,
        error: checkError?.message
      })
      return sendResponse(200, {
        received: true,
        message: "Order não encontrada no banco",
        orderId: externalReference,
        error: checkError?.message
      })
    }

    // Usar o ID correto que foi encontrado (pode ser string ou número)
    const orderIdToUpdate = existingOrder.id
    
    console.log("🔄 Atualizando com ID:", {
      orderIdFromWebhook: externalReference,
      foundOrderId: orderIdToUpdate,
      idType: typeof orderIdToUpdate
    })

    // Atualizar diretamente
    const { error: updateError, data: updateData } = await supabaseServer
      .from("order")
      .update({
        status: internalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderIdToUpdate)
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
      console.error("❌ Nenhuma linha foi atualizada:", {
        externalReference,
        orderIdToUpdate,
        updateData
      })
      
      return sendResponse(200, {
        received: true,
        message: "Nenhuma linha foi atualizada no banco",
        orderId: externalReference,
        attemptedUpdate: orderIdToUpdate
      })
    }

    // Verificar se a atualização realmente mudou o status
    const updatedOrder = updateData[0]
    if (updatedOrder.status !== internalStatus) {
      console.error("❌ Status não foi atualizado corretamente:", {
        expected: internalStatus,
        actual: updatedOrder.status,
        orderId: orderIdToUpdate
      })
      
      return sendResponse(200, {
        received: true,
        message: "Status não foi atualizado corretamente",
        expected: internalStatus,
        actual: updatedOrder.status,
        orderId: orderIdToUpdate
      })
    }

    console.log("✅ Order atualizada com sucesso:", {
      orderIdFromWebhook: externalReference,
      actualOrderId: orderIdToUpdate,
      statusAnterior: existingOrder.status,
      statusNovo: internalStatus,
      updatedRecord: updateData[0]
    })

    return sendResponse(200, {
      received: true,
      message: "Status atualizado com sucesso",
      orderId: orderIdToUpdate,
      orderIdFromWebhook: externalReference,
      status: internalStatus,
      originalStatus: status,
      paymentId: payment.id
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