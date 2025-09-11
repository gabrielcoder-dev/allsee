// src/app/(private)/meus-anuncios/page.tsx
"use client"

import React, { useState, useEffect } from "react";
import Image from "next/image";
import ImageAprove from "@/assets/restaurante-2.jpg"; // Altere para sua imagem padrão
import { supabase } from "@/lib/supabase"; // Importe seu cliente Supabase

interface OrderWithReplacement {
  id: number;
  nome_campanha: string;
  arte_campanha: string; // the current art
  new_arte_campanha: string | null;
  replacement_status: 'pending' | 'approved' | 'rejected' | null;
  preco: number;
  inicio_campanha: string;
  duracao_campanha: number;
  caminho_imagem: string; // URL da imagem da arte da campanha
}

const ReplacementAdmin = () => {
  const [ordersWithReplacements, setOrdersWithReplacements] = useState<OrderWithReplacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrdersWithReplacements() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("order")
          .select(
            `
            *,
            arte_campanha (
              caminho_imagem
            )
          `
          )
          .eq("replacement_status", "pending");

        if (error) {
          setError(error.message);
        } else {
          // Adapta os dados para a estrutura esperada
          const adaptedOrders = data.map((item) => ({
            id: item.id,
            nome_campanha: item.nome_campanha,
            arte_campanha: item.arte_campanha,
            new_arte_campanha: item.new_arte_campanha,
            replacement_status: item.replacement_status,
            preco: item.preco,
            inicio_campanha: item.inicio_campanha,
            duracao_campanha: item.duracao_campanha,
            caminho_imagem: item.arte_campanha?.caminho_imagem || "",
          }));
          setOrdersWithReplacements(adaptedOrders);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchOrdersWithReplacements();
  }, []);

  const handleAccept = async (order: OrderWithReplacement) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from("order")
        .update({
          new_arte_campanha: null,
          replacement_status: "approved"
        })
        .eq("id", order.id);

      if (updateError) {
        throw new Error(`Erro ao atualizar o pedido: ${updateError.message}`);
      }

      setOrdersWithReplacements(prevOrders =>
        prevOrders.filter(o => o.id !== order.id)
      );

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (order: OrderWithReplacement) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from("order")
        .update({
          arte_campanha: order.new_arte_campanha, // Reverter para a arte anterior (que agora está em new_arte_campanha)
          new_arte_campanha: null, //Limpa a arte
          replacement_status: "rejected"
        })
        .eq("id", order.id);

      if (updateError) {
        throw new Error(`Erro ao atualizar o pedido: ${updateError.message}`);
      }

      setOrdersWithReplacements(prevOrders =>
        prevOrders.filter(o => o.id !== order.id)
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
        {ordersWithReplacements.map((order) => (
          <div
            key={order.id}
            className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 justify-between border border-gray-300 rounded-xl md:rounded-2xl p-4 md:p-6 bg-white shadow-sm"
          >
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              <div className="flex flex-col gap-2">
                {/* Current Art (which is the new art) */}
                <div>
                  <p className="text-gray-500">Nova Arte Proposta:</p>
                  <Image
                    src={order.arte_campanha || ImageAprove} // Mostra a NEW art
                    alt={`Current art for ${order.nome_campanha}`}
                    width={96}
                    height={96}
                    className="w-16 h-16 md:w-24 md:h-24 rounded-lg md:rounded-xl object-cover flex-shrink-0"
                  />
                </div>

                {/* Previous Art */}
                {order.new_arte_campanha && (
                  <div>
                    <p className="text-gray-500">Arte Anterior:</p>
                    <Image
                      src={order.new_arte_campanha} // Mostra a OLD art
                      alt={`Previous art for ${order.nome_campanha}`}
                      width={96}
                      height={96}
                      className="w-16 h-16 md:w-24 md:h-24 rounded-lg md:rounded-xl object-cover flex-shrink-0"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 min-w-0 flex-1">
                <div className="flex items-center gap-2 md:gap-4">
                  <a
                    href={order.arte_campanha || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-orange-600 text-sm md:text-base font-medium transition-colors"
                  >
                    Baixar Nova Arte
                  </a>
                  <a
                    href={order.new_arte_campanha || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-orange-600 text-sm md:text-base font-medium transition-colors"
                  >
                    Baixar Arte Anterior
                  </a>
                  <button className="text-gray-500 hover:text-orange-600 text-sm md:text-base font-medium transition-colors">
                    Assistir
                  </button>
                </div>
                <div className="text-sm md:text-base">
                  <p className="font-bold text-gray-800">{order.nome_campanha}</p>
                  <p className="text-gray-500">Solicitação de substituição</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <button
                className="bg-green-500 hover:bg-green-600 cursor-pointer text-white rounded-lg md:rounded-xl px-3 py-2 font-bold text-xs md:text-sm transition-colors min-w-[70px]"
                onClick={() => handleAccept(order)}
                disabled={loading}
              >
                Aceitar
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 cursor-pointer text-white rounded-lg md:rounded-xl px-3 py-2 font-bold text-xs md:text-sm transition-colors min-w-[70px]"
                onClick={() => handleReject(order)}
                disabled={loading}
              >
                Recusar
              </button>
            </div>
          </div>
        ))}

        {ordersWithReplacements.length === 0 && !loading && !error && (
          <div className="text-center py-4 text-gray-500">
            Nenhuma solicitação de substituição pendente.
          </div>
        )}
      </div>
    </div>
  );
};

export default ReplacementAdmin;