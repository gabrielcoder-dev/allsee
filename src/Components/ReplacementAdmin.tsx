// src/Components/ReplacementAdmin.tsx
import React, { useState, useEffect } from "react";
import Image from "next/image";
import ImageAprove from "@/assets/restaurante-2.jpg"; // Placeholder image
import { supabase } from "@/lib/supabase"; // Import your Supabase client

interface ReplacementRequest {
  id: number;
  order_id: number;
  user_id: string;
  new_art_url: string;
  status: 'pending' | 'approved' | 'rejected';
  nome_campanha: string; // Assuming you have the campaign name here
  arte_campanha_atual: string;
}

const ReplacementAdmin = () => {
  const [replacementRequests, setReplacementRequests] = useState<ReplacementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReplacementRequests() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("replacement_requests")
          .select("*")
          .eq("status", "pending"); // Only fetch pending requests

        if (error) {
          setError(error.message);
        } else {
          setReplacementRequests(data || []);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchReplacementRequests();
  }, []);

  const handleAccept = async (request: ReplacementRequest) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Update the 'order' table with the new art URL
      const { error: orderError } = await supabase
        .from("order")
        .update({ arte_campanha: request.new_art_url })
        .eq("id", request.order_id);

      if (orderError) {
        throw new Error(`Erro ao atualizar a arte no pedido: ${orderError.message}`);
      }

      // 2. Update the 'replacement_requests' table to mark the request as 'approved'
      const { error: replacementError } = await supabase
        .from("replacement_requests")
        .update({ status: "approved" })
        .eq("id", request.id);

      if (replacementError) {
        throw new Error(`Erro ao atualizar a solicitação de substituição: ${replacementError.message}`);
      }

      // 3. Refresh the data
      setReplacementRequests(prevRequests =>
        prevRequests.filter(req => req.id !== request.id)
      );

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (request: ReplacementRequest) => {
    try {
      setLoading(true);
      setError(null);

      // Update the 'replacement_requests' table to mark the request as 'rejected'
      const { error: replacementError } = await supabase
        .from("replacement_requests")
        .update({ status: "rejected" })
        .eq("id", request.id);

      if (replacementError) {
        throw new Error(`Erro ao atualizar a solicitação de substituição: ${replacementError.message}`);
      }

      // Refresh the data
      setReplacementRequests(prevRequests =>
        prevRequests.filter(req => req.id !== request.id)
      );

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full p-3 md:p-6">
      <h2 className="text-2xl md:text-3xl font-bold text-orange-600 mb-4 md:mb-6">Solicitações de Substituição</h2>

      {loading && <p>Carregando solicitações...</p>}
      {error && <p className="text-red-500">Erro: {error}</p>}

      <div className="space-y-4 md:space-y-6">
        {replacementRequests.map((request) => (
          <div
            key={request.id}
            className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 justify-between border border-gray-300 rounded-xl md:rounded-2xl p-4 md:p-6 bg-white shadow-sm"
          >
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              <Image
                src={request.new_art_url || ImageAprove} // Use the new art URL
                alt={`Replacement for ${request.nome_campanha}`}
                width={96}
                height={96}
                className="w-16 h-16 md:w-24 md:h-24 rounded-lg md:rounded-xl object-cover flex-shrink-0"
              />
              <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 min-w-0 flex-1">
                <div className="flex items-center gap-2 md:gap-4">
                  <a
                    href={request.new_art_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-orange-600 text-sm md:text-base font-medium transition-colors"
                  >
                    Baixar
                  </a>
                  <button className="text-gray-500 hover:text-orange-600 text-sm md:text-base font-medium transition-colors">
                    Assistir
                  </button>
                </div>
                <div className="text-sm md:text-base">
                  <p className="font-bold text-gray-800">{request.nome_campanha}</p>
                  <p className="text-gray-500">Solicitação de substituição</p>
                  <p className="text-gray-500"> Arte antiga: {request.arte_campanha_atual}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <button
                className="bg-green-500 hover:bg-green-600 cursor-pointer text-white rounded-lg md:rounded-xl px-3 py-2 font-bold text-xs md:text-sm transition-colors min-w-[70px]"
                onClick={() => handleAccept(request)}
                disabled={loading}
              >
                Aceitar
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 cursor-pointer text-white rounded-lg md:rounded-xl px-3 py-2 font-bold text-xs md:text-sm transition-colors min-w-[70px]"
                onClick={() => handleReject(request)}
                disabled={loading}
              >
                Recusar
              </button>
            </div>
          </div>
        ))}

        {replacementRequests.length === 0 && !loading && !error && (
          <div className="text-center py-4 text-gray-500">
            Nenhuma solicitação de substituição pendente.
          </div>
        )}
      </div>
    </div>
  );
};

export default ReplacementAdmin;