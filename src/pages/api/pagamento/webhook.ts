import type { NextApiRequest, NextApiResponse } from "next";
import { atualizarStatusCompra } from "../../../lib/utils";

import { Payment } from "mercadopago";
import { mercadoPagoClient } from "@/services/mercado-pago";

const paymentClient = new Payment(mercadoPagoClient);

// Mock ajustado: external_reference igual ao id recebido
async function buscarPagamentoMercadoPago(paymentId: string) {
  const payment = await paymentClient.get({
    id: paymentId,
  });

  return payment;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("Webhook recebido:", req.method, req.body, req.query);
  if (req.method === "POST") {
    const { data, type } = req.body;

    if (type === "payment") {
      try {
        const pagamento = await buscarPagamentoMercadoPago(data.id);
        if (pagamento.status === "approved" && pagamento.external_reference) {
          await atualizarStatusCompra(pagamento.external_reference, "pago");
        }
      } catch (error) {
        // Loga o erro, mas não interrompe o fluxo
        console.error("Erro ao buscar pagamento:", error);
        // Não retorne erro para o Mercado Pago!
      }
    }

    res.status(200).json({ received: true });
  } else {
    res.status(405).end(); // Method Not Allowed
  }
}
