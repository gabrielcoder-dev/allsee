// src/Components/AproveitionAdmin.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import OrderDetailsModal from "./OrderDetailsModal";
import { Check, X, Eye, Image as ImageIcon, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import { toast } from "sonner";

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
  const [orderInfoMap, setOrderInfoMap] = useState<Record<string, { nome_campanha?: string | null; preco?: number; inicio_campanha?: string }>>({});
  const [orderToDelete, setOrderToDelete] = useState<OrderIdentifier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'atuais' | 'trocas'>('atuais');
  const [arteTrocas, setArteTrocas] = useState<any[]>([]);
  const [loadingTrocas, setLoadingTrocas] = useState(false);
  const [ordersWithTrocas, setOrdersWithTrocas] = useState<Set<OrderIdentifier>>(new Set());
  const [totensMap, setTotensMap] = useState<Record<string, any>>({});
  const [artesComTrocaPendente, setArtesComTrocaPendente] = useState<Set<number>>(new Set());
  const [totensTrocasMap, setTotensTrocasMap] = useState<Record<number, any>>({});
  const [totensPorArteMap, setTotensPorArteMap] = useState<Record<number, any>>({});
  
  const getOrderStatus = (orderId: OrderIdentifier) => {
    if (typeof window === 'undefined') return 'pendente';
    return localStorage.getItem(`order_${orderId}`) || "pendente";
  };

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      
      // PRIMEIRO: Buscar apenas orders com status "pago"
      const { data: ordersPagas, error: ordersError } = await supabase
        .from('order')
        .select('id')
        .eq('status', 'pago');

      if (ordersError) {
        console.error('Erro ao buscar orders pagas:', ordersError);
        setLoading(false);
        return;
      }

      if (!ordersPagas || ordersPagas.length === 0) {
        setArteCampanhas([]);
        setLoading(false);
        return;
      }

      // Pegar apenas os IDs das orders pagas
      const orderIdsPagas = ordersPagas.map(o => o.id);

      // Buscar artes de campanha apenas das orders pagas
      const { data, error } = await supabase
        .from("arte_campanha")
        .select("id, caminho_imagem, id_order, id_anuncio, mime_type, screen_type")
        .in('id_order', orderIdsPagas)
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
            .select('id, nome_campanha, preco, inicio_campanha')
            .in('id', orderIdsForQuery);

          if (!ordersError && ordersData) {
            const map: Record<string, { nome_campanha?: string | null; preco?: number; inicio_campanha?: string }> = {};
            ordersData.forEach((order: any) => {
              map[String(order.id)] = { 
                nome_campanha: order.nome_campanha,
                preco: order.preco,
                inicio_campanha: order.inicio_campanha
              };
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

  // Função para formatar data
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para formatar moeda
  const formatCurrency = (value: number | undefined) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para obter badge de status
  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { color: string; icon: any; label: string } } = {
      'aprovado': { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Aprovado' },
      'rejeitado': { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Rejeitado' },
      'pendente': { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, label: 'Pendente' },
    };

    const statusInfo = statusMap[status] || { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, label: status };
    const Icon = statusInfo.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        <Icon className="w-3 h-3" />
        {statusInfo.label}
      </span>
    );
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
      // Buscar totens individuais por anuncio_id de cada arte
      const artesDoPedido = arteCampanhas.filter(arte => String(arte.id_order) === String(imagesModalOrderId));
      
      // Buscar todos os anuncio_ids únicos
      const anuncioIds = artesDoPedido
        .map(arte => arte.anuncio_id)
        .filter((id): id is string | number => id !== null && id !== undefined)
        .map(id => String(id));
      
      if (anuncioIds.length === 0) {
        setTotensMap({});
        setTotensPorArteMap({});
        return;
      }

      // Buscar totens para todos os anuncio_ids
      const { data: totensData, error } = await supabase
        .from('anuncios')
        .select('id, name, address, type_screen, screens, price, image')
        .in('id', anuncioIds);

      if (error) {
        console.error('Erro ao buscar totens:', error);
        setTotensMap({});
        setTotensPorArteMap({});
        return;
      }

      // Criar mapas: um geral e um mapeando arte.id -> totem
      const mapGeral: Record<string, any> = {};
      const mapPorArte: Record<number, any> = {};
      
      (totensData || []).forEach((totem: any) => {
        mapGeral[String(totem.id)] = totem;
        
        // Mapear cada arte para seu totem relacionado
        artesDoPedido.forEach((arte) => {
          if (arte.anuncio_id && String(arte.anuncio_id) === String(totem.id)) {
            mapPorArte[arte.id] = totem;
          }
        });
      });
      
      setTotensMap(mapGeral);
      setTotensPorArteMap(mapPorArte);
    } catch (error) {
      console.error('Erro ao buscar totens:', error);
      setTotensMap({});
      setTotensPorArteMap({});
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
      
      // 4. Buscar arte para verificar o order (ANTES de marcar no localStorage)
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
      
      // 6. Marcar arte como aceita no localStorage E marcar o order como aprovado
      if (typeof window !== 'undefined') {
        localStorage.setItem(`replacement_order_${troca.id_campanha}`, 'aceita');
        
        // Marcar o order como aprovado para que a notificação desapareça
        if (arte && arte.id_order) {
          const orderKey = String(arte.id_order_value ?? arte.id_order);
          localStorage.setItem(`order_${orderKey}`, 'aprovado');
          console.log('✅ Order marcado como aprovado no localStorage:', orderKey);
        }
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

      // 12. Disparar eventos customizados para atualizar outros componentes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('replacementStatusChanged', {
          detail: { id_campanha: troca.id_campanha, status: 'aceita' }
        }));
        
        // Disparar evento de aprovação para atualizar notificações
        if (arte && arte.id_order) {
          window.dispatchEvent(new CustomEvent('approvalStatusChanged', {
            detail: {
              orderId: arte.id_order,
              status: 'aprovado',
              id_campanha: troca.id_campanha
            }
          }));
        }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
            Aprovação de Artes
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie todas as campanhas pendentes de aprovação
          </p>
        </div>

        {/* Campanhas Table */}
        {groupedOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
            <div className="text-center">
              <p className="text-gray-500 text-lg">Nenhuma campanha encontrada.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campanha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupedOrders.map((group) => {
                    const status = getOrderStatus(group.orderId);
                    const hasPendingArt = group.artes.some(
                      (arte) => arte.statusLocal !== 'aceita' && arte.statusLocal !== 'não aceita'
                    );
                    const hasTroca = ordersWithTrocas.has(group.orderId);
                    const shouldShowDot = hasPendingArt || hasTroca;
                    
                    return (
                      <tr key={group.orderId} className="hover:bg-gray-50 relative">
                        {shouldShowDot && (
                          <span className="absolute -top-1 -left-1 inline-flex h-3 w-3 rounded-full bg-orange-500 border-2 border-white z-10"></span>
                        )}
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                          #{group.orderIdValue}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {orderInfoMap[group.orderId]?.nome_campanha || `Pedido #${group.orderId}`}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(orderInfoMap[group.orderId]?.preco)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(orderInfoMap[group.orderId]?.inicio_campanha)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getStatusBadge(status)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedOrderId(group.orderIdValue);
                                setShowOrderDetails(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                              title="Visualizar detalhes"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setImagesModalOrderId(group.orderId)}
                              className="text-green-600 hover:text-green-800 p-1 rounded transition-colors"
                              title="Ver artes"
                            >
                              <ImageIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setOrderToDelete(group.orderId)}
                              disabled={isDeleting && orderToDelete === group.orderId}
                              className="text-red-600 hover:text-red-800 p-1 rounded transition-colors disabled:opacity-50"
                              title="Excluir"
                            >
                              {isDeleting && orderToDelete === group.orderId ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Trash2 className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
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

                  // Agrupar artes por tipo de tela (screen_type)
                  const artesEmPe = artesDoPedido.filter(arte => !arte.screen_type || arte.screen_type === 'standing' || arte.screen_type === 'up');
                  const artesDeitadas = artesDoPedido.filter(arte => arte.screen_type === 'down');

                  // Função para renderizar um grupo de artes
                  const renderArtesGroup = (artes: ArteCampanhaItem[], tipoLabel: string) => {
                    if (artes.length === 0) return null;

                    // Usar a primeira arte como representativa do tipo
                    const arteRepresentativa = artes[0];
                    const anuncioKey = arteRepresentativa.anuncio_id ? String(arteRepresentativa.anuncio_id) : null;
                    const anuncioName = anuncioKey ? anunciosMap[anuncioKey] || `Anúncio ${anuncioKey}` : 'Anúncio não informado';
                    const isArteVideo = arteRepresentativa.caminho_imagem ? isVideo(arteRepresentativa.caminho_imagem) : false;
                    const temTrocaPendente = artes.some(arte => 
                      artesComTrocaPendente.has(arte.id) || 
                      artesComTrocaPendente.has(Number(arte.id)) ||
                      Array.from(artesComTrocaPendente).some(id => String(id) === String(arte.id))
                    );
                    // Verificar status: se todas estão aceitas, mostrar aceita; se alguma está recusada, mostrar recusada; senão pendente
                    const todasAceitas = artes.every(arte => arte.statusLocal === 'aceita');
                    const algumaRecusada = artes.some(arte => arte.statusLocal === 'não aceita');
                    const statusGeral = todasAceitas ? 'aceita' : algumaRecusada ? 'não aceita' : arteRepresentativa.statusLocal;

                    // Coletar todos os totens relacionados a essas artes
                    const totensRelacionados = artes
                      .map(arte => totensPorArteMap[arte.id])
                      .filter((totem): totem is any => totem != null)
                      // Remover duplicatas baseado no ID do totem
                      .filter((totem, index, self) => 
                        index === self.findIndex(t => t.id === totem.id)
                      );

                    return (
                      <div key={tipoLabel} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50 space-y-4">
                        {/* Título do tipo */}
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm sm:text-base font-semibold text-gray-800">
                            {tipoLabel}
                          </h4>
                          <span className="text-xs text-gray-500">({artes.length} arte{artes.length !== 1 ? 's' : ''})</span>
                        </div>

                        {/* Imagem representativa única - apenas 1 imagem por tipo */}
                        <div className="border border-gray-200 rounded-lg p-2 sm:p-3 flex flex-col gap-2 sm:gap-3 bg-white">
                          <div className="w-full h-48 sm:h-64 bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                            {arteRepresentativa.caminho_imagem ? (
                              arteRepresentativa.caminho_imagem.startsWith("data:image") || arteRepresentativa.caminho_imagem.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                                <img
                                  src={arteRepresentativa.caminho_imagem}
                                  alt={`Arte ${tipoLabel}`}
                                  className="object-contain w-full h-full"
                                />
                              ) : isArteVideo ? (
                                <video
                                  src={arteRepresentativa.caminho_imagem}
                                  className="object-contain w-full h-full"
                                  controls={false}
                                  preload="metadata"
                                />
                              ) : (
                                <Image
                                  src={arteRepresentativa.caminho_imagem}
                                  alt={`Arte ${tipoLabel}`}
                                  width={640}
                                  height={360}
                                  className="object-contain w-full h-full"
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
                                ) : statusGeral ? (
                                  <span
                                    className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${
                                      statusGeral === 'aceita'
                                        ? 'text-emerald-600'
                                        : 'text-red-500'
                                    }`}
                                  >
                                    {statusGeral === 'aceita'
                                      ? 'Arte aceita'
                                      : 'Arte recusada'}
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      className="p-1.5 sm:p-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
                                      onClick={() => artes.forEach(arte => handleApproveArte(arte))}
                                      aria-label="Aprovar arte"
                                    >
                                      <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                    <button
                                      className="p-1.5 sm:p-2 rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer"
                                      onClick={() => artes.forEach(arte => handleRejectArte(arte))}
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
                                onClick={() => arteRepresentativa.caminho_imagem && setModalFile({
                                  url: arteRepresentativa.caminho_imagem,
                                  id: arteRepresentativa.id,
                                  orderId: arteRepresentativa.id_order_value,
                                  anuncioName,
                                })}
                                disabled={!arteRepresentativa.caminho_imagem}
                              >
                                Assistir
                              </button>
                              <button
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                                onClick={() => arteRepresentativa.caminho_imagem && handleDownload(arteRepresentativa.caminho_imagem, `pedido-${arteRepresentativa.id_order_value}_tipo-${tipoLabel.toLowerCase().replace(' ', '-')}`)}
                                disabled={!arteRepresentativa.caminho_imagem}
                              >
                                Baixar
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Totens relacionados embaixo do container */}
                        {totensRelacionados.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-md p-2 sm:p-3 mt-2">
                            <p className="text-[10px] sm:text-xs font-semibold text-gray-700 mb-2">Totens relacionados:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                              {totensRelacionados.map((totem) => (
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
                  };

                  return (
                    <div className="space-y-4">
                      {renderArtesGroup(artesEmPe, 'Em pé')}
                      {renderArtesGroup(artesDeitadas, 'Deitado')}
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

                  // Agrupar trocas por tipo de tela (screen_type)
                  const trocasEmPe = arteTrocas.filter(troca => !troca.screen_type || troca.screen_type === 'standing' || troca.screen_type === 'up');
                  const trocasDeitadas = arteTrocas.filter(troca => troca.screen_type === 'down');

                  // Função para renderizar um grupo de trocas
                  const renderTrocasGroup = (trocas: any[], tipoLabel: string) => {
                    if (trocas.length === 0) return null;

                    // Usar a primeira troca como representativa do tipo
                    const trocaRepresentativa = trocas[0];
                    const isTrocaVideo = trocaRepresentativa.caminho_imagem ? isVideo(trocaRepresentativa.caminho_imagem) : false;

                    // Coletar todos os totens relacionados a essas trocas
                    const totensRelacionados = trocas
                      .map(troca => totensTrocasMap[troca.id] || (troca.anuncio_id && totensMap[String(troca.anuncio_id)]))
                      .filter((totem): totem is any => totem != null)
                      // Remover duplicatas baseado no ID do totem
                      .filter((totem, index, self) => 
                        index === self.findIndex(t => t.id === totem.id)
                      );

                    return (
                      <div key={tipoLabel} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50 space-y-4">
                        {/* Título do tipo */}
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm sm:text-base font-semibold text-gray-800">
                            {tipoLabel}
                          </h4>
                          <span className="text-xs text-gray-500">({trocas.length} pedido{trocas.length !== 1 ? 's' : ''} de troca)</span>
                        </div>

                        {/* Imagem representativa única - apenas 1 imagem por tipo */}
                        <div className="border border-gray-200 rounded-lg p-2 sm:p-3 flex flex-col gap-2 sm:gap-3 bg-white">
                          <div className="w-full h-48 sm:h-64 bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                            {trocaRepresentativa.caminho_imagem ? (
                              trocaRepresentativa.caminho_imagem.startsWith("data:image") || trocaRepresentativa.caminho_imagem.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                                <img
                                  src={trocaRepresentativa.caminho_imagem}
                                  alt={`Troca ${tipoLabel}`}
                                  className="object-contain w-full h-full"
                                />
                              ) : isTrocaVideo ? (
                                <video
                                  src={trocaRepresentativa.caminho_imagem}
                                  className="object-contain w-full h-full"
                                  controls={false}
                                  preload="metadata"
                                />
                              ) : (
                                <Image
                                  src={trocaRepresentativa.caminho_imagem}
                                  alt={`Troca ${tipoLabel}`}
                                  width={640}
                                  height={360}
                                  className="object-contain w-full h-full"
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
                                  onClick={() => trocas.forEach(troca => handleApproveTroca(troca))}
                                  aria-label="Aprovar trocas"
                                >
                                  <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                                <button
                                  className="p-1.5 sm:p-2 rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer"
                                  onClick={() => trocas.forEach(troca => handleRejectTroca(troca))}
                                  aria-label="Rejeitar trocas"
                                >
                                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                                onClick={() => trocaRepresentativa.caminho_imagem && setModalFile({
                                  url: trocaRepresentativa.caminho_imagem,
                                  id: trocaRepresentativa.id,
                                  orderId: imagesModalOrderId,
                                  anuncioName: trocaRepresentativa.anuncioName,
                                })}
                                disabled={!trocaRepresentativa.caminho_imagem}
                              >
                                Assistir
                              </button>
                              <button
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                                onClick={() => trocaRepresentativa.caminho_imagem && handleDownload(trocaRepresentativa.caminho_imagem, `troca-${trocaRepresentativa.id}_tipo-${tipoLabel.toLowerCase().replace(' ', '-')}`)}
                                disabled={!trocaRepresentativa.caminho_imagem}
                              >
                                Baixar
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Totens relacionados embaixo do container */}
                        {totensRelacionados.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-md p-2 sm:p-3 mt-2">
                            <p className="text-[10px] sm:text-xs font-semibold text-gray-700 mb-2">Totens relacionados:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                              {totensRelacionados.map((totem) => (
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
                  };

                  return (
                    <div className="space-y-4">
                      {renderTrocasGroup(trocasEmPe, 'Em pé')}
                      {renderTrocasGroup(trocasDeitadas, 'Deitado')}
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

                    toast.success('Campanha excluída com sucesso');
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
                    toast.error('Erro ao excluir campanha', {
                      description: error?.message || 'Tente novamente'
                    });
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