// src/app/(private)/meus-anuncios/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ArteCampanha {
  id: number;
  caminho_imagem: string;
  id_order: string; // Alterado para id_order
}

interface Order {
  id: number;
  nome_campanha: string;
  inicio_campanha: string;
  duracao_campanha: number;
  preco: number;
}

interface Anuncio {
  id: number;
  nome_campanha: string;
  inicio_campanha: string;
  fim_campanha: string;
  caminho_imagem: string;
  duracao_campanha_semanas: number;
  preco: number;
  order_id: number;
  status: string | null;
}

const MeusAnuncios = () => {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnuncioId, setSelectedAnuncioId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    window.addEventListener('storage', () => {
      setRefresh(!refresh);
    });

    async function fetchAnuncios() {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setError("User not logged in");
          setLoading(false);
          return;
        }

        const userId = user.id;
        console.log("User ID:", userId);

        // Fetch arte_campanha data for the current user
        const { data: arteCampanhas, error: arteCampanhasError } = await supabase
          .from("arte_campanha")
          .select(`id, caminho_imagem, id_order`)
          .eq('id_user', userId);

        if (arteCampanhasError) {
          setError(arteCampanhasError.message);
          console.error("arteCampanhas error:", arteCampanhasError);
          return;
        }

        if (!arteCampanhas || arteCampanhas.length === 0) {
          setAnuncios([]);
          setLoading(false);
          console.log("No arteCampanhas found for this user.");
          return;
        }

        console.log("Fetched arteCampanhas:", arteCampanhas);

         // Fetch arte_troca_campanha data for the current user
         const { data: arteTrocaCampanhas, error: arteTrocaCampanhasError } = await supabase
         .from("arte_troca_campanha")
         .select(`id, id_campanha`);

       if (arteTrocaCampanhasError) {
         setError(arteTrocaCampanhasError.message);
         console.error("arteTrocaCampanhas error:", arteTrocaCampanhasError);
         return;
       }

       console.log("Fetched arteTrocaCampanhas:", arteTrocaCampanhas);

        // Fetch orders for the current user
        const anunciosPromises = arteCampanhas.map(async (arteCampanha: ArteCampanha) => {
          // Fetch orders para pegar o nome, inicio e fim da campanha
          const { data: orders, error: ordersError } = await supabase
            .from("order")
            .select(`id, nome_campanha, inicio_campanha, duracao_campanha, preco`)
            .eq("id", arteCampanha.id_order) // Busca order pelo id da arteCampanha

          if (ordersError) {
            setError(ordersError.message);
            console.error("Orders error:", ordersError);
            return null;
          }

          if (!orders || orders.length === 0) {
            setAnuncios([]);
            setLoading(false);
            console.log("No orders found for this user.");
            return null;
          }

           // Find the corresponding arteTrocaCampanha
           const arteTrocaCampanha = arteTrocaCampanhas?.find(atc => atc.id_campanha === orders[0].id);

          const fim_campanha = new Date(orders[0].inicio_campanha);
          fim_campanha.setDate(fim_campanha.getDate() + orders[0].duracao_campanha);

           // Retrieve status from arteTrocaCampanhas or local storage
           const arteTrocaCampanhaStatus = arteTrocaCampanhas?.find(atc => atc.id_campanha === orders[0].id) || null;
           const localStorageStatus = localStorage.getItem(`order_${orders[0].id}`) || null;
           const replacementStatus = localStorage.getItem(`replacement_order_${orders[0].id}`) || null;
           const status = replacementStatus || arteTrocaCampanhaStatus || localStorageStatus;
           
           // Debug: verificar todos os status
           console.log(`Order ${orders[0].id}:`, {
             arteTrocaCampanhaStatus,
             localStorageStatus,
             replacementStatus,
             finalStatus: status
           });

          return {
            id: arteCampanha.id,
            order_id: orders[0].id,
            nome_campanha: orders[0].nome_campanha,
            inicio_campanha: orders[0].inicio_campanha,
            fim_campanha: fim_campanha.toLocaleDateString(),
            caminho_imagem: arteCampanha?.caminho_imagem || "",
            duracao_campanha_semanas: Math.max(1, Math.floor(orders[0].duracao_campanha / 7)),
            preco: orders[0].preco,
            status: status,
          };
        });

        const anunciosData = (await Promise.all(anunciosPromises)).filter(Boolean) as Anuncio[];
        setAnuncios(anunciosData);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAnuncios();
  }, [refresh]);

  const handleTrocarArte = async () => {
    if (!selectedFile || !selectedAnuncioId) {
      console.error("Nenhum arquivo selecionado ou ID do anúncio não definido.");
      return;
    }

    try {
      // Encontrar o order_id correspondente ao selectedAnuncioId (arte_campanha.id)
      const anuncio = anuncios.find(anuncio => anuncio.id === selectedAnuncioId);
      if (!anuncio) {
        console.error("Anúncio não encontrado.");
        return;
      }
      
      console.log(`Trocando arte para anuncio.id: ${selectedAnuncioId}, order_id: ${anuncio.order_id}`);

      // Converter o arquivo para base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const base64String = reader.result as string;

        // Enviar o caminho da imagem, ID do arte_campanha e status para a tabela arte_troca_campanha
        const { error: insertError } = await supabase
          .from('arte_troca_campanha')
          .insert([
            { caminho_imagem: base64String, id_campanha: anuncio.order_id }
          ]);

        if (insertError) {
          console.error("Erro ao inserir o caminho da imagem:", insertError);
          setError(insertError.message);
          return;
        }

        // Remove o status do localStorage para que a arte volte para "Em Análise"
        localStorage.removeItem(`order_${anuncio.order_id}`);
        localStorage.removeItem(`replacement_order_${anuncio.order_id}`);
        
        console.log(`Removendo status do localStorage para order ${anuncio.order_id}`);

        console.log("Arquivo enviado e caminho da imagem inserido com sucesso!");
        setIsModalOpen(false);
        toast.success('Arte trocada com sucesso!', {
          position: "top-right",
          autoClose: 5000,          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
        
        // Atualizar a página para mostrar o novo status
        setRefresh(!refresh);
      };

      reader.onerror = (error) => {
        console.error("Erro ao ler o arquivo:", error);
        setError("Erro ao ler o arquivo.");
      };


    } catch (err: any) {
      console.error("Erro ao trocar a arte:", err);
      setError(err.message);
    }
  };


  return (
    <div className="w-full h-full p-3 sm:p-4 md:px-8 lg:px-32">
      <Link href="/results" className="flex text-sm items-center gap-2 mb-4 text-gray-600 hover:text-orange-600">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Voltar
      </Link>

      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-600 mb-4 md:mb-6">Meus Anúncios</h2>

      {loading ? (
        <p>Carregando anúncios...</p>
      ) : error ? (
        <p className="text-red-500">Erro: {error}</p>
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4 p-2 sm:p-4">
          {anuncios.map((anuncio) => {
            let statusText = "Arte em Análise...";
            if (anuncio.status === "aprovado") {
              statusText = "Arte Aceita";
            } else if (anuncio.status === "rejeitado") {
              statusText = "Arte Recusada";
            }
            
            // Debug: verificar o status
            console.log(`Anúncio ${anuncio.id} - Status: ${anuncio.status}, StatusText: ${statusText}`);

            return (
              <>
                <div key={anuncio.id} className="flex flex-col sm:flex-row p-3 sm:p-4 items-start sm:items-center justify-between w-full rounded-xl sm:rounded-2xl border border-gray-200 gap-3 sm:gap-4">
                  {/* Imagem e conteúdo principal */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full">
                    <Image
                      src={anuncio.caminho_imagem}
                      alt={anuncio.nome_campanha}
                      width={600}
                      height={400}
                      className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 object-cover rounded-md flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1 sm:mb-2">{anuncio.nome_campanha}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                        <p className="text-gray-600 text-xs">Início: {anuncio.inicio_campanha}</p>
                        <span className="hidden sm:inline">|</span>
                        <p className="text-gray-600 text-xs">Período: <span className="text-orange-600 font-bold">{anuncio.duracao_campanha_semanas} Semanas</span></p>
                      </div>
                      <p className={`text-sm sm:text-base font-medium mb-2 sm:mb-3 ${
                        anuncio.status === "aprovado" ? "text-green-500"
                          : anuncio.status === "rejeitado" ? "text-red-500"
                            : "text-yellow-500"
                      }`}>
                        {statusText}
                      </p>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <button className="w-full sm:w-auto text-xs rounded-sm p-2 whitespace-nowrap border border-gray-300 hover:bg-gray-50 transition-colors">
                          Ver detalhes da campanha
                        </button>
                        <button 
                          className={`w-full sm:w-auto text-xs rounded-sm p-2 border transition-colors ${
                            statusText === "Arte em Análise..." 
                              ? "border-gray-300 text-gray-400 cursor-not-allowed" 
                              : "border-blue-500 text-blue-500 hover:bg-blue-50"
                          }`}
                          onClick={() => {
                            if (statusText !== "Arte em Análise...") {
                              setIsModalOpen(true);
                              setSelectedAnuncioId(anuncio.id);
                            }
                          }}
                          disabled={statusText === "Arte em Análise..."}
                        >
                          Trocar arte
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Preço */}
                  <div className="w-full sm:w-auto flex justify-between sm:flex-col items-center sm:items-end gap-2">
                    <span className="text-sm sm:text-base text-gray-600 sm:hidden">Preço:</span>
                    <h2 className="font-bold text-lg sm:text-xl text-orange-600">R$ {anuncio.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                  </div>
                </div>
              </>
            );
          })}
        </div>
      )}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 bg-opacity-50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">Trocar Arte</h2>
            <div className="mb-4">
              <label htmlFor="upload-art" className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar nova arte
              </label>
              <input
                type="file"
                accept="image/*,video/*"
                id="upload-art"
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  setSelectedFile(file || null);
                }}
              />
              {selectedFile && (
                <p className="text-xs text-green-600 mt-1">
                  Arquivo selecionado: {selectedFile.name}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button 
                className="w-full sm:w-auto bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition-colors" 
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </button>
              <button 
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed" 
                onClick={handleTrocarArte}
                disabled={!selectedFile}
              >
                Trocar Arte
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
};

export default MeusAnuncios;
