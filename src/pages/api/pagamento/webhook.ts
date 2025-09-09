import { NextApiRequest, NextApiResponse } from "next"
import { supabaseServer } from "@/lib/supabaseServer" // usa service role key

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { type, data } = req.body

    // Só tratamos eventos de pagamento aprovado
    if (type === "payment" && data?.status === "approved") {
      const paymentId = data.id
      const externalReference = data.external_reference // Vem do checkout

      console.log(`💳 Pagamento aprovado! payment_id=${paymentId}, ref=${externalReference}`)

      // Converte status do MercadoPago para o nosso interno
      const internalStatus = "pago"

      const { data: orderUpdated, error } = await supabaseServer
        .from("order")
        .update({
          status: internalStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", externalReference)
        .select("id, status")

      if (error) {
        console.error("❌ Erro ao atualizar order:", error)
        return res.status(500).json({ error: "Erro ao atualizar order" })
      }

      console.log("✅ Order atualizada:", orderUpdated)
      return res.status(200).json({ success: true })
    }

    res.status(200).json({ message: "Evento ignorado" })
  } catch (err) {
    console.error("❌ Erro no webhook:", err)
    res.status(500).json({ error: "Erro no webhook" })
  }
}
