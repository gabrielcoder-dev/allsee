import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { orderId } = req.query;

    if (!orderId || typeof orderId !== "string") {
      return res.status(400).json({ error: "orderId é obrigatório" });
    }

    console.log("🔍 Buscando order:", orderId);

    const { data: order, error } = await supabaseServer
      .from("order")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error) {
      console.error("❌ Erro ao buscar order:", error);
      return res.status(404).json({
        error: "Order não encontrada",
        details: error.message,
        orderId,
      });
    }

    console.log("✅ Order encontrada:", {
      id: order.id,
      status: order.status,
      created_at: order.created_at,
      updated_at: order.updated_at,
    });

    return res.status(200).json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        created_at: order.created_at,
        updated_at: order.updated_at,
        empresa: order.empresa,
        valor: order.valor,
        user_id: order.user_id,
      },
    });
  } catch (error: any) {
    console.error("❌ Erro inesperado:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
}

