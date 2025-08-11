import type { NextApiRequest, NextApiResponse } from "next";
import { Payment, MercadoPagoConfig } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

// Usar service role key para permitir atualizações via webhook
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service Role Key para permitir atualizações
);

export async function atualizarStatusOrder(id: string, novoStatus: string) {
  console.log(`🔄 Atualizando status do order ${id} para: ${novoStatus}`);
  
  const { data, error } = await supabase
    .from('order')
    .update({ status: novoStatus })
    .eq('id', id)
    .select('id, status');

  if (error) {
    console.error(`❌ Erro ao atualizar status do order ${id}:`, error);
    throw error;
  }
  
  console.log(`✅ Status do order ${id} atualizado com sucesso:`, data);
  return data;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("📨 Webhook recebido:", {
    method: req.method,
    body: req.body,
    query: req.query,
    headers: req.headers
  });

  if (req.method !== "POST") {
    console.log("❌ Método não permitido:", req.method);
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { data, type } = req.body;

  if (type === "payment") {
    try {
      console.log("💳 Processando pagamento:", data);
      
      const mercadoPagoClient = new MercadoPagoConfig({
        accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
      });

      const paymentClient = new Payment(mercadoPagoClient);

      // Buscar detalhes do pagamento no Mercado Pago
      const pagamento = await paymentClient.get({ id: data.id });
      
      console.log("📊 Dados do pagamento:", {
        id: pagamento.id,
        status: pagamento.status,
        external_reference: pagamento.external_reference,
        amount: pagamento.transaction_amount
      });

      // Verificar se o pagamento foi aprovado e tem referência externa
      if (pagamento.status === "approved" && pagamento.external_reference) {
        console.log("✅ Pagamento aprovado, atualizando status do order");
        await atualizarStatusOrder(pagamento.external_reference, "pago");
        
        console.log("🎉 Processamento concluído com sucesso");
        res.status(200).json({ 
          received: true, 
          message: "Status atualizado para pago",
          orderId: pagamento.external_reference
        });
      } else {
        console.log("⚠️ Pagamento não aprovado ou sem referência externa:", {
          status: pagamento.status,
          external_reference: pagamento.external_reference
        });
        res.status(200).json({ 
          received: true, 
          message: "Pagamento processado mas não aprovado",
          status: pagamento.status
        });
      }
    } catch (error) {
      console.error("❌ Erro ao processar webhook:", error);
      res.status(500).json({ 
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  } else {
    console.log("ℹ️ Tipo de webhook não processado:", type);
    res.status(200).json({ 
      received: true, 
      message: "Webhook recebido mas tipo não processado",
      type: type
    });
  }
}