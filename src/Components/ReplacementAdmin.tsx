// src/Components/ReplacementAdmin.tsx
"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from '@supabase/supabase-js';
import ImageModal from "./ImageModal";
import OrderDetailsModal from "./OrderDetailsModal";

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
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const getOrderStatus = (orderId: number) => {
    return localStorage.getItem(`replacement_order_${orderId}`) || "pendente";
  };

  const reloadComponent = () => {
    setRefreshKey(prev => prev + 1);
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
          const result = {
            id: troca.id,
            caminho_imagem: troca.caminho_imagem,
            id_campanha: troca.id_campanha,
            order_id: campanha?.id_order,
          };
          
          console.log('🔗 Combinando dados:', {
            troca_id: troca.id,
            troca_id_campanha: troca.id_campanha,
            campanha_encontrada: campanha,
            order_id_resultado: result.order_id
          });
          
          return result;
        });
        
        console.log('📋 Orders adaptadas:', adaptedOrders);
        setOrders(adaptedOrders);
      }
      setLoading(false);
    }
    fetchOrders();
  }, [refreshKey]);

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
        imagePath: imagePath,
        originalType: typeof arteCampanhaId 
      });

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // 1. Buscar o arte_troca_campanha para obter o caminho_imagem
      const { data: arteTroca, error: fetchTrocaError } = await supabase
        .from('arte_troca_campanha')
        .select('id, caminho_imagem')
        .eq('id_campanha', numericArteCampanhaId)
        .single();

      if (fetchTrocaError) {
        console.error('❌ Erro ao buscar arte_troca_campanha:', fetchTrocaError);
        return;
      }

      if (!arteTroca) {
        console.error('❌ Arte de troca não encontrada');
        return;
      }

      console.log('✅ Arte de troca encontrada:', arteTroca);

      // 2. Atualizar o caminho_imagem na tabela arte_campanha
      const { error: updateError } = await supabase
        .from('arte_campanha')
        .update({ caminho_imagem: arteTroca.caminho_imagem })
        .eq('id', numericArteCampanhaId);

      if (updateError) {
        console.error('❌ Erro ao atualizar arte_campanha:', updateError);
        return;
      }

      console.log('✅ Arte transferida para arte_campanha com sucesso');

      // 3. Excluir o registro de arte_troca_campanha
      const { error: deleteError } = await supabase
        .from('arte_troca_campanha')
        .delete()
        .eq('id_campanha', numericArteCampanhaId);

      if (deleteError) {
        console.error('❌ Erro ao excluir arte_troca_campanha:', deleteError);
        return;
      }

      console.log('✅ Arte_troca_campanha excluída com sucesso');

      // 4. Atualizar o localStorage e remover o card
      localStorage.setItem(`replacement_order_${numericArteCampanhaId}`, "aceita");
      setOrders(prev => prev.filter(order => order.id_campanha !== numericArteCampanhaId));
      
      console.log('📡 Disparando eventos...');
      
      // Evento storage (pode não funcionar entre abas)
      window.dispatchEvent(new Event('storage'));
      
      // Evento customizado (funciona sempre)
      window.dispatchEvent(new CustomEvent('replacementStatusChanged', {
        detail: {
          id_campanha: numericArteCampanhaId,
          status: 'aceita',
          chave: `replacement_order_${numericArteCampanhaId}`
        }
      }));
      
      console.log('✅ Troca aceita e arte transferida com sucesso!');
      
      // Recarregar o componente após sucesso
      setTimeout(() => {
        reloadComponent();
      }, 500);
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

      console.log('💾 Salvando no localStorage (rejeição):', {
        chave: `replacement_order_${orderId}`,
        valor: 'não aceita',
        id_campanha: orderId
      });
      
      // Atualizar o localStorage e remover o card
      localStorage.setItem(`replacement_order_${orderId}`, "não aceita");
      setOrders(prev => prev.filter(order => order.id_campanha !== orderId));
      
      console.log('📡 Disparando eventos (rejeição)...');
      
      // Evento storage (pode não funcionar entre abas)
      window.dispatchEvent(new Event('storage'));
      
      // Evento customizado (funciona sempre)
      window.dispatchEvent(new CustomEvent('replacementStatusChanged', {
        detail: {
          id_campanha: orderId,
          status: 'não aceita',
          chave: `replacement_order_${orderId}`
        }
      }));
      
      console.log('📡 Eventos disparados (rejeição):', {
        storage: 'disparado',
        customEvent: 'disparado com dados:',
        id_campanha: orderId,
        status: 'não aceita'
      });

      console.log('Arte rejeitada e excluída com sucesso!');
      
      // Recarregar o componente após sucesso
      setTimeout(() => {
        reloadComponent();
      }, 500);
    } catch (error) {
      console.error('Erro ao rejeitar arte:', error);
    }
  };

  if (loading) return <div className="p-4">Carregando pedidos...</div>;
  if (!orders.length) return <div className="p-4">Nenhum pedido encontrado.</div>;

  return (
    <div className="w-full h-full p-3 md:p-6 overflow-auto bg-gray-50 min-h-screen">
      <div className="mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-orange-600 mb-4 md:mb-6">
          Aprovação de Pedidos
        </h2>
      </div>
      <div className="space-y-3 md:space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 justify-between bg-white border border-gray-200 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm hover:shadow-md transition-shadow"
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
                <div className="flex items-center gap-2 md:gap-3">
                  <button
                    className="text-gray-600 hover:text-gray-700 text-xs md:text-sm font-medium bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                    onClick={() => order.caminho_imagem && handleDownload(order.caminho_imagem, order.id_campanha)}
                  >
                    Baixar
                  </button>
                  <button
                    className="text-gray-600 hover:text-gray-700 text-xs md:text-sm font-medium bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                    onClick={() => order.caminho_imagem && setModalFile({ url: order.caminho_imagem, id: order.id_campanha })}
                  >
                    Assistir
                  </button>
                </div>
                <button
                  onClick={async () => {
                    console.log('🔍 Clicando em Ver Detalhes:', { id_campanha: order.id_campanha, order: order });
                    if (order.id_campanha) {
                      try {
                        // Buscar o id_order através do id_campanha na tabela arte_campanha
                        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
                        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
                        const supabase = createClient(supabaseUrl, supabaseAnonKey);

                        const { data: arteCampanha, error } = await supabase
                          .from('arte_campanha')
                          .select('id_order')
                          .eq('id', order.id_campanha)
                          .single();

                        if (error) {
                          console.error('❌ Erro ao buscar id_order:', error);
                          return;
                        }

                        if (arteCampanha?.id_order) {
                          console.log('✅ Encontrado id_order:', arteCampanha.id_order);
                          setSelectedOrderId(arteCampanha.id_order);
                          setShowOrderDetails(true);
                        } else {
                          console.log('❌ id_order não encontrado para id_campanha:', order.id_campanha);
                        }
                      } catch (error) {
                        console.error('❌ Erro ao buscar dados:', error);
                      }
                    } else {
                      console.log('❌ id_campanha não encontrado');
                    }
                  }}
                  className="text-orange-600 hover:text-orange-700 text-xs md:text-sm font-medium bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                  disabled={!order.id_campanha}
                >
                  Ver Detalhes
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <button
                className="bg-green-500 hover:bg-green-600 text-white rounded-lg md:rounded-xl px-3 py-2 font-medium text-xs md:text-sm min-w-[70px] cursor-pointer transition-colors"
                onClick={() => handleApprove(order.id_campanha, order.caminho_imagem || "")}
              >
                Aceitar
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg md:rounded-xl px-3 py-2 font-medium text-xs md:text-sm min-w-[70px] cursor-pointer transition-colors"
                onClick={() => handleReject(order.id_campanha)}
              >
                Recusar
              </button>
            </div>
          </div>
        ))}
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
        <>
          {console.log('🎯 Renderizando OrderDetailsModal:', { showOrderDetails, selectedOrderId })}
          <OrderDetailsModal
            isOpen={showOrderDetails}
            onClose={() => {
              console.log('🚪 Fechando modal');
              setShowOrderDetails(false);
              setSelectedOrderId(null);
            }}
            orderId={selectedOrderId}
          />
        </>
      )}
    </div>
  );
};

export default ReplacementAdmin;