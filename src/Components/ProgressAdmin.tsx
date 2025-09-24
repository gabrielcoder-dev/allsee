import React, { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from '@supabase/supabase-js';

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

  // Função para formatar números grandes
  const formatarNumero = (numero: number) => {
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
    <div className="w-full h-full p-3 md:p-6">
      <h2 className="text-2xl md:text-3xl font-bold text-orange-600 mb-4 md:mb-6">Anúncios em Andamento</h2>
      <div className="space-y-4 md:space-y-6">
        {campanhas.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhuma campanha em andamento encontrada.</p>
          </div>
        ) : (
          campanhas.map((campanha) => {
            const diasRestantes = calcularDiasRestantes(
              campanha.order.inicio_campanha, 
              campanha.order.duracao_campanha
            );
            
            return (
              <div key={campanha.arte.id} className="flex flex-col md:flex-row items-start gap-4 md:gap-6 border border-gray-300 rounded-xl md:rounded-2xl p-4 md:p-6 bg-white shadow-sm">
                {/* Imagem + Detalhes */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-3 md:gap-4 flex-shrink-0">
                  <Image
                    src={campanha.arte.caminho_imagem}
                    alt={campanha.order.nome_campanha}
                    width={128}
                    height={128}
                    className="w-20 h-20 md:w-32 md:h-32 rounded-xl md:rounded-2xl object-cover"
                  />
                  <div className="text-center md:text-left">
                    <p className="font-bold text-gray-800 text-sm md:text-base">{campanha.order.nome_campanha}</p>
                    <p className="text-gray-500 text-xs md:text-sm">Campanha Ativa</p>
                  </div>
                </div>
                
                {/* Dados */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                  <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-700 font-bold text-sm md:text-base">Exibições</p>
                    <p className="text-gray-500 text-lg md:text-xl font-semibold">
                      {formatarNumero(campanha.order.exibicoes_campanha)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-700 font-bold text-sm md:text-base">Alcance</p>
                    <p className="text-gray-500 text-lg md:text-xl font-semibold">
                      {formatarNumero(campanha.order.alcance_campanha)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-700 font-bold text-sm md:text-base">Tempo Restante</p>
                    <p className="text-gray-500 text-lg md:text-xl font-semibold">
                      {diasRestantes} dias
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProgressAdmin;
