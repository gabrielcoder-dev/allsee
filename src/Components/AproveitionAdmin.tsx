// src/Components/AproveitionAdmin.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import OrderDetailsModal from "./OrderDetailsModal";

type OrderIdentifier = string;

interface ArteCampanhaItem {
  id: number;
  caminho_imagem: string | null;
  order_id: OrderIdentifier;
  anuncio_id: string | number | null;
  mime_type?: string | null;
  screen_type?: string | null;
}

interface GroupedOrder {
  orderId: OrderIdentifier;
  artes: ArteCampanhaItem[];
}

interface ModalFileData {
  url: string;
  id: number | string;
  orderId?: OrderIdentifier;
  anuncioName?: string | null;
}

const isVideo = (url: string) => {
  return url.match(/\.(mp4|webm|ogg)$/i) || url.startsWith("data:video");
};

const AproveitionAdmin = () => {
  const [arteCampanhas, setArteCampanhas] = useState<ArteCampanhaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalFile, setModalFile] = useState<ModalFileData | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<OrderIdentifier | null>(null);
  const [imagesModalOrderId, setImagesModalOrderId] = useState<OrderIdentifier | null>(null);
  const [orderStatuses, setOrderStatuses] = useState<Record<OrderIdentifier, string>>({});
  const [anunciosMap, setAnunciosMap] = useState<Record<string, string>>({});
  
  const getOrderStatus = (orderId: OrderIdentifier) => {
    return orderStatuses[orderId] || localStorage.getItem(`order_${orderId}`) || "pendente";
  };

  const updateOrderStatus = (orderId: OrderIdentifier, status: string) => {
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
        .select("id, caminho_imagem, id_order, id_anuncio, mime_type, screen_type")
        .order("id", { ascending: false });

      if (!error && data) {
        const adaptedOrders: ArteCampanhaItem[] = data.map((item) => ({
          id: item.id,
          caminho_imagem: item.caminho_imagem,
          order_id: item.id_order ? String(item.id_order) : String(item.id),
          anuncio_id: item.id_anuncio ?? null,
          mime_type: item.mime_type ?? null,
          screen_type: item.screen_type ?? null,
        }));
        setArteCampanhas(adaptedOrders);

        const anuncioIds = Array.from(new Set(
          adaptedOrders
            .map((item) => item.anuncio_id)
            .filter((id): id is string | number => id !== null && id !== undefined)
            .map((id) => String(id))
        ));

        if (anuncioIds.length > 0) {
          const { data: anunciosData, error: anunciosError } = await supabase
            .from('anuncios')
            .select('id, name')
            .in('id', anuncioIds);

          if (!anunciosError && anunciosData) {
            const map: Record<string, string> = {};
            anunciosData.forEach((anuncio: any) => {
              map[String(anuncio.id)] = anuncio.name || `Anúncio ${anuncio.id}`;
            });
            setAnunciosMap(map);
          }
        }
      }
      setLoading(false);
    }
    fetchOrders();
  }, []);

  const handleDownload = (url: string, filenameHint: string | number) => {
    if (!url) return;
    const filename = typeof filenameHint === 'string' ? filenameHint : `arquivo-${filenameHint}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const groupedOrders: GroupedOrder[] = useMemo(() => {
    const groups = new Map<OrderIdentifier, ArteCampanhaItem[]>();
    arteCampanhas.forEach((item) => {
      const key = item.order_id;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });

    return Array.from(groups.entries())
      .map(([orderId, artes]) => ({ orderId, artes }))
      .sort((a, b) => {
        const aLatest = Math.max(...a.artes.map((arte) => arte.id));
        const bLatest = Math.max(...b.artes.map((arte) => arte.id));
        return bLatest - aLatest;
      });
  }, [arteCampanhas]);

  if (loading) return <div className="p-4">Carregando pedidos...</div>;
  if (!groupedOrders.length) return <div className="p-4">Nenhuma arte encontrada.</div>;

  return (
    <div className="w-full h-full p-3 md:p-6 overflow-auto bg-gray-50 min-h-screen">
      <div className="mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-orange-600 mb-4 md:mb-6">
          Aprovação de Artes
        </h2>
      </div>
      <div className="space-y-3 md:space-y-4">
        {groupedOrders.filter(group => {
          const status = getOrderStatus(group.orderId);
          return status !== 'aprovado' && status !== 'rejeitado';
        }).map((group) => {
          const status = getOrderStatus(group.orderId);
          return (
          <div
            key={group.orderId}
            className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 justify-between bg-white border border-gray-200 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-orange-100 text-orange-600 rounded-lg md:rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-xs md:text-sm font-semibold">Pedido</span>
                <span className="text-sm md:text-base font-bold">#{group.orderId}</span>
                <span className="text-[10px] md:text-xs text-orange-500">{group.artes.length} arquivo(s)</span>
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 min-w-0 flex-1">
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                  <button
                    className="text-white bg-orange-500 hover:bg-orange-600 text-xs md:text-sm font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                    onClick={() => setImagesModalOrderId(group.orderId)}
                  >
                    Ver imagens
                  </button>
                  <button
                    className="text-gray-600 hover:text-gray-700 text-xs md:text-sm font-medium bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedOrderId(group.orderId);
                      setShowOrderDetails(true);
                    }}
                  >
                    Ver Detalhes
                  </button>
                </div>
                <span className="text-xs md:text-sm text-gray-500">Status atual: {status}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <button
                className="bg-green-500 hover:bg-green-600 text-white rounded-lg md:rounded-xl px-3 py-2 font-medium text-xs md:text-sm min-w-[70px] cursor-pointer transition-colors"
                onClick={() => {
                  console.log('Aprovando order:', group.orderId);
                  updateOrderStatus(group.orderId, "aprovado");
                }}
              >
                Aprovar
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg md:rounded-xl px-3 py-2 font-medium text-xs md:text-sm min-w-[70px] cursor-pointer transition-colors"
                onClick={() => {
                  console.log('Rejeitando order:', group.orderId);
                  updateOrderStatus(group.orderId, "rejeitado");
                }}
              >
                Recusar
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {/* Modal listar artes do pedido */}
      {imagesModalOrderId && (
        <div className="fixed inset-0 z-[9998] flex items-end justify-center md:items-center md:justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setImagesModalOrderId(null)}></div>
          <div className="relative bg-white rounded-xl md:rounded-2xl shadow-xl border border-gray-200 p-4 md:p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-800">Artes do pedido #{imagesModalOrderId}</h3>
                <p className="text-sm text-gray-500">Visualize e aprove as artes enviadas para este pedido.</p>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                onClick={() => setImagesModalOrderId(null)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groupedOrders.find((group) => group.orderId === imagesModalOrderId)?.artes.map((arte) => {
                const anuncioKey = arte.anuncio_id ? String(arte.anuncio_id) : null;
                const anuncioName = anuncioKey ? anunciosMap[anuncioKey] || `Anúncio ${anuncioKey}` : 'Anúncio não informado';
                const isArteVideo = arte.caminho_imagem ? isVideo(arte.caminho_imagem) : false;

                return (
                  <div key={arte.id} className="border border-gray-200 rounded-lg p-3 flex flex-col gap-3 bg-gray-50">
                    <div className="w-full h-40 bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                      {arte.caminho_imagem ? (
                        arte.caminho_imagem.startsWith("data:image") || arte.caminho_imagem.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                          <img
                            src={arte.caminho_imagem}
                            alt={`Arte ${arte.id}`}
                            className="object-cover w-full h-full"
                          />
                        ) : isArteVideo ? (
                          <video
                            src={arte.caminho_imagem}
                            className="object-cover w-full h-full"
                            controls={false}
                            preload="metadata"
                          />
                        ) : (
                          <Image
                            src={arte.caminho_imagem}
                            alt={`Arte ${arte.id}`}
                            width={320}
                            height={180}
                            className="object-cover w-full h-full"
                          />
                        )
                      ) : (
                        <span className="text-gray-400 text-sm">Sem preview disponível</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Anúncio:</p>
                        <p className="text-sm text-gray-600">{anuncioName}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                          onClick={() => arte.caminho_imagem && setModalFile({
                            url: arte.caminho_imagem,
                            id: arte.id,
                            orderId: arte.order_id,
                            anuncioName,
                          })}
                          disabled={!arte.caminho_imagem}
                        >
                          Assistir
                        </button>
                        <button
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                          onClick={() => arte.caminho_imagem && handleDownload(arte.caminho_imagem, `pedido-${arte.order_id}_anuncio-${anuncioKey ?? arte.id}`)}
                          disabled={!arte.caminho_imagem}
                        >
                          Baixar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
            {modalFile.anuncioName && (
              <p className="text-sm text-gray-500 mb-3">Anúncio: <span className="font-medium text-gray-700">{modalFile.anuncioName}</span></p>
            )}
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
              onClick={() => handleDownload(modalFile.url, modalFile.orderId ? `pedido-${modalFile.orderId}` : modalFile.id)}
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
          orderId={selectedOrderId as string}
        />
      )}
    </div>
  );
};

export default AproveitionAdmin;