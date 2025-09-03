"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

type Order = {
  id: string;
  nome_campanha: string;
  approval_status: 'pendente' | 'aprovado' | 'recusado';
  created_at: string;
  // ...outros campos
};

const statusStyles = {
  aprovado: {
    text: "✅ Sua arte foi aceita!",
    className: "text-green-700 bg-green-100 border-green-200",
  },
  recusado: {
    text: "❌ Sua arte não foi aceita, tente novamente!",
    className: "text-red-700 bg-red-100 border-red-200",
  },
  pendente: {
    text: "⏳ Sua arte está em análise.",
    className: "text-yellow-700 bg-yellow-100 border-yellow-200",
  },
};

const StatusBadge = ({ status }: { status: Order['approval_status'] }) => {
  const style = statusStyles[status] || { text: '', className: 'hidden' };

  return (
    <div className={`px-3 py-1 text-sm font-medium rounded-full inline-block border ${style.className}`}>
      {style.text}
    </div>
  );
};

export default function MeusAnunciosPage() {
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchMyOrders = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("order")
          .select("*")
          .eq("id_user", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          toast.error("Erro ao buscar seus anúncios.");
          console.error(error);
        } else {
          setMyOrders(data || []);
        }
      }
      setLoading(false);
    };
    fetchMyOrders();
  }, [supabase]);

  if (loading) {
    return <div className="container mx-auto p-4 text-center"><p className="text-gray-500">Carregando seus anúncios...</p></div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Meus Anúncios</h1>
      {myOrders.length === 0 ? (
        <p className="text-gray-600">Você ainda não criou nenhum anúncio.</p>
      ) : (
        <div className="space-y-4">
          {myOrders.map(order => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center justify-between">
              <div>
                <h4 className="text-xl font-semibold text-gray-900">{order.nome_campanha}</h4>
                <p className="text-sm text-gray-500">Pedido #{order.id.substring(0, 8)}</p>
              </div>
              <StatusBadge status={order.approval_status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
