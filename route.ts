import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("🔄 Recebida requisição para atualizar status do pedido.");

  const { orderId, newStatus } = await request.json();

  if (!orderId || !newStatus) {
    console.error("❌ Faltando orderId ou newStatus no corpo da requisição.");
    return NextResponse.json(
      { error: "orderId e newStatus são obrigatórios" },
      { status: 400 }
    );
  }

  if (!["aprovado", "recusado"].includes(newStatus)) {
    console.error(`❌ Status inválido: ${newStatus}`);
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  try {
    // Usar o cliente com service_role para ter permissão de admin no DB.
    // Isso é seguro pois a chave secreta fica apenas no servidor.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    console.log(
      `⏳ Atualizando pedido ${orderId} para o status '${newStatus}'...`
    );

    const { data, error } = await supabaseAdmin
      .from("order")
      .update({ approval_status: newStatus })
      .eq("id", orderId)
      .select("id, approval_status")
      .single();

    if (error) {
      console.error("❌ Erro ao atualizar no Supabase:", error);
      throw error;
    }

    console.log("✅ Pedido atualizado com sucesso:", data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("🔥 Erro geral no processamento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error.message },
      { status: 500 }
    );
  }
}
