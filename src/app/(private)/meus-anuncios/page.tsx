// src/app/(private)/meus-anuncios/page.tsx
"use client"

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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
}

const MeusAnuncios = () => {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

          const fim_campanha = new Date(orders[0].inicio_campanha);
          fim_campanha.setDate(fim_campanha.getDate() + orders[0].duracao_campanha);

          return {
            id: arteCampanha.id,
            nome_campanha: orders[0].nome_campanha,
            inicio_campanha: orders[0].inicio_campanha,
            fim_campanha: fim_campanha.toLocaleDateString(),
            caminho_imagem: arteCampanha?.caminho_imagem || "",
            duracao_campanha_semanas: Math.floor(orders[0].duracao_campanha / 7),
            preco: orders[0].preco
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

  return (
    <div className="w-full h-full p-3 md:px-32">
      <Link href="/(private)/dashboard" className="flex items-center gap-2 mb-4 text-gray-600 hover:text-orange-600">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Meus Anuncios
      </Link>

      <h2 className="text-2xl md:text-3xl font-bold text-orange-600 mb-4 md:mb-6">Meus Anúncios</h2>

      {loading ? (
        <p>Carregando anúncios...</p>
      ) : error ? (
        <p className="text-red-500">Erro: {error}</p>
      ) : (
        <div className="flex flex-col gap-4 p-4 rounded-2xl border border-gray-200 shadow-2xl">
          {anuncios.map((anuncio) => (
            <div key={anuncio.id} className="flex items-center justify-between w-full">

              <div className="flex items-center gap-4 w-full">
                <Image
                  src={anuncio.caminho_imagem}
                  alt={anuncio.nome_campanha}
                  width={600}
                  height={400}
                  className="w-28 h-28 object-cover rounded-md"
                />
                <div className="w-1/2 flex flex-col gap-2">
                  <h3 className="text-lg font-semibold text-gray-800">{anuncio.nome_campanha}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-600 text-xs">Início: {anuncio.inicio_campanha}</p> |
                    <p className="text-gray-600 text-xs">Periodo de Duração: <span className="text-orange-600 font-bold">{anuncio.duracao_campanha_semanas} Semanas</span></p>
                  </div>
                  <p>Arte em Analise...</p>
                  <div className="flex items-center gap-2">
                    <button className="w-60 text-xs rounded-sm p-2 whitespace-nowrap border border-gray-300">Ver detalhes da campanha</button>
                    <button className="text-xs rounded-sm w-24 p-2 border border-blue-500 text-blue-500">Trocar arte</button>
                  </div>
                </div>


              </div>

              <h2 className="font-bold">R$ {anuncio.preco}</h2>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MeusAnuncios;