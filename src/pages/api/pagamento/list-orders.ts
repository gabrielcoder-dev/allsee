import type { NextApiRequest, NextApiResponse } from "next"
import { supabaseServer } from "@/lib/supabaseServer"

interface Order {
  id: number
  status: string
  payment_id?: string
  nome_campanha?: string
  preco?: number
  created_at: string
  updated_at?: string
}

interface ListOrdersResponse {
  success: boolean
  message: string
  orders?: Order[]
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ListOrdersResponse>) {
  if (req.method !== "GET") {
    return res.status(405).json({ 
      success: false, 
      message: "Método não permitido" 
    })
  }

  try {
    const { limit = 10, status } = req.query

    console.log(`📋 Listando orders - limit: ${limit}, status: ${status}`)

    let query = supabaseServer
      .from("order")
      .select("id, status, payment_id, nome_campanha, preco, created_at, updated_at")
      .order("created_at", { ascending: false })

    // Filtrar por status se especificado
    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    // Limitar resultados
    if (limit) {
      query = query.limit(parseInt(limit as string, 10))
    }

    const { data: orders, error } = await query

    if (error) {
      console.error("❌ Erro ao buscar orders:", error)
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar orders",
        error: error.message
      })
    }

    console.log(`✅ ${orders?.length || 0} orders encontradas`)

    return res.status(200).json({
      success: true,
      message: `${orders?.length || 0} orders encontradas`,
      orders: orders || []
    })

  } catch (error: any) {
    console.error("❌ Erro ao listar orders:", error)
    return res.status(500).json({
      success: false,
      message: "Erro interno",
      error: error.message
    })
  }
}
