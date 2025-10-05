"use client"

import React, { useState, useEffect } from "react";
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
  caminho_imagem: string;
  id_order: string;
}

interface OrderDetails {
  id: number;
  nome_campanha: string;
  inicio_campanha: string;
  duracao_campanha: number;
  exibicoes_campanha: number;
  alcance_campanha: number;
}

interface CampanhaCompleta {
  arte: ArteCampanha;
  order: OrderDetails;
}

const ProgressAdmin = () => {
  const [campanhas, setCampanhas] = useState<CampanhaCompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [exibicoesAtuais, setExibicoesAtuais] = useState<{ [key: number]: number }>({});
  const [alcanceAtual, setAlcanceAtual] = useState<{ [key: number]: number }>({});
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

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

  useEffect(() => {
    const buscarCampanhas = async () => {
      try {
        setLoading(true);
        
        // Buscar todas as artes de campanha
        const { data: artes, error: artesError } = await supabase
          .from('arte_campanha')
          .select('*');

        if (artesError) {
          console.error('Erro ao buscar artes:', artesError);
          return;
        }

        if (!artes || artes.length === 0) {
          setCampanhas([]);
          return;
        }

        // Para cada arte, buscar os detalhes da order correspondente
        const campanhasCompletas: CampanhaCompleta[] = [];
        
        for (const arte of artes) {
          const { data: order, error: orderError } = await supabase
            .from('order')
            .select('*')
            .eq('id', arte.id_order)
            .single();

          if (!orderError && order) {
            campanhasCompletas.push({
              arte,
              order
            });
          }
        }

        setCampanhas(campanhasCompletas);
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
      const novasExibicoes: { [key: number]: number } = {};
      const novoAlcance: { [key: number]: number } = {};
      
      campanhas.forEach((campanha) => {
        const exibicoes = calcularExibicoesDinamicas(
          campanha.order.inicio_campanha,
          campanha.order.duracao_campanha
        );
        novasExibicoes[campanha.arte.id] = exibicoes;
        
        const alcance = calcularAlcanceDinamico(
          campanha.order.alcance_campanha || 0,
          campanha.order.inicio_campanha,
          campanha.order.duracao_campanha
        );
        novoAlcance[campanha.arte.id] = alcance;
      });
      
      setExibicoesAtuais(novasExibicoes);
      setAlcanceAtual(novoAlcance);
    }, 60000); // Atualiza a cada minuto

    return () => clearInterval(interval);
  }, [campanhas]);

  if (loading) {
    return (
      <div className="w-full h-full p-3 md:p-6">
        <h2 className="text-2xl md:text-3xl font-bold text-orange-600 mb-4 md:mb-6">Anúncios em Andamento</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-3 md:p-6 bg-gradient-to-br from-gray-50/50 to-white min-h-screen">
      <div className="relative mb-6 md:mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent rounded-2xl"></div>
        <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent relative z-10 mb-4 md:mb-6">
          Anúncios em Andamento
        </h2>
      </div>
      <div className="space-y-4 md:space-y-6">
        {campanhas.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200/50">
              <p className="text-gray-500 text-lg">Nenhuma campanha em andamento encontrada.</p>
            </div>
          </div>
        ) : (
          campanhas.map((campanha) => {
            const diasRestantes = calcularDiasRestantes(
              campanha.order.inicio_campanha, 
              campanha.order.duracao_campanha
            );
            
            return (
              <div key={campanha.arte.id} className="flex flex-col md:flex-row items-start gap-4 md:gap-6 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
                {/* Imagem/Vídeo + Detalhes */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-3 md:gap-4 flex-shrink-0">
                  {isVideo(campanha.arte.caminho_imagem) ? (
                    <video
                      src={campanha.arte.caminho_imagem}
                      className="w-20 h-20 md:w-32 md:h-32 rounded-xl md:rounded-2xl object-cover"
                      controls={false}
                      preload="metadata"
                      muted
                    />
                  ) : (
                    <Image
                      src={campanha.arte.caminho_imagem}
                      alt={campanha.order.nome_campanha || "Campanha"}
                      width={128}
                      height={128}
                      className="w-20 h-20 md:w-32 md:h-32 rounded-xl md:rounded-2xl object-cover"
                    />
                  )}
                  <div className="text-center md:text-left relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent rounded-xl"></div>
                    <p className="font-bold text-gray-800 text-sm md:text-base relative z-10">{campanha.order.nome_campanha || "Campanha sem nome"}</p>
                    <div className="flex flex-col gap-2 relative z-10">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const dataInicio = new Date(campanha.order.inicio_campanha);
                          const inicioReal = new Date(dataInicio);
                          inicioReal.setHours(7, 0, 0, 0); // 7h da manhã do dia de início
                          const dataAtual = new Date();
                          const isAtiva = dataAtual >= inicioReal;
                          
                          return (
                            <>
                              <div className={`w-2 h-2 rounded-full shadow-sm ${isAtiva ? 'bg-green-500 shadow-green-500/50' : 'bg-yellow-500 shadow-yellow-500/50'}`}></div>
                              <span className={`text-xs md:text-sm font-semibold ${isAtiva ? 'text-green-600' : 'text-yellow-600'}`}>
                                {isAtiva ? "Campanha Ativa" : "Campanha ainda não começou"}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedOrderId(campanha.order.id);
                          setShowOrderDetails(true);
                        }}
                        className="text-orange-600 hover:text-orange-700 text-xs md:text-sm font-bold transition-all duration-200 hover:scale-105 text-left bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded-lg"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Dados */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                  <div className="flex flex-col gap-1 p-3 md:p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-200/30 hover:shadow-md transition-all duration-200 group">
                    <p className="text-blue-700 font-bold text-xs md:text-sm">Exibições</p>
                    <p className="text-blue-600 text-base md:text-lg font-bold">
                      {formatarNumero(exibicoesAtuais[campanha.arte.id] || calcularExibicoesDinamicas(campanha.order.inicio_campanha, campanha.order.duracao_campanha))}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 p-3 md:p-4 bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl border border-green-200/30 hover:shadow-md transition-all duration-200 group">
                    <p className="text-green-700 font-bold text-xs md:text-sm">Alcance</p>
                    <p className="text-green-600 text-base md:text-lg font-bold">
                      {formatarNumero(alcanceAtual[campanha.arte.id] || calcularAlcanceDinamico(campanha.order.alcance_campanha || 0, campanha.order.inicio_campanha, campanha.order.duracao_campanha))}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 p-3 md:p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl border border-orange-200/30 hover:shadow-md transition-all duration-200 group">
                    <p className="text-orange-700 font-bold text-xs md:text-sm">Tempo Restante</p>
                    <p className="text-orange-600 text-base md:text-lg font-bold">
                      {diasRestantes} dias
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
    </div>
  );
};

export default ProgressAdmin;
