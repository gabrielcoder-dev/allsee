// src/app/(private)/meus-anuncios/page.tsx
"use client"

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

  useEffect(() => {
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
         .select(`id, id_campanha`)

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

          // Retrieve status from local storage
          const status = localStorage.getItem(`anuncio_${arteCampanha.id}_status`) || null;

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
  }, []);

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
    <div className="w-full h-full p-3 md:px-32">
      <Link href="/results" className="flex text-sm items-center gap-2 mb-4 text-gray-600 hover:text-orange-600">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Voltar
      </Link>

      <h2 className="text-2xl md:text-3xl font-bold text-orange-600 mb-4 md:mb-6">Meus Anúncios</h2>

      {loading ? (
        <p>Carregando anúncios...</p>
      ) : error ? (
        <p className="text-red-500">Erro: {error}</p>
      ) : (
        <div className="flex flex-col gap-4 p-4 ">
          {anuncios.map((anuncio) => {
            let statusText = "Arte em Análise...";
            if (anuncio.status === "aprovado") {
              statusText = "Arte Aceita";
            } else if (anuncio.status === "rejeitado") {
              statusText = "Arte Não Aceita";
            }

            return (
              <div key={anuncio.id} className="flex p-4 items-center justify-between w-full rounded-2xl border border-gray-200">
                <div className="flex items-center gap-4 w-full">
                  <Image
                    src={anuncio.caminho_imagem}
                    alt={anuncio.nome_campanha}
                    width={600}
                    height={400}
                    className="w-28 h-28 object-cover rounded-md"
                  />
                  <div className="w-1/2 flex flex-col gap-1">
                    <h3 className="text-lg font-semibold text-gray-800">{anuncio.nome_campanha}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-600 text-xs">Início: {anuncio.inicio_campanha}</p> |
                      <p className="text-gray-600 text-xs">Periodo de Duração: <span className="text-orange-600 font-bold">{anuncio.duracao_campanha_semanas} Semanas</span></p>
                    </div>
                    <p className={
                      anuncio.status === "aprovado" ? "text-green-500"
                        : anuncio.status === "rejeitado" ? "text-red-500"
                          : "text-yellow-500"
                    }>
                      {statusText}
                    </p>
                    <div className="flex items-center gap-2">
                      <button className="w-60 text-xs rounded-sm p-2 whitespace-nowrap border border-gray-300">Ver detalhes da campanha</button>
                      <button className="text-xs rounded-sm w-24 p-2 border border-blue-500 text-blue-500" onClick={() => {
                        setIsModalOpen(true);
                        setSelectedAnuncioId(anuncio.id);
                      }}>Trocar arte</button>
                    </div>
                  </div>
                </div>
                <h2 className="font-bold">R$ {anuncio.preco}</h2>
              </div>
            );
          })}
        </div>
      )}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 bg-opacity-50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white p-4 rounded-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-2">Trocar Arte</h2>
            <input
              type="file"
              accept="image/*,video/*"
              id="upload-art"
              className="border border-gray-200 p-2"
              onChange={(e) => {
                const file = e.target.files && e.target.files[0];
                setSelectedFile(file || null);
              }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </button>
              <button className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded" onClick={handleTrocarArte}>
                Trocar
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