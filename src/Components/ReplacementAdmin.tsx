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
  order_id?: number; // Adicionar order_id para sincronização
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
      
      // Primeiro, buscar todas as arte_troca_campanha
      const { data: trocaData, error: trocaError } = await supabase
        .from("arte_troca_campanha")
        .select("id, caminho_imagem, id_campanha")
        .order("id", { ascending: false });

      if (trocaError) {
        console.error("Erro ao buscar arte_troca_campanha:", trocaError);
        setLoading(false);
        return;
      }

      if (trocaData && trocaData.length > 0) {
        // Depois, buscar os order_id correspondentes
        const campanhaIds = trocaData.map(item => item.id_campanha);
        const { data: campanhaData, error: campanhaError } = await supabase
          .from("arte_campanha")
          .select("id, id_order")
          .in("id", campanhaIds);

        if (campanhaError) {
          console.error("Erro ao buscar arte_campanha:", campanhaError);
          setLoading(false);
          return;
        }

        // Combinar os dados
        const adaptedOrders = trocaData.map((troca) => {
          const campanha = campanhaData?.find(c => c.id === troca.id_campanha);
          return {
            id: troca.id,
            caminho_imagem: troca.caminho_imagem,
            id_campanha: troca.id_campanha,
            order_id: campanha?.id_order,
          };
        });
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

  const handleApprove = async (arteCampanhaId: number | string, imagePath: string) => {
    try {
      // Garantir que arteCampanhaId seja sempre um número
      const numericArteCampanhaId = typeof arteCampanhaId === 'string' ? parseInt(arteCampanhaId) : arteCampanhaId;
      
      console.log('🔄 Aceitando troca de arte:', { 
        arteCampanhaId: numericArteCampanhaId,
        originalType: typeof arteCampanhaId 
      });

      // Buscar o arte_troca_campanha_id correspondente
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      console.log('🔍 Buscando arte_troca_campanha no frontend:', {
        tabela: 'arte_troca_campanha',
        filtro: `id_campanha = ${numericArteCampanhaId}`,
        tipo_id: typeof numericArteCampanhaId
      });

      const { data: arteTroca, error: fetchTrocaError } = await supabase
        .from('arte_troca_campanha')
        .select('id')
        .eq('id_campanha', numericArteCampanhaId)
        .single();

      if (fetchTrocaError) {
        console.error('❌ Erro detalhado ao buscar arte_troca_campanha:', {
          error: fetchTrocaError,
          code: fetchTrocaError.code,
          message: fetchTrocaError.message,
          details: fetchTrocaError.details,
          hint: fetchTrocaError.hint,
          numericArteCampanhaId: numericArteCampanhaId,
          tipo_id: typeof numericArteCampanhaId
        });
        return;
      }

      if (!arteTroca) {
        console.error('❌ Arte de troca não encontrada no frontend');
        return;
      }

      console.log('✅ Arte de troca encontrada no frontend:', {
        id: arteTroca.id,
        id_campanha: numericArteCampanhaId
      });

      console.log('📥 IDs encontrados:', {
        arte_troca_campanha_id: arteTroca.id,
        arte_campanha_id: numericArteCampanhaId
      });

      // Usar o novo endpoint para aceitar a troca
      const response = await fetch('/api/admin/aceitar-troca', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          arte_troca_campanha_id: arteTroca.id,
          arte_campanha_id: numericArteCampanhaId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro ao aceitar troca:', errorData.error);
        return;
      }

      const data = await response.json();
      console.log('✅ Troca aceita com sucesso:', data);

      // Buscar o order_id correto para o localStorage
      const currentOrder = orders.find(order => order.id_campanha === numericArteCampanhaId);
      const orderIdForStorage = currentOrder?.order_id || numericArteCampanhaId;
      
      console.log('💾 Salvando no localStorage:', {
        chave: `replacement_order_${orderIdForStorage}`,
        valor: 'aprovado',
        orderIdForStorage,
        numericArteCampanhaId
      });
      
      // Atualizar o localStorage e remover o card
      localStorage.setItem(`replacement_order_${orderIdForStorage}`, "aprovado");
      setOrders(prev => prev.filter(order => order.id_campanha !== numericArteCampanhaId));
      
      console.log('📡 Disparando evento storage...');
      window.dispatchEvent(new Event('storage'));

      console.log('✅ Arte aprovada e transferida com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao aprovar arte:', error);
    }
  };

  const handleReject = async (orderId: number) => {
    try {
      // Excluir o registro da tabela arte_troca_campanha
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { error: deleteError } = await supabase
        .from('arte_troca_campanha')
        .delete()
        .eq('id_campanha', orderId);

      if (deleteError) {
        console.error('Erro ao excluir arte_troca_campanha:', deleteError);
        return;
      }

      // Buscar o order_id correto para o localStorage
      const currentOrder = orders.find(order => order.id_campanha === orderId);
      const orderIdForStorage = currentOrder?.order_id || orderId;
      
      console.log('💾 Salvando no localStorage (rejeição):', {
        chave: `replacement_order_${orderIdForStorage}`,
        valor: 'rejeitado',
        orderIdForStorage,
        orderId
      });
      
      // Atualizar o localStorage e remover o card
      localStorage.setItem(`replacement_order_${orderIdForStorage}`, "rejeitado");
      setOrders(prev => prev.filter(order => order.id_campanha !== orderId));
      
      console.log('📡 Disparando evento storage (rejeição)...');
      window.dispatchEvent(new Event('storage'));

      console.log('Arte rejeitada e excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao rejeitar arte:', error);
    }
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
                  const orderIdForStorage = order.order_id || order.id_campanha;
                  const currentStatus = getOrderStatus(orderIdForStorage);
                  if (currentStatus === "aprovado") {
                    localStorage.removeItem(`replacement_order_${orderIdForStorage}`);
                  } else {
                    handleApprove(order.id_campanha, order.caminho_imagem || "");
                  }
                }}
              >
                {getOrderStatus(order.order_id || order.id_campanha) === "aprovado" ? "Remover Aprovação" : "Aprovar"}
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 cursor-pointer text-white rounded-lg md:rounded-xl px-3 py-2 font-bold text-xs md:text-sm transition-colors min-w-[70px]"
                onClick={() => {
                  const orderIdForStorage = order.order_id || order.id_campanha;
                  const currentStatus = getOrderStatus(orderIdForStorage);
                  if (currentStatus === "rejeitado") {
                    localStorage.removeItem(`replacement_order_${orderIdForStorage}`);
                  } else {
                    handleReject(order.id_campanha);
                  }
                }}
              >
                {getOrderStatus(order.order_id || order.id_campanha) === "rejeitado" ? "Remover Rejeição" : "Recusar"}
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