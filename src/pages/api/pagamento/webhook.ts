// pages/api/mercado-pago/webhook.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { Payment, MercadoPagoConfig } from "mercadopago";
import { atualizarStatusCompra } from "@/lib/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("📨 Webhook recebido:", {
      method: req.method,
      body: req.body,
      headers: req.headers
    });

    if (req.method !== "POST") {
      console.log("❌ Método não permitido:", req.method);
      return res.status(405).json({ error: "Método não permitido" });
    }

    const paymentId = req.body?.data?.id;
    const topic = req.body?.type;

    if (topic !== "payment" || !paymentId) {
      console.error("❌ Payload inválido:", req.body);
      return res.status(400).json({ error: "Invalid payload" });
    }

    // Verificar se é um teste do Mercado Pago (ID 123456)
    if (paymentId === "123456") {
      console.log("🧪 Teste do Mercado Pago detectado");
      return res.status(200).json({ 
        received: true, 
        message: "Teste do webhook recebido com sucesso",
        test: true
      });
    }

    console.log("💳 Processando pagamento ID:", paymentId);

    // Verificar se o token de acesso está configurado
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error("❌ MERCADO_PAGO_ACCESS_TOKEN não configurado");
      return res.status(500).json({ error: "Token de acesso não configurado" });
    }

    // Inicializa o client corretamente
    const mercadoPagoClient = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
    });

    const paymentClient = new Payment(mercadoPagoClient);

    // Busca o pagamento na API do Mercado Pago
    const payment = await paymentClient.get({ id: paymentId });
    
    console.log("📊 Dados do pagamento:", {
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
      amount: payment.transaction_amount
    });

    const externalReference = payment.external_reference;
    const status = payment.status;

    if (externalReference && status) {
      // Atualiza status da compra no banco
      await atualizarStatusCompra(externalReference, status);
      
      console.log("🎉 Order atualizado com sucesso! Status:", status);
      return res.status(200).json({ 
        received: true, 
        message: "Status atualizado com sucesso",
        orderId: externalReference,
        status: status
      });
    } else {
      console.log("⚠️ Pagamento sem referência externa");
      return res.status(200).json({ 
        received: true, 
        message: "Pagamento processado mas sem referência externa",
        status: status
      });
    }
  } catch (err: any) {
    console.error("❌ Erro no webhook do Mercado Pago:", err);
    return res.status(500).json({ 
      error: "Erro ao processar webhook",
      details: err.message
    });
  }
}





