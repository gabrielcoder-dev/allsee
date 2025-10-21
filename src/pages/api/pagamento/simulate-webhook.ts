import type { NextApiRequest, NextApiResponse } from "next"

interface SimulateWebhookResponse {
  success: boolean
  message: string
  webhookUrl?: string
  payload?: any
  webhookResponse?: {
    status: number
    data: any
  }
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SimulateWebhookResponse>) {
  if (req.method !== "POST") {
    return res.status(405).json({ 
      success: false, 
      message: "Método não permitido" 
    })
  }

  try {
    const { orderId, paymentId, status = "approved" } = req.body

    if (!orderId || !paymentId) {
      return res.status(400).json({
        success: false,
        message: "orderId e paymentId são obrigatórios",
        error: "Parâmetros ausentes"
      })
    }

    // Simular payload do webhook do Mercado Pago
    const webhookPayload = {
      id: 125635928657,
      live_mode: true,
      type: "payment",
      date_created: new Date().toISOString(),
      user_id: "2523436790",
      api_version: "v1",
      action: "payment.created",
      data: {
        id: paymentId.toString()
      }
    }

    const webhookUrl = `${req.headers.origin}/api/pagamento/webhook`

    console.log(`🎭 Simulando webhook para order ${orderId}:`, {
      webhookUrl,
      payload: webhookPayload
    })

    // Enviar webhook simulado
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "MercadoPago-Webhook/1.0"
        },
        body: JSON.stringify(webhookPayload)
      })

      const responseData = await response.json()

      console.log(`📤 Resposta do webhook:`, {
        status: response.status,
        data: responseData
      })

      return res.status(200).json({
        success: true,
        message: "Webhook simulado enviado com sucesso",
        webhookUrl,
        payload: webhookPayload,
        webhookResponse: {
          status: response.status,
          data: responseData
        }
      })

    } catch (webhookError: any) {
      console.error("❌ Erro ao enviar webhook simulado:", webhookError)
      return res.status(500).json({
        success: false,
        message: "Erro ao enviar webhook simulado",
        error: webhookError.message,
        webhookUrl,
        payload: webhookPayload
      })
    }

  } catch (error: any) {
    console.error("❌ Erro na simulação:", error)
    return res.status(500).json({
      success: false,
      message: "Erro interno",
      error: error.message
    })
  }
}
