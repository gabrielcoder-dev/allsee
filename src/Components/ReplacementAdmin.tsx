// src/Components/ReplacementAdmin.tsx
"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from '@supabase/supabase-js';
import ImageModal from "./ImageModal";

interface Order {
  id: number;
  caminho_imagem: string | null;
  id_campanha: number;
}

const isVideo = (url: string) => {
  return url.match(/\.(mp4|webm|ogg)$/i) || url.startsWith("data:video");
};

const ReplacementAdmin = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalFile, setModalFile] = useState<{ url: string; id: number } | null>(null);

  const getOrderStatus = (orderId: number) => {
    return localStorage.getItem(`replacement_order_${orderId}`) || "pendente";
  };

  useEffect(() => {
    async function fetchOrders() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      setLoading(true);
      const { data, error } = await supabase
        .from("arte_troca_campanha")
        .select("id, caminho_imagem, id_campanha")
        .order("id", { ascending: false });

      if (!error && data) {
        const adaptedOrders = data.map((item) => ({
          id: item.id,
          caminho_imagem: item.caminho_imagem,
          id_campanha: item.id_campanha,
        }));
        setOrders(adaptedOrders);
      }
      setLoading(false);
    }
    fetchOrders();
  }, []);

  const handleDownload = (url: string, id: number) => {
    // Cria um link temporário para download
    const a = document.createElement("a");
    a.href = url;
    a.download = `arquivo-pedido-${id}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleApprove = (orderId: number) => {
    localStorage.setItem(`replacement_order_${orderId}`, "aprovado");
    window.dispatchEvent(new Event('storage'));
  };

  const handleReject = (orderId: number) => {
    localStorage.setItem(`replacement_order_${orderId}`, "rejeitado");
    window.dispatchEvent(new Event('storage'));
  };

  if (loading) return <div className="p-4">Carregando pedidos...</div>;
  if (!orders.length) return <div className="p-4">Nenhum pedido encontrado.</div>;

  return (
    <div className="w-full h-full p-3 md:p-6 overflow-auto">
      <h2 className="text-2xl md:text-3xl font-bold text-orange-600 mb-4 md:mb-6">Aprovação de Pedidos</h2>
      <div className="space-y-3 md:space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 justify-between border border-gray-300 rounded-xl md:rounded-2xl p-3 md:p-4 bg-white shadow-sm"
          >
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              {order.caminho_imagem ? (
                order.caminho_imagem.startsWith("data:image") || order.caminho_imagem.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                  <img
                    src={order.caminho_imagem}
                    alt={`Arte do pedido ${order.id_campanha}`}
                    className="w-16 h-16 md:w-24 md:h-24 rounded-lg md:rounded-xl object-cover flex-shrink-0"
                  />
                ) : isVideo(order.caminho_imagem) ? (
                  <video
                    src={order.caminho_imagem}
                    className="w-16 h-16 md:w-24 md:h-24 rounded-lg md:rounded-xl object-cover flex-shrink-0"
                    controls={false}
                    preload="metadata"
                  />
                ) : (
                  <Image
                    src={order.caminho_imagem}
                    alt={`Arte do pedido ${order.id_campanha}`}
                    width={96}
                    height={96}
                    className="w-16 h-16 md:w-24 md:h-24 rounded-lg md:rounded-xl object-cover flex-shrink-0"
                  />
                )
              ) : (
                <div className="w-16 h-16 md:w-24 md:h-24 bg-gray-200 rounded-lg md:rounded-xl flex items-center justify-center text-gray-400 flex-shrink-0">
                  <span className="text-xs md:text-sm">Sem imagem</span>
                </div>
              )}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 min-w-0 flex-1">
                <div className="flex items-center gap-2 md:gap-4">
                  <button
                    className="text-gray-500 hover:text-orange-600 text-sm md:text-base font-medium transition-colors"
                    onClick={() => order.caminho_imagem && handleDownload(order.caminho_imagem, order.id_campanha)}
                  >
                    Baixar
                  </button>
                  <button
                    className="text-gray-500 hover:text-orange-600 text-sm md:text-base font-medium transition-colors"
                    onClick={() => order.caminho_imagem && setModalFile({ url: order.caminho_imagem, id: order.id_campanha })}
                  >
                    Assistir
                  </button>
                </div>
                <span className="text-sm md:text-base font-bold text-gray-700">Pedido #{order.id_campanha}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <button
                className="bg-green-500 hover:bg-green-600 cursor-pointer text-white rounded-lg md:rounded-xl px-3 py-2 font-bold text-xs md:text-sm transition-colors min-w-[70px]"
                onClick={() => {
                  const currentStatus = getOrderStatus(order.id_campanha);
                  if (currentStatus === "aprovado") {
                    localStorage.removeItem(`replacement_order_${order.id_campanha}`);
                  } else {
                    handleApprove(order.id_campanha);
                  }
                }}
              >
                {getOrderStatus(order.id_campanha) === "aprovado" ? "Remover Aprovação" : "Aprovar"}
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 cursor-pointer text-white rounded-lg md:rounded-xl px-3 py-2 font-bold text-xs md:text-sm transition-colors min-w-[70px]"
                onClick={() => {
                  const currentStatus = getOrderStatus(order.id_campanha);
                  if (currentStatus === "rejeitado") {
                    localStorage.removeItem(`replacement_order_${order.id_campanha}`);
                  } else {
                    handleReject(order.id_campanha);
                  }
                }}
              >
                {getOrderStatus(order.id_campanha) === "rejeitado" ? "Remover Rejeição" : "Recusar"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para assistir arquivo */}
      {modalFile && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center md:items-center md:justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalFile(null)}></div>
          <div className="relative bg-white rounded-xl md:rounded-2xl shadow-2xl p-4 md:p-7 max-w-2xl w-full flex flex-col items-center opacity-100 z-10" onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 cursor-pointer text-gray-400 hover:text-gray-700 text-xl font-bold p-2"
              onClick={() => setModalFile(null)}
              aria-label="Fechar"
            >
              ×
            </button>
            {modalFile.url.startsWith("data:image") || modalFile.url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
              <img
                src={modalFile.url}
                alt={`Arquivo do pedido ${modalFile.id}`}
                className="object-contain max-h-[300px] md:max-h-[400px] w-auto rounded mb-4 shadow-lg"
              />
            ) : isVideo(modalFile.url) ? (
              <video
                src={modalFile.url}
                controls
                className="object-contain max-h-[300px] md:max-h-[400px] w-auto rounded mb-4 shadow-lg"
                autoPlay
              />
            ) : (
              <Image
                src={modalFile.url}
                alt={`Arquivo do pedido ${modalFile.id}`}
                width={400}
                height={400}
                className="object-contain max-h-[300px] md:max-h-[400px] w-auto rounded mb-4 shadow-lg"
              />
            )}
            <button
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg md:rounded-xl px-4 py-2 font-bold text-sm md:text-base mt-2 transition-colors"
              onClick={() => handleDownload(modalFile.url, modalFile.id)}
            >
              Baixar arquivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReplacementAdmin;