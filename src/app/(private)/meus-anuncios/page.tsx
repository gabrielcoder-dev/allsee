// src/app/(private)/meus-anuncios/page.tsx
"use client"

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface ArteCampanha {
  id: number;
  caminho_imagem: string;
}

interface Order {
  id: number;
  nome_campanha: string;
  inicio_campanha: string;
  duracao_campanha: number;
  arte_campanha_id: number;
}

interface Anuncio {
  id: number;
  nome_campanha: string;
  inicio_campanha: string;
  fim_campanha: string;
  caminho_imagem: string;
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
        console.log("User ID:", userId); // Log the user ID

        // Fetch orders for the current user
        const { data: orders, error: ordersError } = await supabase
          .from("order")
          .select(`id, nome_campanha, inicio_campanha, duracao_campanha, arte_campanha_id`)
          .eq("id_user", userId); // Filter by id_user

        if (ordersError) {
          setError(ordersError.message);
          console.error("Orders error:", ordersError); // Log the error
          return;
        }

        if (!orders || orders.length === 0) {
          setAnuncios([]);
          setLoading(false);
          console.log("No orders found for this user."); // Log if no orders are found
          return;
        }

        console.log("Fetched orders:", orders); // Log the fetched orders

        // Fetch arte_campanha data for each order
        const anunciosPromises = orders.map(async (order: Order) => {
          const { data: arteCampanha, error: arteCampanhaError } = await supabase
            .from("arte_campanha")
            .select("caminho_imagem")
            .eq("id", order.arte_campanha_id)
            .single();

          if (arteCampanhaError) {
            console.error("Erro ao buscar arte_campanha:", arteCampanhaError);
            return null;
          }

          const fim_campanha = new Date(order.inicio_campanha);
          fim_campanha.setDate(fim_campanha.getDate() + order.duracao_campanha);

          return {
            id: order.id,
            nome_campanha: order.nome_campanha,
            inicio_campanha: order.inicio_campanha,
            fim_campanha: fim_campanha.toLocaleDateString(),
            caminho_imagem: arteCampanha?.caminho_imagem || "",
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
    <div className="w-full h-full p-3 md:p-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {anuncios.map((anuncio) => (
            <div key={anuncio.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <Image
                src={anuncio.caminho_imagem}
                alt={anuncio.nome_campanha}
                width={600}
                height={400}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-800">{anuncio.nome_campanha}</h3>
                <p className="text-gray-600">Início: {anuncio.inicio_campanha}</p>
                <p className="text-gray-600">Fim: {anuncio.fim_campanha}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      
    </div>
  );
}

export default MeusAnuncios;