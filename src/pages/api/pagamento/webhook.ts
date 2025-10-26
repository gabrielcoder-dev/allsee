import { supabaseServer } from "@/lib/supabaseServer";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  //Sempre responder 200 para o Mercado Pago (evita reenvio de webhook)
  const sendResponse = (status: number, data: any) => {
    res.status(status).json(data);

  };

  if (req.method !== "POST") {
    return sendResponse(405, { success: false, message: "Método não permitido" });
  }

  try {
   if(req.body.type !== "payment" || !req.body.data?.id) {
    return sendResponse(200, { success: false, message: "Evento ignorado (não é pagamento)" });
   }

   const status = req.body.data.status;
   const orderId = req.query.orderId;
   
   if(status === "approved" && orderId) {
    const { data, error } = await supabaseServer
      .from("order")
      .update({ status: "pago" })
      .eq("id", orderId)
      .select();

      if(error) {
        console.error("Erro ao atualizar order:", error);
        return sendResponse(200, { success: false, message: "Erro ao atualizar order" });
      }

      console.log("Order atualizada com sucesso:", data);
      return sendResponse(200, { success: true, message: "Pagamento aprovado" });
    }

    return sendResponse(200, { success: false, message: "Evento ignorado (não é pagamento)" });
  } catch (error: any) {
    console.error("Erro inesperado no webhook:", error);
    return sendResponse(200, { success: false, message: "Erro inesperado no webhook" });
  }
}
