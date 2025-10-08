import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/lib/supabaseServer";

// ENDPOINT DE DEBUG - Usar apenas para testes
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ error: "orderId e status são obrigatórios" });
    }

    // Validar status
    const statusValidos = ["pendente", "pago", "cancelado", "expirado"];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({
        error: "Status inválido",
        statusValidos,
      });
    }

    console.log("🔧 [DEBUG] Atualizando status manualmente:", {
      orderId,
      orderIdType: typeof orderId,
      novoStatus: status,
    });

    // Verificar se a order existe primeiro
    const { data: orderExistente, error: erroFind } = await supabaseServer
      .from("order")
      .select("id, status")
      .eq("id", orderId)
      .single();

    if (erroFind || !orderExistente) {
      console.error("❌ Order não encontrada:", orderId);
      return res.status(404).json({
        error: "Order não encontrada",
        orderId,
        details: erroFind?.message,
      });
    }

    console.log("📋 Order atual:", {
      id: orderExistente.id,
      statusAtual: orderExistente.status,
    });

    // Atualizar status
    const { data: orderAtualizada, error: erroUpdate } = await supabaseServer
      .from("order")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select("id, status, updated_at")
      .single();

    if (erroUpdate) {
      console.error("❌ Erro ao atualizar:", erroUpdate);
      return res.status(500).json({
        error: "Erro ao atualizar order",
        details: erroUpdate.message,
      });
    }

    console.log("✅ Order atualizada com sucesso:", {
      id: orderAtualizada.id,
      statusAnterior: orderExistente.status,
      statusNovo: orderAtualizada.status,
      updated_at: orderAtualizada.updated_at,
    });

    return res.status(200).json({
      success: true,
      message: "Status atualizado com sucesso",
      orderAnterior: {
        id: orderExistente.id,
        status: orderExistente.status,
      },
      orderAtualizada: {
        id: orderAtualizada.id,
        status: orderAtualizada.status,
        updated_at: orderAtualizada.updated_at,
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

