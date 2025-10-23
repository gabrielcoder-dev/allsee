// src/pages/api/pagamento/debug-webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { orderId, testStatus = "pago" } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "orderId é obrigatório" });
    }

    console.log("🔍 DEBUG WEBHOOK - Testando atualização de status");
    console.log("📋 orderId recebido:", orderId);
    console.log("📋 Tipo do orderId:", typeof orderId);

    // 1. Verificar se a order existe
    console.log("🔍 1. Verificando se order existe...");
    
    // Tentar buscar por string primeiro
    let existingOrder = null;
    let checkError = null;
    
    const { data: orderData, error: orderError } = await supabaseServer
      .from("order")
      .select("id, status, created_at")
      .eq("id", orderId)
      .single();
    
    if (!orderError && orderData) {
      existingOrder = orderData;
      console.log("✅ Order encontrada por string:", existingOrder);
    } else {
      // Tentar buscar por número se orderId for numérico
      const numericOrderId = parseInt(orderId, 10);
      if (!isNaN(numericOrderId)) {
        console.log("🔢 Tentando buscar por número:", numericOrderId);
        const { data: numericOrderData, error: numericOrderError } = await supabaseServer
          .from("order")
          .select("id, status, created_at")
          .eq("id", numericOrderId)
          .single();
        
        if (!numericOrderError && numericOrderData) {
          existingOrder = numericOrderData;
          console.log("✅ Order encontrada por número:", existingOrder);
        } else {
          checkError = numericOrderError;
        }
      } else {
        checkError = orderError;
      }
    }

    if (checkError) {
      console.error("❌ Erro ao verificar order:", checkError);
      return res.status(400).json({ 
        error: "Order não encontrada", 
        details: checkError.message,
        orderId: orderId,
        type: typeof orderId
      });
    }

    if (!existingOrder) {
      console.error("❌ Order não encontrada");
      return res.status(404).json({ 
        error: "Order não encontrada",
        orderId: orderId,
        type: typeof orderId
      });
    }

    console.log("📋 Order encontrada:", {
      id: existingOrder.id,
      status_atual: existingOrder.status,
      created_at: existingOrder.created_at
    });

    // 2. Tentar atualizar o status
    console.log("🔄 2. Tentando atualizar status...");
    
    const updateId = existingOrder.id;
    const { data: updatedOrder, error: updateError } = await supabaseServer
      .from("order")
      .update({ 
        status: testStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", updateId)
      .select("id, status, updated_at")
      .single();

    if (updateError) {
      console.error("❌ Erro ao atualizar status:", updateError);
      return res.status(500).json({ 
        error: "Erro ao atualizar status", 
        details: updateError.message,
        orderId: updateId
      });
    }

    console.log("✅ Status atualizado com sucesso:", updatedOrder);

    // 3. Verificar se realmente foi atualizado
    console.log("🔍 3. Verificando se atualização persistiu...");
    
    const { data: verifyOrder, error: verifyError } = await supabaseServer
      .from("order")
      .select("id, status, updated_at")
      .eq("id", updateId)
      .single();

    if (verifyError) {
      console.error("❌ Erro ao verificar atualização:", verifyError);
    } else {
      console.log("✅ Verificação final:", verifyOrder);
    }

    return res.status(200).json({
      success: true,
      message: "Teste de atualização concluído",
      originalOrder: existingOrder,
      updatedOrder: updatedOrder,
      verification: verifyOrder,
      orderId: orderId,
      updateId: updateId
    });

  } catch (error: any) {
    console.error("❌ Erro inesperado no debug:", error);
    return res.status(500).json({ 
      error: "Erro interno", 
      details: error.message 
    });
  }
}
