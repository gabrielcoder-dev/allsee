import type { NextApiRequest, NextApiResponse } from "next"
import { supabaseServer } from "@/lib/supabaseServer"

interface TestResponse {
  success: boolean
  message: string
  data?: any
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<TestResponse>) {
  if (req.method !== "POST") {
    return res.status(405).json({ 
      success: false, 
      message: "Método não permitido" 
    })
  }

  try {
    const { orderId, status } = req.body

    if (!orderId || !status) {
      return res.status(400).json({
        success: false,
        message: "orderId e status são obrigatórios",
        error: "Parâmetros ausentes"
      })
    }

    console.log(`🧪 Teste manual - Atualizando order ${orderId} para status: ${status}`)

    // Verificar se a order existe
    const { data: existingOrder, error: checkError } = await supabaseServer
      .from("order")
      .select("id, status, payment_id")
      .eq("id", orderId)
      .single()

    if (checkError) {
      console.error(`❌ Erro ao verificar order ${orderId}:`, checkError)
      return res.status(500).json({
        success: false,
        message: "Erro ao verificar order",
        error: checkError.message
      })
    }

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Order não encontrada",
        error: `Order ${orderId} não existe`
      })
    }

    console.log(`✅ Order encontrada:`, existingOrder)

    // Atualizar status
    const { data: updatedOrder, error: updateError } = await supabaseServer
      .from("order")
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId)
      .select("id, status, updated_at")
      .single()

    if (updateError) {
      console.error(`❌ Erro ao atualizar order ${orderId}:`, updateError)
      return res.status(500).json({
        success: false,
        message: "Erro ao atualizar order",
        error: updateError.message
      })
    }

    console.log(`✅ Order atualizada com sucesso:`, updatedOrder)

    return res.status(200).json({
      success: true,
      message: "Order atualizada com sucesso",
      data: updatedOrder
    })

  } catch (error: any) {
    console.error("❌ Erro no teste:", error)
    return res.status(500).json({
      success: false,
      message: "Erro interno",
      error: error.message
    })
  }
}
