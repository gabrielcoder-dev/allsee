// src/Components/AproveitionAdmin.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import OrderDetailsModal from "./OrderDetailsModal";
import { Check, X } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";

type OrderIdentifier = string;

interface ArteCampanhaItem {
  id: number;
  caminho_imagem: string | null;
  id_order: OrderIdentifier;
  id_order_value: string | number;
  anuncio_id: string | number | null;
  mime_type?: string | null;
  screen_type?: string | null;
  statusLocal?: 'aceita' | 'não aceita';
}

interface GroupedOrder {
  orderId: OrderIdentifier;
  orderIdValue: string | number;
  artes: ArteCampanhaItem[];
}

interface ModalFileData {
  url: string;
  id: number | string;
  orderId?: string | number;
  anuncioName?: string | null;
}

const isVideo = (url: string) => {
  return url.match(/\.(mp4|webm|ogg)$/i) || url.startsWith("data:video");
};

const AproveitionAdmin = () => {
  const { refreshCounts } = useNotifications();
  const [arteCampanhas, setArteCampanhas] = useState<ArteCampanhaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalFile, setModalFile] = useState<ModalFileData | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | number | null>(null);
  const [imagesModalOrderId, setImagesModalOrderId] = useState<OrderIdentifier | null>(null);
  const [anunciosMap, setAnunciosMap] = useState<Record<string, string>>({});
  const [orderInfoMap, setOrderInfoMap] = useState<Record<string, { nome_campanha?: string | null }>>({});
  const [orderToDelete, setOrderToDelete] = useState<OrderIdentifier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'atuais' | 'trocas'>('atuais');
  const [arteTrocas, setArteTrocas] = useState<any[]>([]);
  const [loadingTrocas, setLoadingTrocas] = useState(false);
  const [ordersWithTrocas, setOrdersWithTrocas] = useState<Set<OrderIdentifier>>(new Set());
  const [totensMap, setTotensMap] = useState<Record<string, any>>({});
  const [artesComTrocaPendente, setArtesComTrocaPendente] = useState<Set<number>>(new Set());
  const [totensTrocasMap, setTotensTrocasMap] = useState<Record<number, any>>({});
  const [totensDoPedido, setTotensDoPedido] = useState<any[]>([]);
  
  const getOrderStatus = (orderId: OrderIdentifier) => {
    if (typeof window === 'undefined') return 'pendente';
    return localStorage.getItem(`order_${orderId}`) || "pendente";
  };

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      const { data, error } = await supabase
        .from("arte_campanha")
        .select("id, caminho_imagem, id_order, id_anuncio, mime_type, screen_type")
        .order("id", { ascending: false });

      if (!error && data) {
        const adaptedOrders: ArteCampanhaItem[] = data.map((item) => {
          const originalOrderId = item.id_order ?? item.id;
          const orderKey = originalOrderId !== undefined && originalOrderId !== null
            ? String(originalOrderId)
            : String(item.id);

          const orderValue = originalOrderId !== undefined && originalOrderId !== null
            ? originalOrderId
            : item.id;

          let statusLocal: ArteCampanhaItem['statusLocal'];
          if (typeof window !== 'undefined') {
            const storedStatus = localStorage.getItem(`replacement_order_${item.id}`);
            if (storedStatus === 'aceita' || storedStatus === 'não aceita') {
              statusLocal = storedStatus;
            }
          }

          return {
            id: item.id,
            caminho_imagem: item.caminho_imagem,
            id_order: orderKey,
            id_order_value: orderValue,
            anuncio_id: item.id_anuncio ?? null,
            mime_type: item.mime_type ?? null,
            screen_type: item.screen_type ?? null,
            statusLocal,
          };
        });
        setArteCampanhas(adaptedOrders);

        const anuncioIds = Array.from(new Set(
          adaptedOrders
            .map((item) => item.anuncio_id)
            .filter((id): id is string | number => id !== null && id !== undefined)
            .map((id) => String(id))
        ));

        const orderIdsRaw = Array.from(new Set(adaptedOrders.map((item) => item.id_order_value)));

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
        
        if (orderIdsRaw.length > 0) {
          const orderIdsForQuery = orderIdsRaw.map((id) => {
            if (typeof id === 'number') return id;
            const numeric = Number(id);
            return !Number.isNaN(numeric) && !String(id).includes('-') ? numeric : String(id);
          });

          const { data: ordersData, error: ordersError } = await supabase
            .from('order')
            .select('id, nome_campanha')
            .in('id', orderIdsForQuery);

          if (!ordersError && ordersData) {
            const map: Record<string, { nome_campanha?: string | null }> = {};
            ordersData.forEach((order: any) => {
              map[String(order.id)] = { nome_campanha: order.nome_campanha };
            });
            setOrderInfoMap(map);
          }
        }
      }
      setLoading(false);
    }
    fetchOrders();
  }, []);

  // Buscar pedidos de troca para sinalizar campanhas
  useEffect(() => {
    if (arteCampanhas.length === 0) return;

    const fetchTrocasForAllOrders = async () => {
      try {
        const arteIds = arteCampanhas.map(arte => arte.id);
        
        if (arteIds.length === 0) {
          setOrdersWithTrocas(new Set());
          return;
        }
        
        const { data: trocasData, error } = await supabase
          .from('arte_troca_campanha')
          .select('id, id_campanha')
          .in('id_campanha', arteIds);

        if (error) {
          console.error('Erro ao buscar pedidos de troca:', error);
          setOrdersWithTrocas(new Set());
          return;
        }

        // Mapear quais orders têm trocas pendentes
        const ordersComTrocas = new Set<OrderIdentifier>();
        
        (trocasData || []).forEach((troca) => {
          const arte = arteCampanhas.find(a => a.id === troca.id_campanha);
          if (arte) {
            ordersComTrocas.add(arte.id_order);
          }
        });

        console.log('📊 Orders com trocas atualizados:', Array.from(ordersComTrocas));
        setOrdersWithTrocas(ordersComTrocas);
      } catch (error) {
        console.error('Erro ao buscar pedidos de troca:', error);
        setOrdersWithTrocas(new Set());
      }
    };

    fetchTrocasForAllOrders();
  }, [arteCampanhas]);

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

  const updateArteStatus = (arte: ArteCampanhaItem, status: 'aceita' | 'não aceita') => {
    const arteKey = `replacement_order_${arte.id}`;

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('replacementStatusChanged', {
      detail: {
        id_campanha: arte.id,
        status,
        chave: arteKey,
      },
    }));
    window.dispatchEvent(new CustomEvent('approvalStatusChanged', {
      detail: {
        id_campanha: arte.id,
        status,
        orderId: arte.id_order,
      },
    }));

    setArteCampanhas((prev) =>
      prev.map((item) =>
        item.id === arte.id
          ? { ...item, statusLocal: status }
          : item
      )
    );
  };

  const handleApproveArte = (arte: ArteCampanhaItem) => {
    if (typeof window === 'undefined') return;

    const orderKeyRaw = arte.id_order_value ?? arte.id_order ?? arte.id;
    const orderKey = String(orderKeyRaw);

    try {
      console.log('✅ Aprovar arte', { arteId: arte.id, orderKey });

      localStorage.setItem(`order_${orderKey}`, 'aprovado');
      localStorage.setItem(`replacement_order_${arte.id}`, 'aceita');

      updateArteStatus(arte, 'aceita');
    } catch (error) {
      console.error('❌ Erro ao aprovar arte:', error);
    }
  };

  const handleRejectArte = (arte: ArteCampanhaItem) => {
    if (typeof window === 'undefined') return;

    const orderKeyRaw = arte.id_order_value ?? arte.id_order ?? arte.id;
    const orderKey = String(orderKeyRaw);

    try {
      console.log('❌ Reprovar arte', { arteId: arte.id, orderKey });

      localStorage.setItem(`order_${orderKey}`, 'rejeitado');
      localStorage.setItem(`replacement_order_${arte.id}`, 'não aceita');

      updateArteStatus(arte, 'não aceita');
    } catch (error) {
      console.error('❌ Erro ao rejeitar arte:', error);
    }
  };

  // Buscar artes de troca e totens quando o modal abrir
  useEffect(() => {
    if (imagesModalOrderId && arteCampanhas.length > 0) {
      fetchArteTrocas();
      fetchTotensForOrder();
      setActiveTab('atuais'); // Reset para aba de artes atuais quando abrir
    }
  }, [imagesModalOrderId, arteCampanhas.length]);

  const fetchTotensForOrder = async () => {
    if (!imagesModalOrderId) return;
    
    try {
      // Buscar a order para pegar todos os id_produto (totens)
      const { data: orderData, error: orderError } = await supabase
        .from('order')
        .select('id_produto')
        .eq('id', imagesModalOrderId)
        .single();

      if (orderError || !orderData) {
        console.error('Erro ao buscar order:', orderError);
        setTotensMap({});
        setTotensDoPedido([]);
        return;
      }

      // Buscar todos os totens do pedido através do id_produto
      if (orderData.id_produto) {
        const productIds = orderData.id_produto.split(',').map((id: string) => id.trim()).filter(Boolean);
        const productIdsNum = productIds.map((id: string) => {
          const parsed = Number(id);
          return Number.isNaN(parsed) ? id : parsed;
        });

        const { data: totensData, error } = await supabase
          .from('anuncios')
          .select('id, name, address, type_screen, screens, price, image')
          .in('id', productIdsNum);

        if (error) {
          console.error('Erro ao buscar totens:', error);
          setTotensMap({});
          setTotensDoPedido([]);
        } else {
          const map: Record<string, any> = {};
          (totensData || []).forEach((totem: any) => {
            map[String(totem.id)] = totem;
          });
          setTotensMap(map);
          setTotensDoPedido(totensData || []);
        }
      } else {
        setTotensMap({});
        setTotensDoPedido([]);
      }

      // Também buscar totens individuais por anuncio_id para compatibilidade
      const artesDoPedido = arteCampanhas.filter(arte => String(arte.id_order) === String(imagesModalOrderId));
      const anuncioIds = artesDoPedido
        .map(arte => arte.anuncio_id)
        .filter((id): id is string | number => id !== null && id !== undefined)
        .map(id => String(id));
      
      if (anuncioIds.length > 0) {
        const { data: totensIndividuais, error: errorIndividuais } = await supabase
          .from('anuncios')
          .select('id, name, address, type_screen, screens, price, image')
          .in('id', anuncioIds);

        if (!errorIndividuais && totensIndividuais) {
          const map: Record<string, any> = {};
          totensIndividuais.forEach((totem: any) => {
            map[String(totem.id)] = totem;
          });
          setTotensMap(prev => ({ ...prev, ...map }));
        }
      }
    } catch (error) {
      console.error('Erro ao buscar totens:', error);
      setTotensMap({});
      setTotensDoPedido([]);
    }
  };

  const fetchArteTrocas = async () => {
    if (!imagesModalOrderId) return;
    
    setLoadingTrocas(true);
    try {
      // Buscar arte_troca_campanha relacionadas às artes deste pedido
      const artesDoPedido = arteCampanhas.filter(arte => String(arte.id_order) === String(imagesModalOrderId));
      if (artesDoPedido.length === 0) {
        setArteTrocas([]);
        setTotensTrocasMap({});
        setArtesComTrocaPendente(new Set());
        setLoadingTrocas(false);
        return;
      }

      const arteIds = artesDoPedido.map(arte => arte.id);
      
      const { data: trocasData, error } = await supabase
        .from('arte_troca_campanha')
        .select('id, id_campanha, caminho_imagem')
        .in('id_campanha', arteIds);

      if (error) {
        console.error('Erro ao buscar artes de troca:', error);
        setArteTrocas([]);
        setTotensTrocasMap({});
      } else {
        // Enriquecer com dados da arte_campanha e totens
        const enrichedTrocas = await Promise.all(
          (trocasData || []).map(async (troca) => {
            console.log('🔄 Processando troca:', troca.id, 'id_campanha:', troca.id_campanha);
            
            // Buscar a arte_campanha diretamente do banco para garantir que temos os dados atualizados
            let arteOriginal: ArteCampanhaItem | null = null;
            let totemRelacionado: any = null;
            
            try {
              // Buscar arte_campanha pelo id_campanha
              const { data: arteData, error: arteError } = await supabase
                .from('arte_campanha')
                .select('id, id_anuncio, id_order, screen_type')
                .eq('id', troca.id_campanha)
                .maybeSingle();

              if (arteError) {
                console.error('❌ Erro ao buscar arte_campanha:', arteError, 'id_campanha:', troca.id_campanha);
              } else if (arteData) {
                arteOriginal = {
                  id: arteData.id,
                  caminho_imagem: null,
                  id_order: String(arteData.id_order || arteData.id),
                  id_order_value: arteData.id_order || arteData.id,
                  anuncio_id: arteData.id_anuncio ?? null,
                  mime_type: null,
                  screen_type: arteData.screen_type ?? null,
                };
                console.log('✅ Arte encontrada:', arteOriginal);
                
                // Buscar o totem usando o id_anuncio
                if (arteData.id_anuncio) {
                  const anuncioId = arteData.id_anuncio;
                  console.log('🔍 Buscando totem para anuncio_id:', anuncioId);
                  
                  const { data: totemData, error: totemError } = await supabase
                    .from('anuncios')
                    .select('id, name, address, type_screen, screens, price, image')
                    .eq('id', anuncioId)
                    .maybeSingle();

                  if (totemError) {
                    console.error('❌ Erro ao buscar totem:', totemError, 'anuncio_id:', anuncioId);
                  } else if (totemData) {
                    totemRelacionado = totemData;
                    console.log('✅ Totem encontrado:', totemData);
                  } else {
                    console.log('⚠️ Totem não encontrado para anuncio_id:', anuncioId);
                  }
                } else {
                  console.log('⚠️ Arte sem id_anuncio');
                }
              } else {
                console.log('⚠️ Arte não encontrada para id_campanha:', troca.id_campanha);
              }
            } catch (error) {
              console.error('❌ Erro ao processar troca:', error);
            }
            
            const anuncioKey = arteOriginal?.anuncio_id ? String(arteOriginal.anuncio_id) : null;
            const anuncioName = anuncioKey ? anunciosMap[anuncioKey] || `Anúncio ${anuncioKey}` : 'Anúncio não informado';
            
            return {
              ...troca,
              anuncio_id: arteOriginal?.anuncio_id || null,
              anuncioName,
              screen_type: arteOriginal?.screen_type || null,
              totemRelacionado,
            };
          })
        );
        setArteTrocas(enrichedTrocas);
        
        // Criar um mapa de totem por troca
        const totensMap: Record<number, any> = {};
        enrichedTrocas.forEach((troca) => {
          console.log('Processando troca para mapa:', troca.id, 'tem totemRelacionado:', !!troca.totemRelacionado);
          if (troca.id && troca.totemRelacionado) {
            totensMap[troca.id] = troca.totemRelacionado;
            console.log('✅ Totem adicionado ao mapa para troca:', troca.id);
          } else {
            console.log('❌ Troca sem totem:', troca.id, 'totemRelacionado:', troca.totemRelacionado);
          }
        });
        console.log('📊 TotensTrocasMap final:', totensMap);
        setTotensTrocasMap(totensMap);
        
        // Criar um Set com os IDs das artes que têm troca pendente
        const artesComTroca = new Set<number>();
        enrichedTrocas.forEach((troca) => {
          if (troca.id_campanha) {
            artesComTroca.add(troca.id_campanha);
            console.log('✅ Adicionando arte ao Set de trocas pendentes:', troca.id_campanha);
          }
        });
        console.log('📊 Set de artes com troca pendente:', Array.from(artesComTroca));
        setArtesComTrocaPendente(artesComTroca);
      }
    } catch (error) {
      console.error('Erro ao buscar artes de troca:', error);
      setArteTrocas([]);
      setArtesComTrocaPendente(new Set());
      setTotensTrocasMap({});
    } finally {
      setLoadingTrocas(false);
    }
  };

  const handleApproveTroca = async (troca: any) => {
    try {
      // 1. Atualizar caminho_imagem na arte_campanha
      const { error: updateError } = await supabase
        .from('arte_campanha')
        .update({ caminho_imagem: troca.caminho_imagem })
        .eq('id', troca.id_campanha);

      if (updateError) {
        throw new Error('Erro ao atualizar arte: ' + updateError.message);
      }

      // 2. Excluir registro de arte_troca_campanha
      const { error: deleteError } = await supabase
        .from('arte_troca_campanha')
        .delete()
        .eq('id', troca.id);

      if (deleteError) {
        throw new Error('Erro ao excluir troca: ' + deleteError.message);
      }

      // 2.1. Aguardar um pouco para garantir que a deleção foi processada no banco
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 2.2. Atualizar notificações IMEDIATAMENTE após deletar do banco
      console.log('🔄 Atualizando notificações após aprovar troca...');
      await refreshCounts();
      console.log('✅ Notificações atualizadas');

      // 3. Atualizar estado local - remover a troca aprovada
      setArteTrocas(prev => prev.filter(t => t.id !== troca.id));
      
      // 3.1. Remover arte do Set de artes com troca pendente
      setArtesComTrocaPendente(prev => {
        const newSet = new Set(prev);
        newSet.delete(troca.id_campanha);
        return newSet;
      });
      
      // 4. Buscar arte para verificar o order
      const arte = arteCampanhas.find(a => a.id === troca.id_campanha);
      
      // 5. Recarregar todas as trocas para atualizar o estado corretamente
      if (imagesModalOrderId) {
        // Buscar novamente as trocas para este pedido
        const artesDoPedido = arteCampanhas.filter(arte => String(arte.id_order) === String(imagesModalOrderId));
        const arteIds = artesDoPedido.map(arte => arte.id);
        
        const { data: trocasRestantes, error: trocasError } = await supabase
          .from('arte_troca_campanha')
          .select('id, id_campanha')
          .in('id_campanha', arteIds);

        if (!trocasError && trocasRestantes) {
          // Atualizar o Set de artes com troca pendente
          const novasArtesComTroca = new Set<number>();
          trocasRestantes.forEach((t) => {
            if (t.id_campanha) {
              novasArtesComTroca.add(t.id_campanha);
            }
          });
          setArtesComTrocaPendente(novasArtesComTroca);
          
          // Verificar se ainda há trocas para este pedido
          if (trocasRestantes.length === 0 && arte) {
            setOrdersWithTrocas(prev => {
              const newSet = new Set(prev);
              newSet.delete(arte.id_order);
              return newSet;
            });
          }
        }
      }
      
      // 6. Marcar arte como aceita no localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`replacement_order_${troca.id_campanha}`, 'aceita');
      }

      // 7. Recarregar artes atuais do banco primeiro
      const { data: arteAtualizada, error: refetchError } = await supabase
        .from("arte_campanha")
        .select("id, caminho_imagem, id_order, id_anuncio, mime_type, screen_type")
        .eq("id", troca.id_campanha)
        .single();

      if (!refetchError && arteAtualizada) {
        // Atualizar o estado local da arte com a nova imagem e status
        setArteCampanhas(prev => prev.map(arte => {
          if (arte.id === troca.id_campanha) {
            return {
              ...arte,
              caminho_imagem: arteAtualizada.caminho_imagem,
              statusLocal: 'aceita' as const,
            };
          }
          return arte;
        }));

        // Disparar eventos para atualizar outros componentes
        const arteAtualizadaObj = arteCampanhas.find(a => a.id === troca.id_campanha);
        if (arteAtualizadaObj) {
          updateArteStatus({
            ...arteAtualizadaObj,
            caminho_imagem: arteAtualizada.caminho_imagem,
          }, 'aceita');
        }
      }

      // 7. Recarregar todas as artes para garantir sincronização
      const { data: todasArtes, error: reloadError } = await supabase
        .from("arte_campanha")
        .select("id, caminho_imagem, id_order, id_anuncio, mime_type, screen_type")
        .order("id", { ascending: false });

      if (!reloadError && todasArtes) {
        const adaptedOrders: ArteCampanhaItem[] = todasArtes.map((item) => {
          const originalOrderId = item.id_order ?? item.id;
          const orderKey = originalOrderId !== undefined && originalOrderId !== null
            ? String(originalOrderId)
            : String(item.id);

          const orderValue = originalOrderId !== undefined && originalOrderId !== null
            ? originalOrderId
            : item.id;

          let statusLocal: ArteCampanhaItem['statusLocal'];
          if (typeof window !== 'undefined') {
            const storedStatus = localStorage.getItem(`replacement_order_${item.id}`);
            if (storedStatus === 'aceita' || storedStatus === 'não aceita') {
              statusLocal = storedStatus;
            }
          }

          return {
            id: item.id,
            caminho_imagem: item.caminho_imagem,
            id_order: orderKey,
            id_order_value: orderValue,
            anuncio_id: item.id_anuncio ?? null,
            mime_type: item.mime_type ?? null,
            screen_type: item.screen_type ?? null,
            statusLocal,
          };
        });
        setArteCampanhas(adaptedOrders);

        // Atualizar mapas de anúncios se necessário
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
            setAnunciosMap(prev => ({ ...prev, ...map }));
          }
        }
      }

      // 10. Atualizar ordersWithTrocas após recarregar tudo - garantir que notificação desapareça
      // Buscar todas as trocas restantes no banco
      const { data: todasTrocasRestantes, error: todasTrocasRestantesError } = await supabase
        .from('arte_troca_campanha')
        .select('id, id_campanha');

      if (!todasTrocasRestantesError && todasTrocasRestantes) {
        // Buscar todas as artes para mapear as trocas aos orders
        const { data: todasArtesParaMapear, error: todasArtesError } = await supabase
          .from('arte_campanha')
          .select('id, id_order');

        if (!todasArtesError && todasArtesParaMapear) {
          const ordersComTrocasFinais = new Set<OrderIdentifier>();
          todasTrocasRestantes.forEach((troca) => {
            const arteRelacionada = todasArtesParaMapear.find(a => a.id === troca.id_campanha);
            if (arteRelacionada && arteRelacionada.id_order) {
              ordersComTrocasFinais.add(arteRelacionada.id_order);
            }
          });
          console.log('🔔 Atualizando notificações após aprovar - Orders com trocas:', Array.from(ordersComTrocasFinais));
          setOrdersWithTrocas(ordersComTrocasFinais);
        } else {
          // Se não conseguir buscar artes, limpar notificações
          setOrdersWithTrocas(new Set());
        }
      } else {
        // Se não houver trocas, limpar notificações
        console.log('🔔 Nenhuma troca restante - limpando notificações');
        setOrdersWithTrocas(new Set());
      }

      // 11. Recarregar as trocas completas para atualizar a lista na aba "Pedidos de troca"
      if (imagesModalOrderId) {
        await fetchArteTrocas();
      }

      // 12. Disparar evento customizado para atualizar outros componentes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('replacementStatusChanged', {
          detail: { id_campanha: troca.id_campanha, status: 'aceita' }
        }));
      }

      console.log('✅ Troca aprovada com sucesso');
    } catch (error: any) {
      console.error('❌ Erro ao aprovar troca:', error);
      alert(error?.message || 'Erro ao aprovar troca');
    }
  };

  const handleRejectTroca = async (troca: any) => {
    try {
      // Excluir registro de arte_troca_campanha
      const { error: deleteError } = await supabase
        .from('arte_troca_campanha')
        .delete()
        .eq('id', troca.id);

      if (deleteError) {
        throw new Error('Erro ao excluir troca: ' + deleteError.message);
      }

      // Aguardar um pouco para garantir que a deleção foi processada no banco
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Atualizar notificações IMEDIATAMENTE após deletar do banco
      console.log('🔄 Atualizando notificações após rejeitar troca...');
      await refreshCounts();
      console.log('✅ Notificações atualizadas');

      // Atualizar estado local - remover a troca rejeitada
      setArteTrocas(prev => prev.filter(t => t.id !== troca.id));

      // Remover arte do Set de artes com troca pendente
      setArtesComTrocaPendente(prev => {
        const newSet = new Set(prev);
        newSet.delete(troca.id_campanha);
        return newSet;
      });

      // Buscar arte para verificar o order
      const arte = arteCampanhas.find(a => a.id === troca.id_campanha);
      
      // Recarregar todas as trocas para atualizar o estado corretamente
      if (imagesModalOrderId) {
        // Buscar novamente as trocas para este pedido
        const artesDoPedido = arteCampanhas.filter(arte => String(arte.id_order) === String(imagesModalOrderId));
        const arteIds = artesDoPedido.map(arte => arte.id);
        
        const { data: trocasRestantes, error: trocasError } = await supabase
          .from('arte_troca_campanha')
          .select('id, id_campanha')
          .in('id_campanha', arteIds);

        if (!trocasError && trocasRestantes) {
          // Atualizar o Set de artes com troca pendente
          const novasArtesComTroca = new Set<number>();
          trocasRestantes.forEach((t) => {
            if (t.id_campanha) {
              novasArtesComTroca.add(t.id_campanha);
            }
          });
          setArtesComTrocaPendente(novasArtesComTroca);
          
          // Verificar se ainda há trocas para este pedido
          if (trocasRestantes.length === 0 && arte) {
            setOrdersWithTrocas(prev => {
              const newSet = new Set(prev);
              newSet.delete(arte.id_order);
              return newSet;
            });
          }
        }
      }
      
      // Atualizar ordersWithTrocas verificando todas as artes
      const arteIds = arteCampanhas.map(arte => arte.id);
      const { data: todasTrocas, error: todasTrocasError } = await supabase
        .from('arte_troca_campanha')
        .select('id, id_campanha')
        .in('id_campanha', arteIds);

      if (!todasTrocasError && todasTrocas) {
        const ordersComTrocas = new Set<OrderIdentifier>();
        todasTrocas.forEach((t) => {
          const arteRelacionada = arteCampanhas.find(a => a.id === t.id_campanha);
          if (arteRelacionada) {
            ordersComTrocas.add(arteRelacionada.id_order);
          }
        });
        setOrdersWithTrocas(ordersComTrocas);
      }

      // Atualizar ordersWithTrocas após rejeitar - garantir que notificação desapareça
      // Buscar todas as trocas restantes no banco
      const { data: todasTrocasRestantes, error: todasTrocasRestantesError } = await supabase
        .from('arte_troca_campanha')
        .select('id, id_campanha');

      if (!todasTrocasRestantesError && todasTrocasRestantes) {
        // Buscar todas as artes para mapear as trocas aos orders
        const { data: todasArtesParaMapear, error: todasArtesError } = await supabase
          .from('arte_campanha')
          .select('id, id_order');

        if (!todasArtesError && todasArtesParaMapear) {
          const ordersComTrocasFinais = new Set<OrderIdentifier>();
          todasTrocasRestantes.forEach((troca) => {
            const arteRelacionada = todasArtesParaMapear.find(a => a.id === troca.id_campanha);
            if (arteRelacionada && arteRelacionada.id_order) {
              ordersComTrocasFinais.add(arteRelacionada.id_order);
            }
          });
          console.log('🔔 Atualizando notificações após rejeitar - Orders com trocas:', Array.from(ordersComTrocasFinais));
          setOrdersWithTrocas(ordersComTrocasFinais);
        } else {
          // Se não conseguir buscar artes, limpar notificações
          setOrdersWithTrocas(new Set());
        }
      } else {
        // Se não houver trocas, limpar notificações
        console.log('🔔 Nenhuma troca restante - limpando notificações');
        setOrdersWithTrocas(new Set());
      }

      // Recarregar as trocas completas para atualizar a lista na aba "Pedidos de troca"
      if (imagesModalOrderId) {
        await fetchArteTrocas();
      }

      // Disparar evento customizado para atualizar outros componentes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('replacementStatusChanged', {
          detail: { id_campanha: troca.id_campanha, status: 'não aceita' }
        }));
      }

      console.log('✅ Troca rejeitada e excluída');
    } catch (error: any) {
      console.error('❌ Erro ao rejeitar troca:', error);
      alert(error?.message || 'Erro ao rejeitar troca');
    }
  };

  const groupedOrders: GroupedOrder[] = useMemo(() => {
    const groups = new Map<OrderIdentifier, ArteCampanhaItem[]>();
    arteCampanhas.forEach((item) => {
      const key = item.id_order;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });

    return Array.from(groups.entries())
      .map(([orderId, artes]) => ({
        orderId,
        orderIdValue: artes[0]?.id_order_value ?? orderId,
        artes,
      }))
      .sort((a, b) => {
        const aLatest = Math.max(...a.artes.map((arte) => arte.id));
        const bLatest = Math.max(...b.artes.map((arte) => arte.id));
        return bLatest - aLatest;
      });
  }, [arteCampanhas]);

  if (loading) return <div className="p-4">Carregando pedidos...</div>;
  if (!groupedOrders.length) return <div className="p-4">Nenhuma arte encontrada.</div>;

  return (
    <div className="w-full h-full p-2 sm:p-3 md:p-4 lg:p-6 overflow-auto bg-gray-50 min-h-screen">
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-600 mb-3 sm:mb-4 md:mb-6">
          Aprovação de Artes
        </h2>
      </div>
      <div className="space-y-2 sm:space-y-3 md:space-y-4">
        {groupedOrders.map((group) => {
          const status = getOrderStatus(group.orderId);
          const hasPendingArt = group.artes.some(
            (arte) => arte.statusLocal !== 'aceita' && arte.statusLocal !== 'não aceita'
          );
          const hasTroca = ordersWithTrocas.has(group.orderId);
          const shouldShowDot = hasPendingArt || hasTroca;
          return (
            <div
              key={group.orderId}
              className="relative flex flex-col gap-2 sm:gap-3 md:gap-4 justify-between bg-white border border-gray-200 rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              {shouldShowDot && (
                <span className="absolute -top-1 -left-1 inline-flex h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-orange-500 border-2 border-white"></span>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="text-[10px] sm:text-xs md:text-sm uppercase tracking-wide text-gray-400">Campanha</span>
                  <span className="text-sm sm:text-base md:text-lg font-semibold text-gray-800 truncate max-w-full">
                    {orderInfoMap[group.orderId]?.nome_campanha || `Pedido #${group.orderId}`}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-[10px] sm:text-xs text-gray-500">{group.artes.length} arquivo(s)</span>
                    <span className="text-[10px] sm:text-xs text-gray-500">Status: {status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <button
                    className="text-white bg-orange-500 hover:bg-orange-600 text-[10px] sm:text-xs md:text-sm font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg cursor-pointer transition-colors whitespace-nowrap"
                    onClick={() => setImagesModalOrderId(group.orderId)}
                  >
                    Ver imagens
                  </button>
                  <button
                    className="text-gray-600 hover:text-gray-700 text-[10px] sm:text-xs md:text-sm font-medium bg-gray-100 hover:bg-gray-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg cursor-pointer transition-colors whitespace-nowrap"
                    onClick={() => {
                      setSelectedOrderId(group.orderIdValue);
                      setShowOrderDetails(true);
                    }}
                  >
                    Ver Detalhes
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white rounded-md sm:rounded-lg md:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 font-medium text-[10px] sm:text-xs md:text-sm cursor-pointer transition-colors flex items-center gap-1 sm:gap-2 whitespace-nowrap"
                    onClick={() => setOrderToDelete(group.orderId)}
                    title="Excluir pedido"
                  >
                    <span className="font-semibold text-sm sm:text-base">×</span>
                    <span className="hidden sm:inline">Excluir campanha</span>
                    <span className="sm:hidden">Excluir</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal listar artes do pedido */}
      {imagesModalOrderId && (
        <div className="fixed inset-0 z-[9998] flex items-end justify-center md:items-center md:justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setImagesModalOrderId(null)}></div>
          <div className="relative bg-white rounded-t-xl md:rounded-xl lg:rounded-2xl shadow-xl border border-gray-200 max-w-2xl w-full max-h-[75vh] md:max-h-[70vh] overflow-hidden flex flex-col z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">
                  Artes da Campanha {orderInfoMap[imagesModalOrderId]?.nome_campanha || `#${imagesModalOrderId}`}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Visualize e aprove as artes enviadas para esta campanha.</p>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer flex-shrink-0"
                onClick={() => setImagesModalOrderId(null)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 flex-shrink-0">
              <button
                onClick={() => setActiveTab('atuais')}
                className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm transition-colors flex-1 sm:flex-none ${
                  activeTab === 'atuais'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Artes atuais
              </button>
              <button
                onClick={() => setActiveTab('trocas')}
                className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm transition-colors flex-1 sm:flex-none relative ${
                  activeTab === 'trocas'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pedidos de troca
                {arteTrocas.length > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-orange-500 border-2 border-white"></span>
                )}
              </button>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4 md:p-6 overflow-y-auto flex-1">
              {activeTab === 'atuais' ? (
                (() => {
                  const artesDoPedido = groupedOrders.find((group) => group.orderId === imagesModalOrderId)?.artes || [];
                  if (artesDoPedido.length === 0) {
                    return <div className="text-center py-8 text-gray-500">Nenhuma arte encontrada.</div>;
                  }

                  return (
                    <div className="space-y-4">
                      {/* Grid de imagens */}
                      <div className={`grid gap-3 sm:gap-4 ${artesDoPedido.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {artesDoPedido.map((arte) => {
                          const anuncioKey = arte.anuncio_id ? String(arte.anuncio_id) : null;
                          const anuncioName = anuncioKey ? anunciosMap[anuncioKey] || `Anúncio ${anuncioKey}` : 'Anúncio não informado';
                          const isArteVideo = arte.caminho_imagem ? isVideo(arte.caminho_imagem) : false;
                          const temTrocaPendente = artesComTrocaPendente.has(arte.id) || 
                                                   artesComTrocaPendente.has(Number(arte.id)) ||
                                                   Array.from(artesComTrocaPendente).some(id => String(id) === String(arte.id));

                          return (
                            <div key={arte.id} className="border border-gray-200 rounded-lg p-2 sm:p-3 flex flex-col gap-2 sm:gap-3 bg-gray-50">
                              <div className="w-full h-32 sm:h-40 bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
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
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {temTrocaPendente ? (
                                      <span className="text-xs sm:text-sm font-semibold text-orange-600 whitespace-nowrap">
                                        Troca pendente
                                      </span>
                                    ) : arte.statusLocal ? (
                                      <span
                                        className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${
                                          arte.statusLocal === 'aceita'
                                            ? 'text-emerald-600'
                                            : 'text-red-500'
                                        }`}
                                      >
                                        {arte.statusLocal === 'aceita'
                                          ? 'Arte aceita'
                                          : 'Arte recusada'}
                                      </span>
                                    ) : (
                                      <>
                                        <button
                                          className="p-1.5 sm:p-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
                                          onClick={() => handleApproveArte(arte)}
                                          aria-label="Aprovar arte"
                                        >
                                          <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                                        </button>
                                        <button
                                          className="p-1.5 sm:p-2 rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer"
                                          onClick={() => handleRejectArte(arte)}
                                          aria-label="Reprovar arte"
                                        >
                                          <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                                    onClick={() => arte.caminho_imagem && setModalFile({
                                      url: arte.caminho_imagem,
                                      id: arte.id,
                                      orderId: arte.id_order_value,
                                      anuncioName,
                                    })}
                                    disabled={!arte.caminho_imagem}
                                  >
                                    Assistir
                                  </button>
                                  <button
                                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                                    onClick={() => arte.caminho_imagem && handleDownload(arte.caminho_imagem, `pedido-${arte.id_order_value}_anuncio-${anuncioKey ?? arte.id}`)}
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
                      
                      {/* Todos os totens relacionados - aparece apenas uma vez abaixo do grid */}
                      {totensDoPedido.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-md p-2 sm:p-3">
                          <p className="text-[10px] sm:text-xs font-semibold text-gray-700 mb-1.5">Totens relacionados:</p>
                          <div className="space-y-2">
                            {totensDoPedido.map((totem) => (
                              <div key={totem.id} className="flex items-start gap-2">
                                {totem.image && (
                                  <img
                                    src={totem.image}
                                    alt={totem.name}
                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-md object-cover flex-shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{totem.name}</p>
                                  <p className="text-[10px] sm:text-xs text-gray-600 truncate">{totem.address}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {totem.type_screen && (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                        totem.type_screen.toLowerCase() === 'impresso'
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-purple-100 text-purple-700'
                                      }`}>
                                        {totem.type_screen.toLowerCase() === 'impresso' ? 'Impresso' : 'Digital'}
                                      </span>
                                    )}
                                    {totem.screens && (
                                      <span className="text-[10px] text-gray-500">
                                        {totem.screens} tela(s)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                (() => {
                  if (loadingTrocas) {
                    return <div className="text-center py-8 text-gray-500 text-sm sm:text-base">Carregando pedidos de troca...</div>;
                  }
                  if (arteTrocas.length === 0) {
                    return <div className="text-center py-8 text-gray-500 text-sm sm:text-base">Nenhum pedido de troca encontrado.</div>;
                  }

                  return (
                    <div className="space-y-4">
                      {/* Grid de trocas */}
                      <div className={`grid gap-3 sm:gap-4 ${arteTrocas.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {arteTrocas.map((troca) => {
                          const isTrocaVideo = troca.caminho_imagem ? isVideo(troca.caminho_imagem) : false;
                          const totem = totensTrocasMap[troca.id] || (troca.anuncio_id && totensMap[String(troca.anuncio_id)]);

                          return (
                            <div key={troca.id} className="border border-gray-200 rounded-lg p-2 sm:p-3 flex flex-col gap-2 sm:gap-3 bg-gray-50">
                              <div className="w-full h-32 sm:h-40 bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                                {troca.caminho_imagem ? (
                                  troca.caminho_imagem.startsWith("data:image") || troca.caminho_imagem.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                                    <img
                                      src={troca.caminho_imagem}
                                      alt={`Troca ${troca.id}`}
                                      className="object-cover w-full h-full"
                                    />
                                  ) : isTrocaVideo ? (
                                    <video
                                      src={troca.caminho_imagem}
                                      className="object-cover w-full h-full"
                                      controls={false}
                                      preload="metadata"
                                    />
                                  ) : (
                                    <Image
                                      src={troca.caminho_imagem}
                                      alt={`Troca ${troca.id}`}
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
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                      className="p-1.5 sm:p-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
                                      onClick={() => handleApproveTroca(troca)}
                                      aria-label="Aprovar troca"
                                    >
                                      <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                    <button
                                      className="p-1.5 sm:p-2 rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer"
                                      onClick={() => handleRejectTroca(troca)}
                                      aria-label="Rejeitar troca"
                                    >
                                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                                    onClick={() => troca.caminho_imagem && setModalFile({
                                      url: troca.caminho_imagem,
                                      id: troca.id,
                                      orderId: imagesModalOrderId,
                                      anuncioName: troca.anuncioName,
                                    })}
                                    disabled={!troca.caminho_imagem}
                                  >
                                    Assistir
                                  </button>
                                  <button
                                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                                    onClick={() => troca.caminho_imagem && handleDownload(troca.caminho_imagem, `troca-${troca.id}_anuncio-${troca.anuncio_id ?? troca.id}`)}
                                    disabled={!troca.caminho_imagem}
                                  >
                                    Baixar
                                  </button>
                                </div>
                                {/* Totem relacionado */}
                                {totem && (
                                  <div className="bg-white border border-gray-200 rounded-md p-2 sm:p-3 mt-1">
                                    <p className="text-[10px] sm:text-xs font-semibold text-gray-700 mb-1.5">Totem relacionado:</p>
                                    <div className="flex items-start gap-2">
                                      {totem.image && (
                                        <img
                                          src={totem.image}
                                          alt={totem.name}
                                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-md object-cover flex-shrink-0"
                                        />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{totem.name}</p>
                                        <p className="text-[10px] sm:text-xs text-gray-600 truncate">{totem.address}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                          {totem.type_screen && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                              totem.type_screen.toLowerCase() === 'impresso'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-purple-100 text-purple-700'
                                            }`}>
                                              {totem.type_screen.toLowerCase() === 'impresso' ? 'Impresso' : 'Digital'}
                                            </span>
                                          )}
                                          {troca.screen_type && (
                                            <span className="text-[10px] text-gray-500">
                                              {troca.screen_type === 'down' ? 'Deitado' : 'Em pé'}
                                            </span>
                                          )}
                                          {totem.screens && (
                                            <span className="text-[10px] text-gray-500">
                                              {totem.screens} tela(s)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para assistir arquivo */}
      {modalFile && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center md:items-center md:justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalFile(null)}></div>
          <div className="relative bg-white rounded-t-xl md:rounded-xl lg:rounded-2xl shadow-xl border border-gray-200 p-3 sm:p-4 md:p-7 max-w-2xl w-full flex flex-col items-center opacity-100 z-10 max-h-[95vh] md:max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 cursor-pointer text-gray-400 hover:text-gray-600 text-xl font-bold p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
              onClick={() => setModalFile(null)}
              aria-label="Fechar"
            >
              ×
            </button>
            {modalFile.anuncioName && (
              <p className="text-xs sm:text-sm text-gray-500 mb-3 text-center w-full">Anúncio: <span className="font-medium text-gray-700">{modalFile.anuncioName}</span></p>
            )}
            <div className="w-full flex justify-center mb-4">
              {modalFile.url.startsWith("data:image") || modalFile.url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                <img
                  src={modalFile.url}
                  alt={`Arquivo do pedido ${modalFile.id}`}
                  className="object-contain max-h-[250px] sm:max-h-[300px] md:max-h-[400px] w-auto rounded shadow-lg"
                />
              ) : isVideo(modalFile.url) ? (
                <video
                  src={modalFile.url}
                  controls
                  className="object-contain max-h-[250px] sm:max-h-[300px] md:max-h-[400px] w-full rounded shadow-lg"
                  autoPlay
                />
              ) : (
                <Image
                  src={modalFile.url}
                  alt={`Arquivo do pedido ${modalFile.id}`}
                  width={400}
                  height={400}
                  className="object-contain max-h-[250px] sm:max-h-[300px] md:max-h-[400px] w-auto rounded shadow-lg"
                />
              )}
            </div>
            <button
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg md:rounded-xl px-4 sm:px-6 py-2 font-medium text-xs sm:text-sm md:text-base mt-2 cursor-pointer transition-colors w-full sm:w-auto"
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

      {/* Modal de confirmação de exclusão */}
      {orderToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isDeleting && setOrderToDelete(null)}></div>
          <div className="relative bg-white rounded-lg sm:rounded-xl shadow-xl border border-gray-200 p-4 sm:p-5 md:p-7 max-w-md w-full z-10">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-2 sm:mb-3">
              Excluir Campanha {orderInfoMap[orderToDelete]?.nome_campanha || `#${orderToDelete}`}
            </h3>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-4">
              Tem certeza que deseja excluir esta campanha?
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto"
                onClick={() => !isDeleting && setOrderToDelete(null)}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto"
                onClick={async () => {
                  if (!orderToDelete || isDeleting) return;
                  setIsDeleting(true);
                  try {
                    const targetGroup = groupedOrders.find((group) => group.orderId === orderToDelete);
                    const rawOrderId = targetGroup?.orderIdValue ?? orderToDelete;

                    const response = await fetch('/api/admin/delete-order', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orderId: rawOrderId }),
                    });

                    const result = await response.json().catch(() => ({}));

                    if (!response.ok || !result.success) {
                      throw new Error(result.error || 'Erro ao excluir pedido');
                    }

                    setArteCampanhas((prev) => prev.filter((arte) => arte.id_order !== orderToDelete));

                    if (typeof window !== 'undefined') {
                      localStorage.removeItem(`order_${orderToDelete}`);
                      window.dispatchEvent(new CustomEvent('approvalStatusChanged', {
                        detail: {
                          orderId: orderToDelete,
                          status: 'excluido',
                          chave: `order_${orderToDelete}`,
                        },
                      }));
                    }

                    if (imagesModalOrderId === orderToDelete) {
                      setImagesModalOrderId(null);
                    }
                    if (selectedOrderId === rawOrderId) {
                      setSelectedOrderId(null);
                      setShowOrderDetails(false);
                    }
                    if (modalFile?.orderId === rawOrderId) {
                      setModalFile(null);
                    }
                  } catch (error: any) {
                    console.error('❌ Erro ao excluir pedido:', error);
                    alert(error?.message || 'Erro ao excluir pedido. Tente novamente.');
                  } finally {
                    setIsDeleting(false);
                    setOrderToDelete(null);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AproveitionAdmin;