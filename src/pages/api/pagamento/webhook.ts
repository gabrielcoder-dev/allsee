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
  // Verificar variáveis de ambiente necessárias
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    console.error("❌ MERCADO_PAGO_ACCESS_TOKEN não configurado");
    return res.status(500).json({ error: "Configuração do Mercado Pago não encontrada" });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Variáveis do Supabase não configuradas");
    return res.status(500).json({ error: "Configuração do banco de dados não encontrada" });
  }

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

  // Validar se o body tem os campos necessários
  if (!data || !type) {
    console.error("❌ Body inválido:", req.body);
    return res.status(400).json({ error: "Body inválido - campos data e type são obrigatórios" });
  }

  if (type === "payment") {
    try {
      console.log("💳 Processando pagamento:", data);
      
      const mercadoPagoClient = new MercadoPagoConfig({
        accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
      });

      const paymentClient = new Payment(mercadoPagoClient);

      // Validar se o ID do pagamento existe
      if (!data.id) {
        console.error("❌ ID do pagamento não encontrado:", data);
        return res.status(400).json({ error: "ID do pagamento é obrigatório" });
      }

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
        return res.status(200).json({ 
          received: true, 
          message: "Status atualizado para pago",
          orderId: pagamento.external_reference
        });
      } else {
        console.log("⚠️ Pagamento não aprovado ou sem referência externa:", {
          status: pagamento.status,
          external_reference: pagamento.external_reference
        });
        return res.status(200).json({ 
          received: true, 
          message: "Pagamento processado mas não aprovado",
          status: pagamento.status
        });
      }
    } catch (error) {
      console.error("❌ Erro ao processar webhook:", error);
      return res.status(500).json({ 
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  } else {
    console.log("ℹ️ Tipo de webhook não processado:", type);
    return res.status(200).json({ 
      received: true, 
      message: "Webhook recebido mas tipo não processado",
      type: type
    });
  }
}