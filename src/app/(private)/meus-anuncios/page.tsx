// src/app/(private)/meus-anuncios/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useDirectStorageUpload } from '@/hooks/useDirectStorageUpload';
import { Monitor, FileText, Download, Eye, Loader2 } from 'lucide-react';

// Função para detectar se é vídeo
const isVideo = (url: string) => {
  return url.match(/\.(mp4|webm|ogg)$/i) || url.startsWith("data:video");
};

// Função para determinar orientação baseado em screen_type
const getOrientation = (screenType: string | null | undefined): 'portrait' | 'landscape' => {
  return screenType === 'down' ? 'landscape' : 'portrait';
};

// Função para obter label da orientação
const getOrientationLabel = (orientation: 'portrait' | 'landscape'): string => {
  return orientation === 'portrait' ? 'Em pé' : 'Deitado';
};

interface ArteCampanha {
  id: number;
  caminho_imagem: string;
  order_id: string | number | null;
}

interface Order {
  id: number;
  nome_campanha: string;
  inicio_campanha: string;
  duracao_campanha: number;
  preco: number;
  alcance_campanha: number;
  exibicoes_campanha: number;
}

type ArteStatus = "em_analise" | "aceita" | "nao_aceita";

interface ArteResumo {
  id: number;
  caminho_imagem: string;
  status: ArteStatus;
  screen_type?: string | null;
}

interface AnuncioGroup {
  order_id: number;
  nome_campanha: string;
  inicio_campanha: string;
  fim_campanha: string;
  duracao_campanha_semanas: number;
  preco: number;
  status: ArteStatus;
  statusResumo: string;
  statusBadgeClass: string;
  statusDotClass: string;
  artes: ArteResumo[];
}

const MeusAnuncios = () => {
  console.log('🚀 COMPONENTE INICIANDO...');
  
  const router = useRouter();
  const [anuncios, setAnuncios] = useState<AnuncioGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  console.log('🎯 Componente MeusAnuncios renderizado - loading:', loading, 'anuncios:', anuncios.length);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAnuncioId, setSelectedAnuncioId] = useState<number | null>(null);
  const [selectedAnuncioDetails, setSelectedAnuncioDetails] = useState<AnuncioGroup | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [refresh, setRefresh] = useState(false);
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null);
  const [alcanceAtual, setAlcanceAtual] = useState<number>(0);
  const [isArtModalOpen, setIsArtModalOpen] = useState(false);
  const [selectedOrderForArts, setSelectedOrderForArts] = useState<AnuncioGroup | null>(null);
  const [selectedOrderIdForTroca, setSelectedOrderIdForTroca] = useState<number | null>(null);
  const [isTrocaModalOpen, setIsTrocaModalOpen] = useState(false);
  const [selectedScreenTypeForTroca, setSelectedScreenTypeForTroca] = useState<'portrait' | 'landscape' | null>(null);
  const [isViewArtsModalOpen, setIsViewArtsModalOpen] = useState(false);
  const [selectedScreenTypeForView, setSelectedScreenTypeForView] = useState<'portrait' | 'landscape' | null>(null);
  const [isTrocaLoading, setIsTrocaLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'anuncios' | 'notas'>('anuncios');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Hook para upload direto para storage
  const { uploadFile, progress: uploadProgress, isUploading, error: uploadError } = useDirectStorageUpload({
    chunkSizeMB: 4, // 4MB por chunk (limite Vercel 5MB, Storage 50MB)
    parallelUploads: 3,
    onProgress: (progress) => {
      console.log(`📊 Progresso do upload de troca: ${progress.percentage}% (${progress.chunksUploaded}/${progress.totalChunks} chunks)`);
    }
  });

  // Atualizar dias restantes e alcance atual a cada minuto
  useEffect(() => {
    console.log('⏰ useEffect de interval executado');
    const interval = setInterval(() => {
      if (orderDetails) {
        const dias = calcularDiasRestantes(orderDetails.inicio_campanha, orderDetails.duracao_campanha);
        setDiasRestantes(dias);
        
        if (orderDetails.alcance_campanha) {
          const alcance = calcularAlcanceAtual(
            orderDetails.alcance_campanha, 
            orderDetails.inicio_campanha, 
            orderDetails.duracao_campanha
          );
          setAlcanceAtual(alcance);
        }
      }
    }, 60000); // Atualiza a cada minuto

    return () => clearInterval(interval);
  }, [orderDetails]);

  // Buscar notas fiscais quando a aba estiver ativa
  useEffect(() => {
    if (activeTab === 'notas' && userId) {
      fetchInvoices();
    }
  }, [activeTab, userId]);

  const fetchInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const response = await fetch(`/api/asaas/invoices/list?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setInvoices(data.invoices || []);
      } else {
        toast.error(data.error || 'Erro ao carregar notas fiscais. Tente novamente mais tarde');
      }
    } catch (error: any) {
      console.error('Erro ao buscar notas fiscais:', error);
      toast.error('Erro ao carregar notas fiscais. Tente novamente mais tarde');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/asaas/invoices/download?invoiceId=${invoiceId}`);
      const data = await response.json();

      if (data.success && data.url) {
        window.open(data.url, '_blank');
        toast.success('Nota fiscal aberta');
      } else {
        toast.error(data.error || 'Erro ao baixar nota fiscal. Tente novamente');
      }
    } catch (error: any) {
      console.error('Erro ao baixar nota fiscal:', error);
      toast.error('Erro ao baixar nota fiscal. Tente novamente');
    }
  };

  useEffect(() => {
    console.log('🚀 useEffect executado - fetchAnuncios iniciando...');
    
    const handleStorageChange = () => {
      console.log('🔄 Storage event detectado, recarregando...');
      console.log('📊 Estado atual do localStorage:', {
        replacement_keys: Object.keys(localStorage).filter(key => key.startsWith('replacement_order_')),
        order_keys: Object.keys(localStorage).filter(key => key.startsWith('order_'))
      });
      setRefresh(!refresh);
    };
    
    const handleReplacementStatusChange = (event: any) => {
      console.log('🎯 Evento customizado replacementStatusChanged detectado:', event.detail);
      console.log('📊 Estado atual do localStorage após evento:', {
        replacement_keys: Object.keys(localStorage).filter(key => key.startsWith('replacement_order_')),
        order_keys: Object.keys(localStorage).filter(key => key.startsWith('order_'))
      });
      setRefresh(!refresh);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('replacementStatusChanged', handleReplacementStatusChange);
    
    const fetchAnuncios = async () => {
      console.log('🎬 INICIANDO fetchAnuncios...');
      setLoading(true);
      setError(null);
      try {
        console.log('🔐 Verificando autenticação...');
        console.log('🔗 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configurado' : 'NÃO CONFIGURADO');
        
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          console.error('❌ Erro de autenticação:', authError);
          setError(`Erro de autenticação: ${authError.message}`);
          setLoading(false);
          return;
        }

        if (!user) {
          console.log('❌ Usuário não logado');
          setError("User not logged in");
          setLoading(false);
          return;
        }

        const userId = user.id;
        setUserId(userId);
        console.log("✅ User ID:", userId);

        // Fetch arte_campanha data for the current user
        console.log('📊 Buscando arte_campanha para userId:', userId);
        
        // PRIMEIRO: Buscar apenas orders com status "pago" do usuário
        const { data: ordersPagas, error: ordersError } = await supabase
          .from('order')
          .select('id')
          .eq('status', 'pago')
          .eq('id_user', userId);

        if (ordersError) {
          console.error('❌ Erro ao buscar orders pagas:', ordersError);
          setError(ordersError.message);
          setLoading(false);
          return;
        }

        if (!ordersPagas || ordersPagas.length === 0) {
          console.log("⚠️ Nenhuma order paga encontrada para este usuário");
          setAnuncios([]);
          setLoading(false);
          return;
        }

        // Pegar apenas os IDs das orders pagas
        const orderIdsPagas = ordersPagas.map(o => o.id);
        console.log('✅ Orders pagas encontradas:', orderIdsPagas.length);
        
        // SEGUNDO: Filtrar arte_campanha do usuário que pertencem a orders pagas
        const { data: arteCampanhas, error: arteError } = await supabase
          .from("arte_campanha")
          .select(`id, caminho_imagem, order_id:id_order, screen_type`)
          .eq('id_user', userId)
          .in('id_order', orderIdsPagas);

        if (arteError) {
          console.error("❌ arteCampanhas error:", arteError);
          setError(arteError.message);
          setLoading(false);
          return;
        }

        console.log('📋 Resultado da query arte_campanha (filtrado por usuário e orders pagas):', {
          count: arteCampanhas?.length || 0,
          data: arteCampanhas
        });

        if (!arteCampanhas || arteCampanhas.length === 0) {
          console.log("⚠️ Nenhuma arte_campanha encontrada para este usuário");
          setAnuncios([]);
          setLoading(false);
          return;
        }

        console.log("✅ ArteCampanhas encontradas:", arteCampanhas.length);

         // Fetch arte_troca_campanha data for the current user
         console.log('🔄 Buscando arte_troca_campanha...');
         const { data: arteTrocaCampanhas, error: arteTrocaCampanhasError } = await supabase
         .from("arte_troca_campanha")
         .select(`id, id_campanha`);

       if (arteTrocaCampanhasError) {
         console.error("❌ arteTrocaCampanhas error:", arteTrocaCampanhasError);
         setError(arteTrocaCampanhasError.message);
         setLoading(false);
         return;
       }

       console.log('🔄 Resultado da query arte_troca_campanha:', {
         count: arteTrocaCampanhas?.length || 0,
         data: arteTrocaCampanhas
       });

        // Agrupar artes por order
        console.log('📋 Processando orders para', arteCampanhas.length, 'arteCampanhas...');
        const uniqueOrderIdsRaw = Array.from(new Set(arteCampanhas.map((arte) => arte.order_id))).filter(Boolean);
        const orderIdsForQuery = uniqueOrderIdsRaw.map((id) => {
          const numericId = Number(id);
          return Number.isNaN(numericId) ? id : numericId;
        });

        const { data: ordersData, error: ordersDataError } = await supabase
          .from("order")
          .select(`id, nome_campanha, inicio_campanha, duracao_campanha, preco`)
          .in("id", orderIdsForQuery.length > 0 ? orderIdsForQuery : [-1])
          .eq('status', 'pago');

        if (ordersDataError) {
          setError(ordersDataError.message);
          console.error("Orders error:", ordersDataError);
          setLoading(false);
          return;
        }

        const orderMap = new Map<string, Order>();
        ordersData?.forEach((order) => {
          orderMap.set(String(order.id), order as Order);
        });

        const arteCampanhasComStatus = arteCampanhas.map((arteCampanha) => {
          const orderKey = String(arteCampanha.order_id);
          const replacementStatus = localStorage.getItem(`replacement_order_${arteCampanha.id}`);
          const orderStatus = localStorage.getItem(`order_${orderKey}`);
          const hasPendingReplacement = arteTrocaCampanhas?.some((atc) => atc.id_campanha === arteCampanha.id);

          let status: ArteStatus = "em_analise";

          if (replacementStatus === "aceita") {
            status = "aceita";
          } else if (replacementStatus === "não aceita") {
            status = "nao_aceita";
          } else if (hasPendingReplacement) {
            status = "em_analise";
          } else if (orderStatus === "aprovado") {
            status = "aceita";
          } else if (orderStatus === "rejeitado") {
            status = "nao_aceita";
          }

          return {
            id: arteCampanha.id,
            caminho_imagem: arteCampanha?.caminho_imagem || "",
            orderKey,
            status,
          };
        });

        const grupos = arteCampanhasComStatus.reduce((acc, arte) => {
          if (!acc[arte.orderKey]) {
            acc[arte.orderKey] = [];
          }
          acc[arte.orderKey].push({
            id: arte.id,
            caminho_imagem: arte.caminho_imagem,
            status: arte.status,
            screen_type: arteCampanhas.find(ac => ac.id === arte.id)?.screen_type || null,
          });
          return acc;
        }, {} as Record<string, ArteResumo[]>);

        const anunciosData = Object.entries(grupos)
          .map(([orderKey, artes]) => {
            const orderInfo = orderMap.get(orderKey);

            if (!orderInfo) {
              console.warn('⚠️ Dados de order não encontrados para order_id:', orderKey);
              return null;
            }

            const fimCampanha = new Date(orderInfo.inicio_campanha);
            fimCampanha.setDate(fimCampanha.getDate() + orderInfo.duracao_campanha);
            const artesOrdenadas = [...artes]
              .sort((a, b) => b.id - a.id)
              .map((arte) => {
                const localStatus = localStorage.getItem(`replacement_order_${arte.id}`);
                if (localStatus === 'aceita') {
                  return { ...arte, status: 'aceita' as ArteStatus };
                }
                if (localStatus === 'não aceita') {
                  return { ...arte, status: 'nao_aceita' as ArteStatus };
                }
                return arte;
              });

            const resumo = summarizeArteStatuses(artesOrdenadas);

            return {
              order_id: orderInfo.id,
              nome_campanha: orderInfo.nome_campanha,
              inicio_campanha: orderInfo.inicio_campanha,
              fim_campanha: fimCampanha.toLocaleDateString(),
              duracao_campanha_semanas: orderInfo.duracao_campanha,
              preco: orderInfo.preco,
              status: resumo.status,
              statusResumo: resumo.text,
              statusBadgeClass: resumo.badgeClass,
              statusDotClass: resumo.dotClass,
              artes: artesOrdenadas,
            } as AnuncioGroup;
          })
          .filter(Boolean) as AnuncioGroup[];

        console.log('✅ Orders agrupadas:', anunciosData);
        setAnuncios(anunciosData);

      } catch (err: any) {
        console.error('❌ Erro geral no fetchAnuncios:', err);
        setError(err.message);
      } finally {
        console.log('🏁 Finalizando fetchAnuncios, setLoading(false)');
        setLoading(false);
      }
    }

    // Executar fetchAnuncios com tratamento de erro
    fetchAnuncios().catch((error) => {
      console.error('❌ Erro ao executar fetchAnuncios:', error);
      setError('Erro ao carregar anúncios: ' + error.message);
      setLoading(false);
    });
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('replacementStatusChanged', handleReplacementStatusChange);
    };
  }, [refresh]);

  useEffect(() => {
    if (isArtModalOpen && selectedOrderForArts) {
      const updatedGroup = anuncios.find((group) => group.order_id === selectedOrderForArts.order_id);
      if (updatedGroup && updatedGroup !== selectedOrderForArts) {
        setSelectedOrderForArts(updatedGroup);
      }
    }
  }, [anuncios, isArtModalOpen, selectedOrderForArts]);

  // Função para calcular dias restantes
  const calcularDiasRestantes = (inicioCampanha: string, duracaoSemanas: number) => {
    const dataInicio = new Date(inicioCampanha);
    const dataAtual = new Date();
    
    // Se ainda não chegou na data de início, retorna a duração total
    if (dataAtual < dataInicio) {
      return duracaoSemanas * 7;
    }
    
    // Converter semanas para dias
    const duracaoDias = duracaoSemanas * 7;
    
    // Calcular data de fim da campanha
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + duracaoDias);
    
    // Calcular diferença em dias
    const diferencaMs = dataFim.getTime() - dataAtual.getTime();
    const diasRestantes = Math.ceil(diferencaMs / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diasRestantes); // Retorna 0 se já passou do prazo
  };

  // Função para calcular alcance atual baseado nas horas passadas desde o início
  const calcularAlcanceAtual = (alcanceTotal: number, inicioCampanha: string, duracaoCampanha: number) => {
    const dataAtual = new Date();
    const dataInicio = new Date(inicioCampanha);
    
    // Se ainda não começou, retorna 0
    if (dataAtual < dataInicio) return 0;
    
    const duracaoDias = duracaoCampanha * 7;
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + duracaoDias);
    
    // Se já terminou, retorna o total
    if (dataAtual >= dataFim) return alcanceTotal;
    
    // Calcular horas passadas desde o início (apenas horário comercial: 7h às 17h)
    const horasPassadas = calcularHorasPassadas(dataInicio, dataAtual);
    const totalHoras = duracaoDias * 10; // 10 horas por dia
    
    const alcancePorHora = Math.floor(alcanceTotal / totalHoras);
    let resto = alcanceTotal % totalHoras;
    
    let alcanceAtual = 0;
    
    for (let i = 0; i < horasPassadas; i++) {
      let alcanceHora = alcancePorHora;
      
      // Distribuir o resto nas primeiras horas
      if (resto > 0) {
        alcanceHora += 1;
        resto--;
      }
      
      alcanceAtual += alcanceHora;
    }
    
    return alcanceAtual;
  };

  // Função para calcular exibições atual baseado nas horas passadas desde o início
  const calcularExibicoesAtual = (exibicoesTotal: number, inicioCampanha: string, duracaoCampanha: number) => {
    const dataAtual = new Date();
    const dataInicio = new Date(inicioCampanha);
    
    // Se ainda não começou, retorna 0
    if (dataAtual < dataInicio) return 0;
    
    const duracaoDias = duracaoCampanha * 7;
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + duracaoDias);
    
    // Se já terminou, retorna o total
    if (dataAtual >= dataFim) return exibicoesTotal;
    
    // Calcular horas passadas desde o início (apenas horário comercial: 7h às 17h)
    const horasPassadas = calcularHorasPassadas(dataInicio, dataAtual);
    const totalHoras = duracaoDias * 10; // 10 horas por dia
    
    const exibicoesPorHora = Math.floor(exibicoesTotal / totalHoras);
    let resto = exibicoesTotal % totalHoras;
    
    let exibicoesAtual = 0;
    
    for (let i = 0; i < horasPassadas; i++) {
      let exibicoesHora = exibicoesPorHora;
      
      // Distribuir o resto nas primeiras horas
      if (resto > 0) {
        exibicoesHora += 1;
        resto--;
      }
      
      exibicoesAtual += exibicoesHora;
    }
    
    return exibicoesAtual;
  };

  // Função para calcular horas passadas no horário comercial
  const calcularHorasPassadas = (dataInicio: Date, dataAtual: Date) => {
    let horasPassadas = 0;
    const dataAtualCalculo = new Date(dataInicio);
    
    while (dataAtualCalculo < dataAtual) {
      const diaDaSemana = dataAtualCalculo.getDay();
      const hora = dataAtualCalculo.getHours();
      
      // Só conta dias úteis (1-5) e horário comercial (7-16)
      if (diaDaSemana >= 1 && diaDaSemana <= 5 && hora >= 7 && hora < 17) {
        horasPassadas++;
      }
      
      dataAtualCalculo.setHours(dataAtualCalculo.getHours() + 1);
    }
    
    return horasPassadas;
  };

const getStatusDisplay = (status: ArteStatus) => {
  switch (status) {
    case "aceita":
      return {
        text: "Arte Aceita",
        badgeClass: "bg-green-100 text-green-700",
        dotClass: "bg-green-500",
        canRequestSwap: true,
      };
    case "nao_aceita":
      return {
        text: "Arte não aceita, por favor escolha outra.",
        badgeClass: "bg-red-100 text-red-700",
        dotClass: "bg-red-500",
        canRequestSwap: true,
      };
    default:
      return {
        text: "Arte em Análise...",
        badgeClass: "bg-yellow-100 text-yellow-700",
        dotClass: "bg-yellow-500",
        canRequestSwap: false,
      };
  }
};

const summarizeArteStatuses = (artes: ArteResumo[]) => {
  let aceitas = 0;
  let naoAceitas = 0;
  let emAnalise = 0;

  artes.forEach((arte) => {
    if (arte.status === 'aceita') aceitas++;
    else if (arte.status === 'nao_aceita') naoAceitas++;
    else emAnalise++;
  });

  if (artes.length === 0 || emAnalise === artes.length) {
    return {
      status: "em_analise" as ArteStatus,
      text: "Artes em análise...",
      badgeClass: "bg-yellow-100 text-yellow-700",
      dotClass: "bg-yellow-500",
    };
  }

  if (aceitas === artes.length) {
    return {
      status: "aceita" as ArteStatus,
      text: "Todas as artes aceitas",
      badgeClass: "bg-green-100 text-green-700",
      dotClass: "bg-green-500",
    };
  }

  if (aceitas > 0 && naoAceitas > 0) {
    return {
      status: "nao_aceita" as ArteStatus,
      text: "Arte não aceita, por favor escolha outra.",
      badgeClass: "bg-red-100 text-red-700",
      dotClass: "bg-red-500",
    };
  }

  if (aceitas > 0 && emAnalise > 0) {
    return {
      status: "em_analise" as ArteStatus,
      text: "Artes em análise...",
      badgeClass: "bg-yellow-100 text-yellow-700",
      dotClass: "bg-yellow-500",
    };
  }

  if (naoAceitas === artes.length) {
    return {
      status: "nao_aceita" as ArteStatus,
      text: "Arte não aceita, por favor escolha outra.",
      badgeClass: "bg-red-100 text-red-700",
      dotClass: "bg-red-500",
    };
  }

  if (naoAceitas > 0) {
    return {
      status: "nao_aceita" as ArteStatus,
      text: "Arte não aceita, por favor escolha outra.",
      badgeClass: "bg-red-100 text-red-700",
      dotClass: "bg-red-500",
    };
  }

  return {
    status: "em_analise" as ArteStatus,
    text: "Artes em análise...",
    badgeClass: "bg-yellow-100 text-yellow-700",
    dotClass: "bg-yellow-500",
  };
};

  const fetchOrderDetails = async (orderId: number) => {
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase
        .from('order')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Erro ao buscar detalhes da order:', error);
        setOrderDetails(null);
      } else {
        setOrderDetails(data);
        // Calcular dias restantes quando os detalhes são carregados
        if (data) {
          const dias = calcularDiasRestantes(data.inicio_campanha, data.duracao_campanha);
          setDiasRestantes(dias);
          
          if (data.alcance_campanha) {
            const alcance = calcularAlcanceAtual(
              data.alcance_campanha, 
              data.inicio_campanha, 
              data.duracao_campanha
            );
            setAlcanceAtual(alcance);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes da order:', err);
      setOrderDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Função para comprimir imagens e reduzir tempo de upload (OTIMIZADA)
  const compressImage = async (base64: string, quality: number = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');

      img.onload = () => {
        // Redimensionar mais agressivamente para arquivos grandes (mantém proporção)
        let { width, height } = img;
        const maxSize = 1600; // Reduzido de 1920 para 1600px para arquivos menores
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Desenhar imagem redimensionada
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }

        // Converter para base64 com qualidade reduzida (mais compressão)
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };

      img.onerror = () => resolve(base64); // Se der erro, retorna original
      img.src = base64;
    });
  };

  const handleTrocarArte = async () => {
    if (!selectedFile || !selectedAnuncioId || !selectedOrderIdForTroca) {
      console.error("Nenhum arquivo selecionado ou IDs necessários não definidos.");
      return;
    }

    try {
      const grupo = anuncios.find((anuncio) =>
        anuncio.order_id === selectedOrderIdForTroca
      );

      const arteSelecionada = grupo?.artes.find((arte) => arte.id === selectedAnuncioId);

      if (!grupo || !arteSelecionada) {
        console.error("Arte ou pedido não encontrados.");
        return;
      }
      
      console.log(`Trocando arte para arte_campanha.id: ${selectedAnuncioId}, order_id: ${grupo.order_id}`);

      console.log('📤 Preparando upload direto para storage (troca):', {
        order_id: grupo.order_id,
        fileName: selectedFile.name,
        fileSize: Math.round(selectedFile.size / (1024 * 1024)) + 'MB',
        fileType: selectedFile.type
      });

      // Upload direto para Storage
      console.log('🚀 Iniciando upload direto para storage (troca)...');
      const uploadResult = await uploadFile(selectedFile, 'arte-campanhas');

      if (!uploadResult) {
        throw new Error(uploadError || 'Erro ao fazer upload do arquivo de troca');
      }

      const publicUrl = uploadResult.public_url;
      console.log('✅ Arquivo de troca enviado para storage:', {
        public_url: publicUrl,
        file_path: uploadResult.file_path,
        file_size_mb: uploadResult.file_size_mb
      });

      // Criar registro de troca no banco com URL pública
      const createResponse = await fetch('/api/admin/criar-arte-troca-campanha', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          id_campanha: selectedAnuncioId,
          caminho_imagem: publicUrl // URL pública do storage
        })
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Erro ao criar registro de troca');
      }

      console.log('✅ Registro de troca criado com sucesso');

      // Remove o status do localStorage para que a arte volte para "Em Análise"
      localStorage.removeItem(`order_${grupo.order_id}`);
      localStorage.removeItem(`replacement_order_${selectedAnuncioId}`);
      
      console.log(`Removendo status do localStorage para order ${grupo.order_id} e arte ${selectedAnuncioId}`);

      console.log("Arquivo de troca enviado e registro criado com sucesso!");
      setIsModalOpen(false);
      toast.success('Arte de troca enviada com sucesso!', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
      
      // Atualizar a página para mostrar o novo status
      setRefresh(!refresh);
      setSelectedOrderIdForTroca(null);

    } catch (err: any) {
      console.error("Erro ao trocar a arte:", err);
      setError(err.message);
    }
  };




  return (
    <div className="min-h-screen">
      {/* Header fixo */}
      <div className="sticky top-0 z-10">
        <div className="px-6 py-8 max-w-4xl mx-auto bg-white">
          <Link href="/results" className="flex items-center gap-3 text-xl font-semibold text-black hover:text-gray-700 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Voltar
          </Link>
          <h1 className="text-3xl font-bold text-orange-600">Meus Anúncios</h1>
          
          {/* Tabs */}
          <div className="flex gap-2 mt-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('anuncios')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'anuncios'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Meus Anúncios
            </button>
            <button
              onClick={() => router.push('/notas-fiscais')}
              className="px-4 py-2 font-medium transition-colors flex items-center gap-2 text-gray-500 hover:text-gray-700"
            >
              <FileText className="w-4 h-4" />
              Minhas Notas Fiscais
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="px-6 py-4 max-w-4xl mx-auto">
        {activeTab === 'notas' ? (
          /* Seção de Notas Fiscais */
          <div>
            {loadingInvoices ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-12 h-12 animate-spin text-orange-600 mb-4" />
                <p className="text-gray-600">Carregando notas fiscais...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-700 mb-3 text-center">
                  Nenhuma nota fiscal encontrada
                </h2>
                <p className="text-gray-500 text-center max-w-md">
                  Suas notas fiscais aparecerão aqui quando forem geradas.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:gap-6 pb-8">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {invoice.order?.nome_campanha || 'Nota Fiscal'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            ID: {invoice.id.substring(0, 20)}...
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'AUTHORIZED' 
                            ? 'bg-green-100 text-green-800'
                            : invoice.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status === 'AUTHORIZED' ? 'Autorizada' : 
                           invoice.status === 'CANCELLED' ? 'Cancelada' : 'Pendente'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Valor</p>
                          <p className="text-lg font-semibold text-gray-900">
                            R$ {invoice.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Data de Emissão</p>
                          <p className="text-sm font-medium text-gray-900">
                            {invoice.effectiveDate 
                              ? new Date(invoice.effectiveDate).toLocaleDateString('pt-BR')
                              : '-'}
                          </p>
                        </div>
                      </div>

                      {invoice.serviceDescription && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-1">Descrição</p>
                          <p className="text-sm text-gray-700">{invoice.serviceDescription}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleDownloadInvoice(invoice.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Baixar PDF
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Seção de Anúncios (código existente) */
          <>
        {loading ? (
        <p>Carregando anúncios...</p>
      ) : error ? (
        <div className="text-center">
          <p className="text-red-500">Erro: {error}</p>
          <p className="text-sm text-gray-500 mt-2">Verifique o console para mais detalhes</p>
        </div>
      ) : anuncios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          {/* Ícone */}
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
            </svg>
          </div>
          
          {/* Mensagem principal */}
          <h2 className="text-xl font-semibold text-gray-700 mb-3 text-center">
            Você ainda não tem nenhum anúncio
          </h2>
          
          {/* Mensagem secundária */}
          <p className="text-gray-500 text-center mb-8 max-w-md">
            Comece criando sua primeira campanha para aparecer aqui.
          </p>
          
          {/* Botão */}
          <Link 
            href="/results"
            className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            criar primeira campanha
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:gap-6 pb-8">
          {anuncios.map((anuncio) => {
            const destaque = anuncio.artes[0];
            const resumoStatus = summarizeArteStatuses(anuncio.artes);
            const statusInfo = {
              ...getStatusDisplay(resumoStatus.status),
              text: resumoStatus.text,
              badgeClass: resumoStatus.badgeClass,
              dotClass: resumoStatus.dotClass,
            };
            const statusText = statusInfo.text;

            console.log(`Order ${anuncio.order_id} - Status: ${anuncio.status}, StatusText: ${statusText}`);

            const renderArtePreview = () => {
              if (!destaque || !destaque.caminho_imagem) {
                return (
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] uppercase text-gray-500">
                    Sem arte
                  </div>
                );
              }

              if (isVideo(destaque.caminho_imagem)) {
                return (
                  <video
                    src={destaque.caminho_imagem}
                    className="w-12 h-12 object-cover rounded-lg"
                    controls={false}
                    preload="metadata"
                    muted
                  />
                );
              }

              return (
                <Image
                  src={destaque.caminho_imagem}
                  alt={anuncio.nome_campanha}
                  width={60}
                  height={60}
                  className="w-12 h-12 object-cover rounded-lg"
                />
              );
            };

            return (
              <div key={anuncio.order_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Header do card */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {renderArtePreview()}
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">{anuncio.nome_campanha}</h3>
                        <p className="text-xs text-gray-500">Início: {anuncio.inicio_campanha}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-orange-600">R$ {anuncio.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-gray-500">{anuncio.duracao_campanha_semanas} semanas</p>
                    </div>
                  </div>
                </div>

                {/* Status e ações */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.badgeClass}`}>
                      <div className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`}></div>
                      {statusText}
                    </div>
                  </div>
                  
                  {/* Mensagem e botão quando arte recusada */}
                  {anuncio.status === 'nao_aceita' && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 mb-2">
                        Arte não aceita, por favor escolha outra.
                      </p>
                      <button 
                        className="w-full text-xs font-medium py-2 px-3 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedOrderForArts(anuncio);
                          setIsArtModalOpen(true);
                        }}
                      >
                        Trocar arte
                      </button>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button 
                      className="flex-1 text-xs font-medium py-2 px-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedAnuncioDetails(anuncio);
                        fetchOrderDetails(anuncio.order_id);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      Ver detalhes
                    </button>
                    <button 
                      className="flex-1 text-xs font-medium py-2 px-3 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedOrderForArts(anuncio);
                        setIsArtModalOpen(true);
                      }}
                    >
                      Ver arte(s)
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
        
        {/* Modal de Artes */}
        {isArtModalOpen && selectedOrderForArts && (() => {
          // Agrupar artes por tipo
          const artesPortrait = selectedOrderForArts.artes.filter(arte => getOrientation(arte.screen_type) === 'portrait');
          const artesLandscape = selectedOrderForArts.artes.filter(arte => getOrientation(arte.screen_type) === 'landscape');
          
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => {
              setIsArtModalOpen(false);
              setSelectedOrderForArts(null);
              setSelectedOrderIdForTroca(null);
            }}>
              <div className="bg-white rounded-2xl w-full max-w-xl mx-auto shadow-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900">Artes do pedido</h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {selectedOrderForArts.nome_campanha}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsArtModalOpen(false);
                      setSelectedOrderForArts(null);
                      setSelectedOrderIdForTroca(null);
                    }}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {/* Container Em pé */}
                {artesPortrait.length > 0 && (
                  <div className="border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-orange-50 to-white">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Em pé</h3>
                        <p className="text-xs text-gray-500">{artesPortrait.length} arte{artesPortrait.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors cursor-pointer text-sm"
                        onClick={() => {
                          setSelectedScreenTypeForView('portrait');
                          setIsViewArtsModalOpen(true);
                        }}
                      >
                        Ver artes
                      </button>
                      <button
                        className="flex-1 py-2.5 px-4 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-700 transition-colors cursor-pointer text-sm"
                        onClick={() => {
                          setSelectedScreenTypeForTroca('portrait');
                          setSelectedOrderIdForTroca(selectedOrderForArts.order_id);
                          setIsTrocaModalOpen(true);
                        }}
                      >
                        Trocar arte
                      </button>
                    </div>
                  </div>
                )}

                {/* Container Deitado */}
                {artesLandscape.length > 0 && (
                  <div className="border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-orange-50 to-white">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-orange-600 rotate-90" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Deitado</h3>
                        <p className="text-xs text-gray-500">{artesLandscape.length} arte{artesLandscape.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors cursor-pointer text-sm"
                        onClick={() => {
                          setSelectedScreenTypeForView('landscape');
                          setIsViewArtsModalOpen(true);
                        }}
                      >
                        Ver artes
                      </button>
                      <button
                        className="flex-1 py-2.5 px-4 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-700 transition-colors cursor-pointer text-sm"
                        onClick={() => {
                          setSelectedScreenTypeForTroca('landscape');
                          setSelectedOrderIdForTroca(selectedOrderForArts.order_id);
                          setIsTrocaModalOpen(true);
                        }}
                      >
                        Trocar arte
                      </button>
                    </div>
                  </div>
                )}

                {artesPortrait.length === 0 && artesLandscape.length === 0 && (
                  <div className="text-center text-gray-500 py-12">
                    Nenhuma arte encontrada para este pedido.
                  </div>
                )}
                </div>
              </div>
            </div>
          );
        })()}
        
        {/* Modal Ver Artes */}
        {isViewArtsModalOpen && selectedOrderForArts && selectedScreenTypeForView && (() => {
          const artesFiltradas = selectedOrderForArts.artes.filter(arte => 
            getOrientation(arte.screen_type) === selectedScreenTypeForView
          );
          
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => {
              setIsViewArtsModalOpen(false);
              setSelectedScreenTypeForView(null);
            }}>
              <div className="bg-white rounded-2xl w-full max-w-xl mx-auto shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                      Artes {getOrientationLabel(selectedScreenTypeForView)}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {selectedOrderForArts.nome_campanha}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsViewArtsModalOpen(false);
                      setSelectedScreenTypeForView(null);
                    }}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {artesFiltradas.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    Nenhuma arte encontrada para este tipo.
                  </div>
                ) : (
                  artesFiltradas.map((arte) => {
                    const statusInfo = getStatusDisplay(arte.status);
                    const isVideoArte = arte.caminho_imagem ? isVideo(arte.caminho_imagem) : false;
                    const isRejected = arte.status === 'nao_aceita';

                    return (
                      <div key={arte.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-gray-200 rounded-xl">
                        <div className="w-full sm:w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {arte.caminho_imagem ? (
                            isVideoArte ? (
                              <video
                                src={arte.caminho_imagem}
                                className="w-full h-full object-cover"
                                controls={false}
                                preload="metadata"
                                muted
                              />
                            ) : (
                              <Image
                                src={arte.caminho_imagem}
                                alt={`Arte ${arte.id}`}
                                width={128}
                                height={128}
                                className="w-full h-full object-cover"
                              />
                            )
                          ) : (
                            <span className="text-xs text-gray-500 uppercase">Sem arte</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 mb-2">Arte #{arte.id}</p>
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.badgeClass} mb-2`}>
                            <div className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`}></div>
                            {statusInfo.text}
                          </div>
                          {isRejected && (
                            <div className="mt-2">
                              <p className="text-sm text-red-700 mb-2">
                                Arte não aceita, por favor escolha outra.
                              </p>
                              <button
                                className="text-xs font-medium py-2 px-4 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors cursor-pointer"
                                onClick={() => {
                                  setIsViewArtsModalOpen(false);
                                  setSelectedScreenTypeForView(null);
                                  setSelectedScreenTypeForTroca(getOrientation(arte.screen_type));
                                  setSelectedOrderIdForTroca(selectedOrderForArts.order_id);
                                  setIsTrocaModalOpen(true);
                                }}
                              >
                                Trocar arte
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Modal Trocar Arte Simplificado */}
        {isTrocaModalOpen && selectedScreenTypeForTroca && selectedOrderIdForTroca && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => {
          setIsTrocaModalOpen(false);
          setSelectedScreenTypeForTroca(null);
          setSelectedOrderIdForTroca(null);
          setSelectedFile(null);
        }}>
          <div className="bg-white rounded-2xl w-full max-w-lg mx-auto shadow-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  Trocar Arte - {getOrientationLabel(selectedScreenTypeForTroca)}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Selecione uma nova arte para todos os totens {getOrientationLabel(selectedScreenTypeForTroca).toLowerCase()}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsTrocaModalOpen(false);
                  setSelectedScreenTypeForTroca(null);
                  setSelectedOrderIdForTroca(null);
                  setSelectedFile(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {/* Preview do Monitor */}
              <div className="mb-4 sm:mb-6 flex justify-center">
                <div
                  className="relative w-full"
                  style={{
                    maxWidth: selectedScreenTypeForTroca === "portrait" 
                      ? "clamp(200px, 25vw, 320px)" 
                      : "clamp(380px, 48vw, 640px)"
                  }}
                >
                  {selectedScreenTypeForTroca === "landscape" ? (
                    <svg
                      viewBox="0 0 800 470"
                      className="w-full h-auto"
                      style={{ filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.4))" }}
                    >
                      <ellipse cx="400" cy="460" rx="280" ry="15" fill="rgba(0,0,0,0.3)" />
                      <g transform="translate(50, 20)">
                        <rect x="0" y="0" width="700" height="410" rx="25" fill="#2d2d2d" />
                        <rect x="0" y="0" width="700" height="410" rx="25" fill="url(#gloss-gradient-landscape-troca)" />
                        <rect x="20" y="20" width="660" height="370" rx="18" fill="#1a1a1a" />
                        <rect x="50" y="50" width="600" height="310" rx="8" fill="#000000" />
                      </g>
                      <defs>
                        <linearGradient id="gloss-gradient-landscape-troca" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="rgba(255,255,255,0.2)" stopOpacity="0.2" />
                          <stop offset="50%" stopColor="rgba(255,255,255,0)" stopOpacity="0" />
                          <stop offset="100%" stopColor="rgba(255,255,255,0.2)" stopOpacity="0.2" />
                        </linearGradient>
                      </defs>
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 600 650"
                      className="w-full h-auto"
                      style={{ filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.4))" }}
                    >
                      <ellipse cx="300" cy="630" rx="200" ry="20" fill="rgba(0,0,0,0.3)" />
                      <g transform="translate(80, 40)">
                        <rect x="0" y="0" width="440" height="600" rx="25" fill="#2d2d2d" />
                        <rect x="0" y="0" width="440" height="600" rx="25" fill="url(#gloss-gradient-portrait-troca)" />
                        <rect x="15" y="15" width="410" height="570" rx="20" fill="#1a1a1a" />
                        <rect x="40" y="50" width="360" height="500" rx="12" fill="#000000" />
                      </g>
                      <defs>
                        <linearGradient id="gloss-gradient-portrait-troca" x1="0%" y1="0%" x2="0%" y2="30%">
                          <stop offset="0%" stopColor="rgba(255,255,255,0.3)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="rgba(255,255,255,0)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  )}
                  {selectedFile && (
                    <div
                      className="absolute transition-all"
                      style={{
                        ...(selectedScreenTypeForTroca === "portrait" ? {
                          top: "13.8%",
                          left: "20%",
                          width: "60%",
                          height: "76.9%",
                          borderRadius: "12px",
                        } : {
                          top: "14.9%",
                          left: "12.5%",
                          width: "75%",
                          height: "65.9%",
                          borderRadius: "8px",
                        }),
                        position: "absolute",
                        overflow: "hidden",
                        background: "#000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isVideo(URL.createObjectURL(selectedFile)) ? (
                        <video
                          src={URL.createObjectURL(selectedFile)}
                          className="w-full h-full object-contain"
                          controls={false}
                          muted
                        />
                      ) : (
                        <img
                          src={URL.createObjectURL(selectedFile)}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Input de arquivo */}
              <div className="mb-4 sm:mb-6">
                <label htmlFor="upload-art-troca" className="block text-sm font-medium text-gray-700 mb-3">
                  Selecionar nova arte
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    id="upload-art-troca"
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-sm focus:outline-none focus:border-orange-500 focus:bg-orange-50 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                    onChange={(e) => {
                      const file = e.target.files && e.target.files[0];
                      setSelectedFile(file || null);
                    }}
                  />
                </div>
                {selectedFile && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-green-700 font-medium">
                        {selectedFile.name}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    if (isTrocaLoading) return;
                    setIsTrocaModalOpen(false);
                    setSelectedScreenTypeForTroca(null);
                    setSelectedOrderIdForTroca(null);
                    setSelectedFile(null);
                    setIsTrocaLoading(false);
                  }}
                  disabled={isTrocaLoading}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 py-3 px-4 rounded-xl bg-orange-600 text-white font-medium hover:bg-orange-700 transition-colors cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  onClick={async () => {
                    if (!selectedFile || !selectedOrderIdForTroca || !selectedScreenTypeForTroca || isTrocaLoading) return;
                    
                    setIsTrocaLoading(true);
                    
                    // Buscar todas as artes do tipo selecionado para este pedido
                    const grupo = anuncios.find((anuncio) => anuncio.order_id === selectedOrderIdForTroca);
                    if (!grupo) {
                      setIsTrocaLoading(false);
                      return;
                    }

                    const artesDoTipo = grupo.artes.filter(arte => 
                      getOrientation(arte.screen_type) === selectedScreenTypeForTroca
                    );

                    // Para cada arte do tipo, fazer upload e criar registro de troca
                    try {
                      const uploadResult = await uploadFile(selectedFile, 'arte-campanhas');
                      if (!uploadResult) {
                        throw new Error(uploadError || 'Erro ao fazer upload do arquivo de troca');
                      }

                      // Criar registro de troca para cada arte do tipo
                      for (const arte of artesDoTipo) {
                        const createResponse = await fetch('/api/admin/criar-arte-troca-campanha', {
                          method: 'POST',
                          headers: { 
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                          },
                          body: JSON.stringify({
                            id_campanha: arte.id,
                            caminho_imagem: uploadResult.public_url
                          })
                        });

                        if (!createResponse.ok) {
                          const errorData = await createResponse.json();
                          throw new Error(errorData.error || 'Erro ao criar registro de troca');
                        }
                      }

                      // Remover status do localStorage
                      artesDoTipo.forEach(arte => {
                        localStorage.removeItem(`replacement_order_${arte.id}`);
                      });
                      localStorage.removeItem(`order_${selectedOrderIdForTroca}`);

                      toast.success('Arte de troca enviada com sucesso!', {
                        position: "top-right",
                        autoClose: 5000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        progress: undefined,
                      });

                      setIsTrocaModalOpen(false);
                      setSelectedScreenTypeForTroca(null);
                      setSelectedOrderIdForTroca(null);
                      setSelectedFile(null);
                      setRefresh(!refresh);
                    } catch (err: any) {
                      console.error("Erro ao trocar a arte:", err);
                      toast.error(err.message || 'Erro ao trocar arte', {
                        position: "top-right",
                        autoClose: 5000,
                      });
                    } finally {
                      setIsTrocaLoading(false);
                    }
                  }}
                  disabled={!selectedFile || isTrocaLoading}
                >
                  {isTrocaLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Carregando...
                    </>
                  ) : (
                    'Trocar Arte'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => {
          setIsModalOpen(false);
          setSelectedAnuncioId(null);
          setSelectedOrderIdForTroca(null);
          setSelectedFile(null);
        }}>
          <div className="bg-white rounded-2xl w-full max-w-sm mx-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header do modal */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Trocar Arte</h2>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedAnuncioId(null);
                    setSelectedOrderIdForTroca(null);
                    setSelectedFile(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Conteúdo do modal */}
            <div className="p-6">
              <div className="mb-6">
                <label htmlFor="upload-art" className="block text-sm font-medium text-gray-700 mb-3">
                  Selecionar nova arte
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    id="upload-art"
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-sm focus:outline-none focus:border-orange-500 focus:bg-orange-50 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                    onChange={(e) => {
                      const file = e.target.files && e.target.files[0];
                      setSelectedFile(file || null);
                    }}
                  />
                </div>
                {selectedFile && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-green-700 font-medium">
                        {selectedFile.name}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button 
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors cursor-pointer" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedAnuncioId(null);
                    setSelectedOrderIdForTroca(null);
                    setSelectedFile(null);
                  }}
                >
                  Cancelar
                </button>
                <button 
                  className="flex-1 py-3 px-4 rounded-xl bg-orange-600 text-white font-medium hover:bg-orange-700 transition-colors cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed" 
                  onClick={handleTrocarArte}
                  disabled={!selectedFile}
                >
                  Trocar Arte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Modal de Detalhes */}
        {isDetailsModalOpen && selectedAnuncioDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => {
          setIsDetailsModalOpen(false);
          setOrderDetails(null);
          setSelectedAnuncioDetails(null);
          setDiasRestantes(null);
          setAlcanceAtual(0);
        }}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header do modal */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Detalhes da Campanha</h2>
                <button 
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    setOrderDetails(null);
                    setSelectedAnuncioDetails(null);
                    setDiasRestantes(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Conteúdo do modal */}
            <div className="p-6">
              {loadingDetails ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  <span className="ml-3 text-gray-600">Carregando detalhes...</span>
                </div>
              ) : orderDetails ? (
                <div className="space-y-4">
                  {/* Imagem/Vídeo */}
                  <div className="flex justify-center">
                    {(() => {
                      const destaqueDetalhes = selectedAnuncioDetails.artes[0];

                      if (!destaqueDetalhes || !destaqueDetalhes.caminho_imagem) {
                        return (
                          <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500">
                            Sem arte
                          </div>
                        );
                      }

                      if (isVideo(destaqueDetalhes.caminho_imagem)) {
                        return (
                          <video
                            src={destaqueDetalhes.caminho_imagem}
                            className="w-32 h-32 object-cover rounded-lg"
                            controls
                            preload="metadata"
                          />
                        );
                      }

                      return (
                        <Image
                          src={destaqueDetalhes.caminho_imagem}
                          alt={orderDetails.nome_campanha || ''}
                          width={200}
                          height={200}
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      );
                    })()}
                  </div>

                  {/* Informações */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Nome da Campanha:</span>
                      <span className="text-sm font-semibold text-gray-900">{orderDetails.nome_campanha}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Data de Início:</span>
                      <span className="text-sm font-semibold text-gray-900">{orderDetails.inicio_campanha}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Duração:</span>
                      <span className="text-sm font-semibold text-orange-600">{orderDetails.duracao_campanha} semanas</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Dias Restantes:</span>
                      <span className={`text-sm font-semibold ${
                        diasRestantes === 0 ? 'text-red-600' : 
                        diasRestantes && diasRestantes <= 7 ? 'text-yellow-600' : 
                        diasRestantes === orderDetails.duracao_campanha * 7 ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {diasRestantes !== null ? 
                          (diasRestantes === orderDetails.duracao_campanha * 7 ? 
                            `Campanha ainda não iniciou (${diasRestantes} dias)` : 
                            `${diasRestantes} dias`) : 
                          'Calculando...'}
                      </span>
                    </div>

                    {orderDetails.alcance_campanha && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Alcance por Hora:</span>
                        <span className="text-sm font-semibold text-blue-600">
                          {alcanceAtual.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    )}

                    {orderDetails.exibicoes_campanha && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Exibições por Hora:</span>
                        <span className="text-sm font-semibold text-green-600">
                          {(() => {
                            const exibicoes = calcularExibicoesAtual(
                              orderDetails.exibicoes_campanha, 
                              orderDetails.inicio_campanha, 
                              orderDetails.duracao_campanha
                            );
                            return exibicoes.toLocaleString('pt-BR');
                          })()}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center py-3 bg-orange-50 rounded-lg px-3">
                      <span className="text-sm font-medium text-gray-600">Preço Total:</span>
                      <span className="text-lg font-bold text-orange-600">R$ {orderDetails.preco?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Erro ao carregar detalhes da campanha</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
          </>
        )}
      </div>

      <ToastContainer />
    </div>
  );
};

export default MeusAnuncios;
