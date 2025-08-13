import type { NextApiRequest, NextApiResponse } from "next";
import { Payment, MercadoPagoConfig } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

// Usar service role key para permitir atualizações via webhook
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '', 
  process.env.SUPABASE_SERVICE_ROLE_KEY || '' // Service Role Key para permitir atualizações
);

export async function atualizarStatusOrder(id: string, novoStatus: string) {
  console.log(`🔄 Atualizando status do order ${id} para: ${novoStatus}`);
  
  try {
    const { data, error } = await supabase
      .from('order')
      .update({ status: novoStatus })
      .eq('id', id)
      .select('id, status');

    if (error) {
      console.error(`❌ Erro ao atualizar status do order! ${id}:`, error);
      throw error;
    }
    
    console.log(`✅ Status do order ${id} atualizado com sucesso:`, data);
    return data;
  } catch (error) {
    console.error(`❌ Erro na função atualizarStatusOrder:`, error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log("📨 Webhook recebido:", {
      method: req.method,
      body: req.body,
      query: req.query,
      headers: req.headers
    });

    // Verificar variáveis de ambiente necessárias
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error("❌ MERCADO_PAGO_ACCESS_TOKEN não configurado");
      return res.status(500).json({ error: "Configuração do Mercado Pago não encontrada" });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ Variáveis do Supabase não configuradas");
      return res.status(500).json({ error: "Configuração do banco de dados não encontrada" });
    }

    if (req.method !== "POST") {
      console.log("❌ Método não permitido:", req.method);
      return res.status(405).json({ error: "Método não permitido" });
    }

    // Verificar se o body existe e é válido
    if (!req.body) {
      console.error("❌ Body não encontrado");
      return res.status(400).json({ error: "Body não encontrado" });
    }

    const { data, type } = req.body;

    // Validar se o body tem os campos necessários
    if (!data || !type) {
      console.error("❌ Body inválido:", req.body);
      return res.status(400).json({ error: "Body inválido - campos data e type são obrigatórios" });
    }

    if (type === "payment") {
      console.log("💳 Processando pagamento:", data);
      
      // Verificar se é um teste do Mercado Pago (ID 123456)
      if (data.id === "123456") {
        console.log("🧪 Teste do Mercado Pago detectado");
        return res.status(200).json({ 
          received: true, 
          message: "Teste do webhook recebido com sucesso",
          test: true
        });
      }
      
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
        console.log("✅ Pagamento aprovado! Order ID:", pagamento.external_reference);
        console.log("🔄 Atualizando status do order para 'pago'...");
        
        await atualizarStatusOrder(pagamento.external_reference, "pago");
        
        console.log("🎉 Order atualizado com sucesso! Status: pago");
        return res.status(200).json({ 
          received: true, 
          message: "Status atualizado para pago!",
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
    } else {
      console.log("ℹ️ Tipo de webhook não processado:", type);
      return res.status(200).json({ 
        received: true, 
        message: "Webhook recebido mas tipo não processado",
        type: type
      });
    }
  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    return res.status(500).json({ 
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
}