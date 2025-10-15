// src/Components/AproveitionAdmin.tsx
"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import ImageModal from "./ImageModal";
import OrderDetailsModal from "./OrderDetailsModal";

interface Order {
  id: number;
  caminho_imagem: string | null;
  order_id: number;
}

const isVideo = (url: string) => {
  return url.match(/\.(mp4|webm|ogg)$/i) || url.startsWith("data:video");
};

const AproveitionAdmin = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalFile, setModalFile] = useState<{ url: string; id: number } | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderStatuses, setOrderStatuses] = useState<Record<number, string>>({});
  
  const getOrderStatus = (orderId: number) => {
    return orderStatuses[orderId] || localStorage.getItem(`order_${orderId}`) || "pendente";
  };

  const updateOrderStatus = (orderId: number, status: string) => {
    localStorage.setItem(`order_${orderId}`, status);
    setOrderStatuses(prev => ({
      ...prev,
      [orderId]: status
    }));

    // Disparar evento customizado para atualizar notificações
    window.dispatchEvent(new CustomEvent('approvalStatusChanged', {
      detail: {
        orderId: orderId,
        status: status,
        chave: `order_${orderId}`
      }
    }));

    console.log('📡 Evento de aprovação disparado:', {
      orderId: orderId,
      status: status
    });
  };

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      const { data, error } = await supabase
        .from("arte_campanha")
        .select("id, caminho_imagem, id_order")
        .order("id", { ascending: false });

      if (!error && data) {
        const adaptedOrders = data.map((item) => ({
          id: item.id,
          caminho_imagem: item.caminho_imagem,
          order_id: item.id_order,
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

  if (loading) return <div className="p-4">Carregando pedidos...</div>;
  if (!orders.length) return <div className="p-4">Nenhuma arte encontrada.</div>;

  return (
    <div className="w-full h-full p-3 md:p-6 overflow-auto bg-gray-50 min-h-screen">
      <div className="mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-orange-600 mb-4 md:mb-6">
          Aprovação de Artes
        </h2>
      </div>
      <div className="space-y-3 md:space-y-4">
        {orders.filter(order => {
          const status = getOrderStatus(order.order_id);
          return status !== 'aprovado' && status !== 'rejeitado';
        }).map((order) => {
          return (
          <div
            key={order.id}
            className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 justify-between bg-white border border-gray-200 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              {order.caminho_imagem ? (
                order.caminho_imagem.startsWith("data:image") || order.caminho_imagem.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                  <img
                    src={order.caminho_imagem}
                    alt={`Arte do pedido ${order.order_id}`}
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
                    alt={`Arte do pedido ${order.order_id}`}
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
                <div className="flex items-center gap-2 md:gap-3">
                  <button
                    className="text-gray-600 hover:text-gray-700 text-xs md:text-sm font-medium bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                    onClick={() => order.caminho_imagem && handleDownload(order.caminho_imagem, order.order_id)}
                  >
                    Baixar
                  </button>
                  <button
                    className="text-gray-600 hover:text-gray-700 text-xs md:text-sm font-medium bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                    onClick={() => order.caminho_imagem && setModalFile({ url: order.caminho_imagem, id: order.order_id })}
                  >
                    Assistir
                  </button>
                </div>
                <button
                  onClick={() => {
                    setSelectedOrderId(order.order_id);
                    setShowOrderDetails(true);
                  }}
                  className="text-orange-600 hover:text-orange-700 text-xs md:text-sm font-medium bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Ver Detalhes
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <button
                className="bg-green-500 hover:bg-green-600 text-white rounded-lg md:rounded-xl px-3 py-2 font-medium text-xs md:text-sm min-w-[70px] cursor-pointer transition-colors"
                onClick={() => {
                  console.log('Aprovando order:', order.order_id);
                  updateOrderStatus(order.order_id, "aprovado");
                }}
              >
                Aprovar
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg md:rounded-xl px-3 py-2 font-medium text-xs md:text-sm min-w-[70px] cursor-pointer transition-colors"
                onClick={() => {
                  console.log('Rejeitando order:', order.order_id);
                  updateOrderStatus(order.order_id, "rejeitado");
                }}
              >
                Recusar
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {/* Modal para assistir arquivo */}
      {modalFile && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center md:items-center md:justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalFile(null)}></div>
          <div className="relative bg-white rounded-xl md:rounded-2xl shadow-xl border border-gray-200 p-4 md:p-7 max-w-2xl w-full flex flex-col items-center opacity-100 z-10" onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 cursor-pointer text-gray-400 hover:text-gray-600 text-xl font-bold p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
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
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg md:rounded-xl px-4 py-2 font-medium text-sm md:text-base mt-2 cursor-pointer transition-colors"
              onClick={() => handleDownload(modalFile.url, modalFile.id)}
            >
              Baixar arquivo
            </button>
          </div>
        </div>
      )}

      {/* Modal de detalhes do pedido */}
      {showOrderDetails && selectedOrderId && (
        <OrderDetailsModal
          isOpen={showOrderDetails}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrderId(null);
          }}
          orderId={selectedOrderId}
        />
      )}
    </div>
  );
};

export default AproveitionAdmin;