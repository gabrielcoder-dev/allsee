"use client"

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { createClient } from '@supabase/supabase-js';
import OrderDetailsModal from "./OrderDetailsModal";

// Função para detectar se é vídeo
const isVideo = (url: string) => {
  return url.match(/\.(mp4|webm|ogg)$/i) || url.startsWith("data:video");
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ArteCampanha {
  id: number;
  caminho_imagem: string | null;
  id_order: string | number;
  screen_type?: string | null;
  mime_type?: string | null;
}

interface OrderDetails {
  id: number;
  nome_campanha: string;
  inicio_campanha: string;
  duracao_campanha: number;
  exibicoes_campanha: number;
  alcance_campanha: number;
}

interface CampanhaAgrupada {
  orderId: string | number;
  order: OrderDetails;
  artes: ArteCampanha[];
}

const ProgressAdmin = () => {
  const [campanhasAgrupadas, setCampanhasAgrupadas] = useState<CampanhaAgrupada[]>([]);
  const [loading, setLoading] = useState(true);
  const [exibicoesAtuais, setExibicoesAtuais] = useState<{ [key: string | number]: number }>({});
  const [alcanceAtual, setAlcanceAtual] = useState<{ [key: string | number]: number }>({});
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | string | null>(null);
  const [modalArtesOrderId, setModalArtesOrderId] = useState<string | number | null>(null);
  const [modalFile, setModalFile] = useState<{ url: string; id: number | string; orderId?: string | number; anuncioName?: string | null } | null>(null);

  // Função para calcular dias restantes (mesma lógica do meus-anuncios)
  const calcularDiasRestantes = (inicioCampanha: string, duracaoSemanas: number) => {
    const dataInicio = new Date(inicioCampanha);
    const dataAtual = new Date();
    
    // Se ainda não chegou na data de início, retorna a duração total
    if (dataAtual < dataInicio) {
      return duracaoSemanas * 7;
    }
    
    // Converter semanas para dias
    const duracaoDias = duracaoSemanas * 7;
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + duracaoDias);
    
    // Calcular diferença em dias
    const diferencaMs = dataFim.getTime() - dataAtual.getTime();
    const diasRestantes = Math.ceil(diferencaMs / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diasRestantes); // Retorna 0 se já passou do prazo
  };

  // Função para calcular exibições dinâmicas baseadas no horário comercial
  const calcularExibicoesDinamicas = (inicioCampanha: string, duracaoSemanas: number) => {
    const dataInicio = new Date(inicioCampanha);
    const dataAtual = new Date();
    
    // Definir o início real da campanha como 7h do dia de início
    const inicioReal = new Date(dataInicio);
    inicioReal.setHours(7, 0, 0, 0); // 7h da manhã do dia de início
    
    // Se ainda não chegou às 7h do dia de início, retorna 0
    if (dataAtual < inicioReal) return 0;
    
    const duracaoDias = duracaoSemanas * 7;
    const dataFim = new Date(inicioReal);
    dataFim.setDate(dataFim.getDate() + duracaoDias);
    
    // Se já terminou, retorna o total máximo possível
    if (dataAtual >= dataFim) {
      return duracaoDias * 10 * 9; // 10 horas por dia × 9 exibições por hora × dias
    }
    
    let exibicoesTotal = 0;
    const dataCalculo = new Date(inicioReal);
    
    // Percorrer cada dia desde o início real (7h) até hoje
    while (dataCalculo <= dataAtual && dataCalculo < dataFim) {
      const diaAtual = new Date(dataCalculo);
      const hoje = new Date(dataAtual);
      
      // Verificar se é o dia atual
      const isDiaAtual = diaAtual.toDateString() === hoje.toDateString();
      
      if (isDiaAtual) {
        // Para o dia atual, calcular apenas as horas já passadas (7h às 17h)
        const horaAtual = hoje.getHours();
        
        // Horário comercial: 7h às 17h (10 horas)
        const horaInicioComercial = 7;
        const horaFimComercial = 17;
        
        if (horaAtual >= horaInicioComercial && horaAtual < horaFimComercial) {
          // Calcular horas completas já passadas hoje
          const horasPassadasHoje = horaAtual - horaInicioComercial;
          exibicoesTotal += horasPassadasHoje * 9;
          
          // Se já passou de 17h, adicionar as 10 horas do dia
        } else if (horaAtual >= horaFimComercial) {
          exibicoesTotal += 10 * 9; // 10 horas × 9 exibições
        }
        // Se ainda não chegou às 7h, não conta nada para hoje
      } else {
        // Para dias anteriores, contar as 10 horas completas do horário comercial
        exibicoesTotal += 10 * 9; // 10 horas × 9 exibições por hora
      }
      
      // Avançar para o próximo dia
      dataCalculo.setDate(dataCalculo.getDate() + 1);
    }
    
    return exibicoesTotal;
  };

  // Função para calcular horas passadas no horário comercial (mesma lógica do meus-anuncios)
  const calcularHorasPassadas = (dataInicio: Date, dataAtual: Date) => {
    let horasPassadas = 0;
    const dataAtualCalculo = new Date(dataInicio);

    while (dataAtualCalculo < dataAtual) {
      const diaSemana = dataAtualCalculo.getDay(); // 0 = domingo, 6 = sábado
      
      // Pular fins de semana (sábado = 6, domingo = 0)
      if (diaSemana !== 0 && diaSemana !== 6) {
        const horaAtual = dataAtualCalculo.getHours();
        
        // Horário comercial: 7h às 17h
        if (horaAtual >= 7 && horaAtual < 17) {
          horasPassadas++;
        }
      }
      
      dataAtualCalculo.setHours(dataAtualCalculo.getHours() + 1);
    }

    return horasPassadas;
  };

  // Função para calcular alcance dinâmico (mesma lógica do meus-anuncios)
  const calcularAlcanceDinamico = (alcanceTotal: number, inicioCampanha: string, duracaoSemanas: number) => {
    const dataInicio = new Date(inicioCampanha);
    const dataAtual = new Date();
    
    // Definir o início real da campanha como 7h do dia de início
    const inicioReal = new Date(dataInicio);
    inicioReal.setHours(7, 0, 0, 0); // 7h da manhã do dia de início
    
    // Se ainda não começou, retorna 0
    if (dataAtual < inicioReal) return 0;
    
    const duracaoDias = duracaoSemanas * 7;
    const dataFim = new Date(inicioReal);
    dataFim.setDate(dataFim.getDate() + duracaoDias);
    
    // Se já terminou, retorna o total
    if (dataAtual >= dataFim) return alcanceTotal;
    
    // Calcular horas passadas desde o início (apenas horário comercial: 7h às 17h)
    const horasPassadas = calcularHorasPassadas(inicioReal, dataAtual);
    const totalHoras = duracaoDias * 10; // 10 horas por dia (excluindo fins de semana)
    
    const alcancePorHora = Math.floor(alcanceTotal / totalHoras);
    let resto = alcanceTotal % totalHoras;
    
    let alcanceAtualCalculado = 0;
    
    for (let i = 0; i < horasPassadas; i++) {
      let alcanceHora = alcancePorHora;
      
      // Distribuir o resto nas primeiras horas
      if (resto > 0) {
        alcanceHora += 1;
        resto--;
      }
      
      alcanceAtualCalculado += alcanceHora;
    }
    
    return alcanceAtualCalculado;
  };

  // Função para formatar números grandes
  const formatarNumero = (numero: number | null | undefined) => {
    if (numero === null || numero === undefined || isNaN(numero)) {
      return "0";
    }
    if (numero >= 1000) {
      return (numero / 1000).toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }) + " mil";
    }
    return numero.toLocaleString("pt-BR");
  };

  // Função para download
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

  useEffect(() => {
    const buscarCampanhas = async () => {
      try {
        setLoading(true);
        
        // Buscar todas as artes de campanha
        const { data: artes, error: artesError } = await supabase
          .from('arte_campanha')
          .select('id, caminho_imagem, id_order, screen_type, mime_type')
          .order('id', { ascending: false });

        if (artesError) {
          console.error('Erro ao buscar artes:', artesError);
          return;
        }

        if (!artes || artes.length === 0) {
          setCampanhasAgrupadas([]);
          return;
        }

        // Agrupar artes por order_id
        const artesPorOrder = new Map<string | number, ArteCampanha[]>();
        artes.forEach((arte) => {
          const orderId = arte.id_order;
          if (!artesPorOrder.has(orderId)) {
            artesPorOrder.set(orderId, []);
          }
          artesPorOrder.get(orderId)!.push(arte);
        });

        // Buscar detalhes das orders
        const orderIds = Array.from(artesPorOrder.keys());
        const orderIdsForQuery = orderIds.map((id) => {
          if (typeof id === 'number') return id;
          const numeric = Number(id);
          return !Number.isNaN(numeric) && !String(id).includes('-') ? numeric : String(id);
        });

        const { data: orders, error: ordersError } = await supabase
          .from('order')
          .select('*')
          .in('id', orderIdsForQuery);

        if (ordersError) {
          console.error('Erro ao buscar orders:', ordersError);
          return;
        }

        // Criar campanhas agrupadas
        const campanhas: CampanhaAgrupada[] = [];
        orders?.forEach((order) => {
          const orderId = String(order.id);
          const artesDoOrder = artesPorOrder.get(order.id) || artesPorOrder.get(orderId) || [];
          
          if (artesDoOrder.length > 0) {
            campanhas.push({
              orderId: order.id,
              order,
              artes: artesDoOrder
            });
          }
        });

        setCampanhasAgrupadas(campanhas);
      } catch (error) {
        console.error('Erro ao buscar campanhas:', error);
      } finally {
        setLoading(false);
      }
    };

    buscarCampanhas();
  }, []);

  // Atualizar exibições e alcance a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      const novasExibicoes: { [key: string | number]: number } = {};
      const novoAlcance: { [key: string | number]: number } = {};
      
      campanhasAgrupadas.forEach((campanha) => {
        const exibicoes = calcularExibicoesDinamicas(
          campanha.order.inicio_campanha,
          campanha.order.duracao_campanha
        );
        novasExibicoes[campanha.orderId] = exibicoes;
        
        const alcance = calcularAlcanceDinamico(
          campanha.order.alcance_campanha || 0,
          campanha.order.inicio_campanha,
          campanha.order.duracao_campanha
        );
        novoAlcance[campanha.orderId] = alcance;
      });
      
      setExibicoesAtuais(novasExibicoes);
      setAlcanceAtual(novoAlcance);
    }, 60000); // Atualiza a cada minuto

    return () => clearInterval(interval);
  }, [campanhasAgrupadas]);

  if (loading) {
    return (
      <div className="w-full h-full p-3 md:p-6">
        <h2 className="text-2xl md:text-3xl font-bold text-orange-600 mb-4 md:mb-6">Campanhas em Andamento</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-3 md:p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-orange-600 mb-4 md:mb-6">
          Campanhas em Andamento
        </h2>
      </div>
      <div className="space-y-4 md:space-y-6">
        {campanhasAgrupadas.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <p className="text-gray-500 text-lg">Nenhuma campanha em andamento encontrada.</p>
            </div>
          </div>
        ) : (
          campanhasAgrupadas.map((campanha) => {
            const diasRestantes = calcularDiasRestantes(
              campanha.order.inicio_campanha, 
              campanha.order.duracao_campanha
            );
            
            // Usar a primeira arte como preview
            const primeiraArte = campanha.artes[0];
            
            return (
              <div key={campanha.orderId} className="flex flex-col md:flex-row items-start gap-3 md:gap-6 bg-white border border-gray-200 rounded-xl md:rounded-2xl p-3 md:p-6 shadow-sm hover:shadow-md transition-shadow">
                {/* Imagem/Vídeo + Detalhes */}
                <div className="flex items-start gap-3 md:gap-4 flex-shrink-0 w-full md:w-auto">
                  {primeiraArte?.caminho_imagem && (
                    isVideo(primeiraArte.caminho_imagem) ? (
                      <div className="w-20 h-20 md:w-32 md:h-32 rounded-xl md:rounded-2xl overflow-hidden relative">
                        <video
                          src={primeiraArte.caminho_imagem}
                          className="w-full h-full object-cover"
                          controls={false}
                          preload="metadata"
                          muted
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 md:w-32 md:h-32 rounded-xl md:rounded-2xl overflow-hidden relative">
                        <Image
                          src={primeiraArte.caminho_imagem}
                          alt={campanha.order.nome_campanha || "Campanha"}
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-start">
                    <p className="font-bold text-gray-800 text-sm md:text-base truncate">{campanha.order.nome_campanha || "Campanha sem nome"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {(() => {
                        const dataInicio = new Date(campanha.order.inicio_campanha);
                        const inicioReal = new Date(dataInicio);
                        inicioReal.setHours(7, 0, 0, 0);
                        const dataAtual = new Date();
                        const isAtiva = dataAtual >= inicioReal;
                        
                        return (
                          <>
                            <div className={`w-2 h-2 rounded-full ${isAtiva ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                            <span className={`text-xs font-medium ${isAtiva ? 'text-green-600' : 'text-yellow-600'}`}>
                              {isAtiva ? "Ativa" : "Aguardando"}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        onClick={() => setModalArtesOrderId(campanha.orderId)}
                        className="text-white bg-orange-500 hover:bg-orange-600 text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer transition-colors"
                      >
                        Ver Artes ({campanha.artes.length})
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrderId(campanha.order.id);
                          setShowOrderDetails(true);
                        }}
                        className="text-orange-600 hover:text-orange-700 text-xs font-medium bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-md cursor-pointer transition-colors"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Dados */}
                <div className="w-full md:flex-1 grid grid-cols-3 gap-2 md:gap-4">
                  <div className="flex flex-col gap-1 p-2 md:p-4 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">
                    <p className="text-blue-700 font-medium text-xs">Exibições</p>
                    <p className="text-blue-800 text-sm md:text-lg font-semibold">
                      {formatarNumero(exibicoesAtuais[campanha.orderId] || calcularExibicoesDinamicas(campanha.order.inicio_campanha, campanha.order.duracao_campanha))}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 p-2 md:p-4 bg-green-50 rounded-lg border border-green-100 hover:bg-green-100 transition-colors">
                    <p className="text-green-700 font-medium text-xs">Alcance</p>
                    <p className="text-green-800 text-sm md:text-lg font-semibold">
                      {formatarNumero(alcanceAtual[campanha.orderId] || calcularAlcanceDinamico(campanha.order.alcance_campanha || 0, campanha.order.inicio_campanha, campanha.order.duracao_campanha))}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 p-2 md:p-4 bg-orange-50 rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors">
                    <p className="text-orange-700 font-medium text-xs">Restante</p>
                    <p className="text-orange-800 text-sm md:text-lg font-semibold">
                      {diasRestantes}d
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

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

      {/* Modal de artes da campanha */}
      {modalArtesOrderId && (
        <div className="fixed inset-0 z-[9998] flex items-end justify-center md:items-center md:justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalArtesOrderId(null)}></div>
          <div className="relative bg-white rounded-t-xl md:rounded-xl lg:rounded-2xl shadow-xl border border-gray-200 max-w-2xl w-full max-h-[75vh] md:max-h-[70vh] overflow-hidden flex flex-col z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">
                  Artes da Campanha {campanhasAgrupadas.find(c => c.orderId === modalArtesOrderId)?.order.nome_campanha || `#${modalArtesOrderId}`}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Visualize as artes desta campanha.</p>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer flex-shrink-0"
                onClick={() => setModalArtesOrderId(null)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4 md:p-6 overflow-y-auto flex-1">
              {(() => {
                const campanhaSelecionada = campanhasAgrupadas.find(c => c.orderId === modalArtesOrderId);
                if (!campanhaSelecionada || campanhaSelecionada.artes.length === 0) {
                  return <div className="text-center py-8 text-gray-500">Nenhuma arte encontrada.</div>;
                }

                // Agrupar artes por tipo de tela (screen_type)
                const artesEmPe = campanhaSelecionada.artes.filter(arte => !arte.screen_type || arte.screen_type === 'standing' || arte.screen_type === 'up');
                const artesDeitadas = campanhaSelecionada.artes.filter(arte => arte.screen_type === 'down');

                // Função para renderizar um grupo de artes
                const renderArtesGroup = (artes: ArteCampanha[], tipoLabel: string) => {
                  if (artes.length === 0) return null;

                  // Usar a primeira arte como representativa do tipo
                  const arteRepresentativa = artes[0];
                  const isArteVideo = arteRepresentativa.caminho_imagem ? isVideo(arteRepresentativa.caminho_imagem) : false;

                  return (
                    <div key={tipoLabel} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50 space-y-4">
                      {/* Título do tipo */}
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-semibold text-gray-800">
                          {tipoLabel}
                        </h4>
                        <span className="text-xs text-gray-500">({artes.length} arte{artes.length !== 1 ? 's' : ''})</span>
                      </div>

                      {/* Imagem representativa única */}
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
                        <div className="flex gap-2">
                          <button
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                            onClick={() => arteRepresentativa.caminho_imagem && setModalFile({
                              url: arteRepresentativa.caminho_imagem,
                              id: arteRepresentativa.id,
                              orderId: campanhaSelecionada.orderId,
                            })}
                            disabled={!arteRepresentativa.caminho_imagem}
                          >
                            Assistir
                          </button>
                          <button
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                            onClick={() => arteRepresentativa.caminho_imagem && handleDownload(arteRepresentativa.caminho_imagem, `pedido-${campanhaSelecionada.orderId}_tipo-${tipoLabel.toLowerCase().replace(' ', '-')}`)}
                            disabled={!arteRepresentativa.caminho_imagem}
                          >
                            Baixar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="space-y-4">
                    {renderArtesGroup(artesEmPe, 'Em pé')}
                    {renderArtesGroup(artesDeitadas, 'Deitado')}
                  </div>
                );
              })()}
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
    </div>
  );
};

export default ProgressAdmin;
