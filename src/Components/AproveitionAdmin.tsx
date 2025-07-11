"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import ImageModal from "./ImageModal";

interface Order {
  id: number;
  arte_campanha: string | null;
}

const isVideo = (url: string) => {
  return url.match(/\.(mp4|webm|ogg)$/i) || url.startsWith("data:video");
};

const AproveitionAdmin = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalFile, setModalFile] = useState<{ url: string; id: number } | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      const { data, error } = await supabase
        .from("order")
        .select("id, arte_campanha")
        .order("id", { ascending: false });
      if (!error && data) {
        setOrders(data);
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

  if (loading) return <div>Carregando pedidos...</div>;
  if (!orders.length) return <div>Nenhum pedido encontrado.</div>;

  return (
    <div className="w-full h-full p-2 md:p-10 overflow-auto">
      {orders.map((order) => (
        <div
          key={order.id}
          className="flex flex-row flex-wrap items-center gap-2 justify-between border border-gray-300 rounded-2xl p-2 mb-4 bg-white"
        >
          <div className="flex gap-2 items-center min-w-[120px]">
            {order.arte_campanha ? (
              order.arte_campanha.startsWith("data:image") || order.arte_campanha.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                <img
                  src={order.arte_campanha}
                  alt={`Arte do pedido ${order.id}`}
                  className="w-20 sm:w-24 md:w-32 rounded-2xl object-cover"
                />
              ) : isVideo(order.arte_campanha) ? (
                <video
                  src={order.arte_campanha}
                  className="w-20 sm:w-24 md:w-32 rounded-2xl object-cover"
                  controls={false}
                  preload="metadata"
                />
              ) : (
                <Image
                  src={order.arte_campanha}
                  alt={`Arte do pedido ${order.id}`}
                  width={128}
                  height={96}
                  className="w-20 sm:w-24 md:w-32 rounded-2xl object-cover"
                />
              )
            ) : (
              <div className="w-20 sm:w-24 md:w-32 h-20 sm:h-24 md:h-32 bg-gray-200 rounded-2xl flex items-center justify-center text-gray-400">
                Sem imagem
              </div>
            )}
            <div className="flex items-center gap-2 sm:gap-4">
              <p
                className="text-gray-500 cursor-pointer hover:text-orange-600 text-xl sm:text-sm md:text-base"
                onClick={() => order.arte_campanha && handleDownload(order.arte_campanha, order.id)}
              >
                Baixar
              </p>
              <p
                className="text-gray-500 cursor-pointer hover:text-orange-600 text-xl sm:text-sm md:text-base"
                onClick={() => order.arte_campanha && setModalFile({ url: order.arte_campanha, id: order.id })}
              >
                Assistir
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 p-2 min-w-[160px] w-auto justify-center">
            <p className="mx-2 my-2 md:my-0 text-center md:text-left min-w-[80px] font-bold">Detalhes</p>
            <button className="bg-green-500 cursor-pointer text-white rounded-2xl px-3 py-2 font-bold text-xs sm:text-sm md:text-base min-w-[70px]">Aprovar</button>
            <button className="bg-red-500 cursor-pointer text-white rounded-2xl px-3 py-2 font-bold text-xs sm:text-sm md:text-base min-w-[70px]">Recusar</button>
          </div>
        </div>
      ))}
      {/* Modal para assistir arquivo */}
      {modalFile && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center md:items-center md:justify-center">
          <div className="absolute inset-0 bg-gray-500 opacity-50" onClick={() => setModalFile(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl p-7 max-w-2xl w-full flex flex-col items-center opacity-100 z-10" onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-2 cursor-pointer right-2 text-gray-400 hover:text-gray-700 text-xl font-bold"
              onClick={() => setModalFile(null)}
              aria-label="Fechar"
            >
              ×
            </button>
            {modalFile.url.startsWith("data:image") || modalFile.url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
              <img
                src={modalFile.url}
                alt={`Arquivo do pedido ${modalFile.id}`}
                className="object-contain max-h-[400px] w-auto rounded mb-4 shadow-lg"
              />
            ) : isVideo(modalFile.url) ? (
              <video
                src={modalFile.url}
                controls
                className="object-contain max-h-[400px] w-auto rounded mb-4 shadow-lg"
                autoPlay
              />
            ) : (
              <Image
                src={modalFile.url}
                alt={`Arquivo do pedido ${modalFile.id}`}
                width={400}
                height={400}
                className="object-contain max-h-[400px] w-auto rounded mb-4 shadow-lg"
              />
            )}
            <button
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl px-4 py-2 font-bold text-base mt-2"
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

export default AproveitionAdmin;
