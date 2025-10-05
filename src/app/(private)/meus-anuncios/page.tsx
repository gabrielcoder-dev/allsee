// src/app/(private)/meus-anuncios/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Função para detectar se é vídeo
const isVideo = (url: string) => {
  return url.match(/\.(mp4|webm|ogg)$/i) || url.startsWith("data:video");
};

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
  alcance_campanha: number;
  exibicoes_campanha: number;
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
  console.log('🚀 COMPONENTE INICIANDO...');
  
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  console.log('🎯 Componente MeusAnuncios renderizado - loading:', loading, 'anuncios:', anuncios.length);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAnuncioId, setSelectedAnuncioId] = useState<number | null>(null);
  const [selectedAnuncioDetails, setSelectedAnuncioDetails] = useState<Anuncio | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [refresh, setRefresh] = useState(false);
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null);
  const [alcanceAtual, setAlcanceAtual] = useState<number>(0);

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
        console.log("✅ User ID:", userId);

        // Fetch arte_campanha data for the current user
        console.log('📊 Buscando arte_campanha para userId:', userId);
        
        // PRIMEIRO: Vamos ver TODAS as arte_campanha para debug
        const { data: allArteCampanhas, error: allError } = await supabase
          .from("arte_campanha")
          .select(`id, caminho_imagem, id_order, id_user`)
          .order("id", { ascending: false });
        
        console.log('🔍 TODAS as arte_campanha no banco:', allArteCampanhas);
        
        // SEGUNDO: Filtrar apenas as do usuário atual
        const { data: arteCampanhas, error: arteCampanhasError } = await supabase
          .from("arte_campanha")
          .select(`id, caminho_imagem, id_order`)
          .eq('id_user', userId);

        if (arteCampanhasError) {
          console.error("❌ arteCampanhas error:", arteCampanhasError);
          setError(arteCampanhasError.message);
          setLoading(false);
          return;
        }

        console.log('📋 Resultado da query arte_campanha (filtrado por usuário):', {
          count: arteCampanhas?.length || 0,
          data: arteCampanhas
        });
        
        // Comparar com todas as arte_campanha
        const userArteCampanhas = allArteCampanhas?.filter(ac => ac.id_user === userId) || [];
        console.log('🔍 Arte_campanha do usuário (filtrado manualmente):', {
          count: userArteCampanhas.length,
          data: userArteCampanhas
        });
        
        // Verificar se há diferença entre as queries
        console.log('⚖️ Comparação:', {
          queryFiltered: arteCampanhas?.length || 0,
          manualFiltered: userArteCampanhas.length,
          totalInDB: allArteCampanhas?.length || 0
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

        // Fetch orders for the current user
        console.log('📋 Processando orders para', arteCampanhas.length, 'arteCampanhas...');
        const anunciosPromises = arteCampanhas.map(async (arteCampanha: ArteCampanha) => {
          console.log(`🔍 Buscando order para arteCampanha ${arteCampanha.id} (id_order: ${arteCampanha.id_order})`);
          
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
           const arteTrocaCampanha = arteTrocaCampanhas?.find(atc => atc.id_campanha === arteCampanha.id);

          const fim_campanha = new Date(orders[0].inicio_campanha);
          fim_campanha.setDate(fim_campanha.getDate() + orders[0].duracao_campanha);

           // Retrieve status from arteTrocaCampanhas or local storage
           const arteTrocaCampanhaStatus = arteTrocaCampanhas?.find(atc => atc.id_campanha === arteCampanha.id) || null;
           const localStorageStatus = localStorage.getItem(`order_${orders[0].id}`) || null;
           const replacementStatus = localStorage.getItem(`replacement_order_${arteCampanha.id}`) || null;
           const status = replacementStatus || arteTrocaCampanhaStatus || localStorageStatus;
           
           console.log(`📋 Status para order ${orders[0].id} (arte_campanha ${arteCampanha.id}):`, {
             arteTrocaCampanhaStatus,
             localStorageStatus,
             replacementStatus,
             finalStatus: status,
             chave_replacement: `replacement_order_${arteCampanha.id}`,
             todas_chaves_localStorage: Object.keys(localStorage).filter(key => key.includes('order')),
             chaves_replacement: Object.keys(localStorage).filter(key => key.startsWith('replacement_order_')),
             valores_replacement: Object.keys(localStorage)
               .filter(key => key.startsWith('replacement_order_'))
               .map(key => ({ chave: key, valor: localStorage.getItem(key) }))
           });
           
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
            duracao_campanha_semanas: orders[0].duracao_campanha, // Agora armazena dias
            preco: orders[0].preco,
            status: status,
          };
        });

        const anunciosData = (await Promise.all(anunciosPromises)).filter(Boolean) as Anuncio[];
        console.log('✅ Anúncios processados:', anunciosData.length);
        console.log('📊 Dados finais dos anúncios:', anunciosData);
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
        let base64String = reader.result as string;

        // Otimizar imagem se for imagem (COMPRESSÃO MAIS AGRESSIVA)
        if (base64String.startsWith('data:image/')) {
          console.log('🖼️ Otimizando imagem (compressão agressiva)...');
          base64String = await compressImage(base64String, 0.6); // 60% qualidade (mais compressão)
          console.log('✅ Imagem otimizada:', {
            originalSize: Math.round((reader.result as string).length / (1024 * 1024)),
            compressedSize: Math.round(base64String.length / (1024 * 1024)),
            compression: Math.round((1 - base64String.length / (reader.result as string).length) * 100) + '%'
          });
        }

        // Obter usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error("Usuário não logado");
          setError("Usuário não logado");
          return;
        }

        console.log('📤 Preparando upload híbrido de troca:', {
          order_id: anuncio.order_id,
          id_user: user.id,
          fileType: base64String.startsWith('data:image/') ? 'image' : 'video',
          fileSizeMB: Math.round(base64String.length / (1024 * 1024))
        });

        // Upload híbrido - LÓGICA SIMPLES OTIMIZADA
        const serverBodyLimit = 8 * 1024 * 1024; // 8MB limite do servidor (aumentado de 4MB)
        
        // Função para comprimir chunks usando compressão nativa do browser
        const compressChunk = async (chunk: string): Promise<string> => {
          try {
            // Converter base64 para Uint8Array
            const binaryString = atob(chunk);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Comprimir usando CompressionStream
            const stream = new CompressionStream('gzip');
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();
            
            writer.write(bytes);
            writer.close();
            
            const compressedChunks: Uint8Array[] = [];
            let done = false;
            
            while (!done) {
              const { value, done: readerDone } = await reader.read();
              done = readerDone;
              if (value) {
                compressedChunks.push(value);
              }
            }
            
            // Combinar chunks comprimidos
            const totalLength = compressedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const compressedBytes = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of compressedChunks) {
              compressedBytes.set(chunk, offset);
              offset += chunk.length;
            }
            
            // Converter de volta para base64
            let compressedBase64 = '';
            for (let i = 0; i < compressedBytes.length; i++) {
              compressedBase64 += String.fromCharCode(compressedBytes[i]);
            }
            
            return btoa(compressedBase64);
          } catch (error) {
            console.warn('⚠️ Falha na compressão, usando chunk original:', error);
            return chunk; // Fallback para chunk original
          }
        };
        
        if (base64String.length <= serverBodyLimit) {
          // Upload direto para arquivos pequenos (instantâneo)
          console.log('📤 Upload direto de troca (arquivo pequeno)', {
            tamanhoArquivo: `${Math.round(base64String.length / (1024 * 1024))}MB`,
            limiteServidor: `${Math.round(serverBodyLimit / (1024 * 1024))}MB`
          });
          const response = await fetch('/api/admin/criar-arte-troca-campanha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id_campanha: anuncio.id,
              caminho_imagem: base64String
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro no upload direto de troca');
          }

          console.log('✅ Upload direto de troca concluído');
        } else {
          // Upload híbrido para arquivos grandes - LÓGICA SIMPLES
          console.log('📤 Upload híbrido de troca (arquivo grande) - iniciando...');
          
          // LÓGICA CORRIGIDA: Chunks de até 8MB, garantindo que 100% do arquivo seja enviado
          const chunks: string[] = [];
          let currentPosition = 0;
          const totalSize = base64String.length;
          
          console.log(`📏 Tamanho total do arquivo de troca: ${Math.round(totalSize / (1024 * 1024))}MB ${Math.round((totalSize % (1024 * 1024)) / 1024)}KB`);
          
          while (currentPosition < totalSize) {
            const remainingBytes = totalSize - currentPosition;
            const chunkSize = Math.min(serverBodyLimit, remainingBytes);
            
            // Verificar se este é o último chunk
            const isLastChunk = (currentPosition + chunkSize) >= totalSize;
            const actualChunkSize = isLastChunk ? remainingBytes : chunkSize;
            
            const chunk = base64String.slice(currentPosition, currentPosition + actualChunkSize);
            chunks.push(chunk);
            
            console.log(`📦 Chunk de troca ${chunks.length}:`, {
              posicaoInicial: currentPosition,
              posicaoFinal: currentPosition + actualChunkSize,
              tamanhoChunk: Math.round(actualChunkSize / 1024) + 'KB',
              tamanhoChunkMB: Math.round(actualChunkSize / (1024 * 1024)) + 'MB',
              isLastChunk: isLastChunk,
              bytesRestantes: totalSize - (currentPosition + actualChunkSize)
            });
            
            currentPosition += actualChunkSize;
          }
          
          console.log(`🧮 Nova lógica de chunks de troca:`, {
            arquivoOriginal: `${Math.round(base64String.length / (1024 * 1024))}MB`,
            limiteServidor: `${Math.round(serverBodyLimit / (1024 * 1024))}MB`,
            chunksCriados: chunks.length,
            tamanhosChunks: chunks.map((chunk, i) => ({
              chunk: i + 1,
              tamanho: `${Math.round(chunk.length / (1024 * 1024))}MB ${Math.round((chunk.length % (1024 * 1024)) / 1024)}KB`
            }))
          });
          
          // Verificar se todos os chunks têm tamanho válido
          const invalidChunks = chunks.filter(chunk => chunk.length === 0);
          if (invalidChunks.length > 0) {
            console.error('❌ Chunks inválidos de troca encontrados:', invalidChunks.length);
            throw new Error('Erro na divisão de chunks de troca: chunks vazios detectados');
          }
          
          console.log(`📦 Chunks de troca criados: ${chunks.length} chunks válidos`);
          
          // Comprimir chunks para reduzir tamanho de transferência
          console.log('🗜️ Comprimindo chunks de troca para otimizar transferência...');
          const compressedChunks: string[] = [];
          
          for (let i = 0; i < chunks.length; i++) {
            const originalSize = chunks[i].length;
            const compressedChunk = await compressChunk(chunks[i]);
            const compressedSize = compressedChunk.length;
            const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
            
            compressedChunks.push(compressedChunk);
            
            console.log(`🗜️ Chunk de troca ${i + 1}/${chunks.length} comprimido:`, {
              tamanhoOriginal: Math.round(originalSize / 1024) + 'KB',
              tamanhoComprimido: Math.round(compressedSize / 1024) + 'KB',
              reducao: compressionRatio + '%',
              economia: Math.round((originalSize - compressedSize) / 1024) + 'KB'
            });
          }
          
          console.log(`✅ Compressão de troca concluída - usando chunks comprimidos para upload`);
          
          // Diagnóstico detalhado dos chunks de troca
          const totalChunkSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const isSizeMatch = totalChunkSize === base64String.length;
          
          console.log(`📊 Diagnóstico dos chunks de troca:`, {
            totalChunks: chunks.length,
            chunkSizes: chunks.map((chunk, i) => ({
              chunk: i + 1,
              sizeKB: Math.round(chunk.length / 1024),
              sizeMB: Math.round(chunk.length / (1024 * 1024)) + 'MB',
              isLastChunk: i === chunks.length - 1
            })),
            totalSizeOriginal: Math.round(base64String.length / (1024 * 1024)) + 'MB ' + Math.round((base64String.length % (1024 * 1024)) / 1024) + 'KB',
            totalSizeChunks: Math.round(totalChunkSize / (1024 * 1024)) + 'MB ' + Math.round((totalChunkSize % (1024 * 1024)) / 1024) + 'KB',
            sizeMatch: isSizeMatch ? '✅ CORRETO' : '❌ ERRO - Tamanhos não batem!',
            lastChunkIndex: chunks.length - 1,
            lastChunkSize: Math.round(chunks[chunks.length - 1]?.length / 1024) + 'KB'
          });
          
          // Verificação crítica: se os tamanhos não batem, erro fatal
          if (!isSizeMatch) {
            console.error('❌ ERRO CRÍTICO: Tamanho total dos chunks de troca não bate com arquivo original!');
            console.error(`Arquivo original: ${base64String.length} bytes`);
            console.error(`Soma dos chunks: ${totalChunkSize} bytes`);
            console.error(`Diferença: ${Math.abs(base64String.length - totalChunkSize)} bytes`);
            throw new Error('Erro na divisão de chunks de troca: tamanhos não coincidem');
          }
          
          console.log(`📦 Troca: Dividindo em ${chunks.length} chunks (até 4MB cada)`);
          
          // Criar registro vazio
          const createResponse = await fetch('/api/admin/criar-arte-troca-campanha', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              id_campanha: anuncio.id,
              caminho_imagem: '' // Vazio inicialmente
            })
          });

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(errorData.error || 'Erro ao criar registro inicial de troca');
          }

          const createData = await createResponse.json();
          const arteTrocaCampanhaId = createData.arte_troca_campanha_id;
          
          console.log('✅ Registro de troca criado, ID:', arteTrocaCampanhaId);
          
          // Limpar chunks anteriores antes de começar o upload
          try {
            await fetch('/api/admin/limpar-chunks-troca', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ arte_troca_campanha_id: arteTrocaCampanhaId })
            });
            console.log('🧹 Chunks de troca anteriores limpos');
          } catch (cleanupError) {
            console.warn('⚠️ Não foi possível limpar chunks de troca anteriores:', cleanupError);
          }
          
          // ESTRATÉGIA PARALELA: Upload paralelo com limite de concorrência para melhor performance
          console.log(`🚀 Preparando upload paralelo de troca de ${compressedChunks.length} chunks comprimidos...`);
          
          // Função para enviar um chunk com retry e timeout
          const uploadChunkWithRetry = async (chunkIndex: number, maxRetries: number = 3): Promise<void> => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                // Timeout otimizado para upload rápido
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s por chunk para upload rápido
                
                console.log(`📤 Enviando chunk de troca comprimido ${chunkIndex + 1}/${compressedChunks.length}:`, {
                  arte_troca_campanha_id: arteTrocaCampanhaId,
                  chunk_index: chunkIndex,
                  chunk_size: Math.round(compressedChunks[chunkIndex].length / (1024 * 1024)) + 'MB',
                  chunk_size_kb: Math.round(compressedChunks[chunkIndex].length / 1024) + 'KB',
                  total_chunks: compressedChunks.length,
                  tentativa: attempt
                });

                const chunkResponse = await fetch('/api/admin/upload-chunk-troca', {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  },
                  body: JSON.stringify({
                    arte_troca_campanha_id: arteTrocaCampanhaId,
                    chunk_index: chunkIndex,
                    chunk_data: compressedChunks[chunkIndex],
                    total_chunks: compressedChunks.length
                  }),
                  signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!chunkResponse.ok) {
                  const errorText = await chunkResponse.text();
                  let errorMessage = `Erro no chunk de troca ${chunkIndex}`;
                  
                  try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                  } catch {
                    // Se não conseguir fazer parse do JSON, usar o texto da resposta
                    errorMessage = errorText || errorMessage;
                  }
                  
                  console.error(`❌ Erro HTTP ${chunkResponse.status} para chunk de troca ${chunkIndex}:`, {
                    status: chunkResponse.status,
                    statusText: chunkResponse.statusText,
                    errorText: errorText,
                    errorMessage: errorMessage
                  });
                  
                  throw new Error(`${errorMessage} (Status: ${chunkResponse.status})`);
                }

                // Tentar parsear a resposta para verificar se foi bem-sucedida
                try {
                  const responseData = await chunkResponse.json();
                  if (!responseData.success) {
                    throw new Error(responseData.error || 'Resposta não indica sucesso');
                  }
                  
                  console.log(`✅ Chunk de troca comprimido ${chunkIndex + 1}/${compressedChunks.length} enviado com sucesso (tentativa ${attempt}):`, {
                    success: responseData.success,
                    message: responseData.message,
                    isLastChunk: chunkIndex === compressedChunks.length - 1
                  });
                } catch (parseError) {
                  console.warn(`⚠️ Não foi possível parsear resposta do chunk de troca ${chunkIndex}, assumindo sucesso`);
                }
                
                return; // Sucesso, sair do loop de retry
              } catch (error: any) {
                const errorMsg = error.message || error.toString();
                console.warn(`⚠️ Tentativa ${attempt}/${maxRetries} falhou para chunk de troca comprimido ${chunkIndex}:`, {
                  error: errorMsg,
                  chunkSize: Math.round(compressedChunks[chunkIndex].length / 1024) + 'KB',
                  isLastChunk: chunkIndex === compressedChunks.length - 1
                });
                
                if (attempt === maxRetries) {
                  throw new Error(`Chunk de troca comprimido ${chunkIndex + 1}/${compressedChunks.length} falhou após ${maxRetries} tentativas: ${errorMsg}`);
                }
                
                // Aguardar menos tempo entre tentativas para upload mais rápido
                const delay = 500 * attempt; // 500ms, 1s, 1.5s (reduzido ainda mais)
                console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          };

          // Upload paralelo com limite de concorrência para melhor performance
          console.log(`📤 Iniciando upload paralelo de troca de ${compressedChunks.length} chunks comprimidos...`);
          
          try {
            // Função para processar chunks em lotes paralelos
            const processChunksInBatches = async (chunks: string[], batchSize: number = 3) => {
              const results: Promise<void>[] = [];
              
              for (let i = 0; i < chunks.length; i += batchSize) {
                const batch = chunks.slice(i, i + batchSize);
                const batchPromises = batch.map((_, index) => {
                  const chunkIndex = i + index;
                  const isLastChunk = chunkIndex === chunks.length - 1;
                  
                  console.log(`📤 Enviando chunk de troca comprimido ${chunkIndex + 1}/${chunks.length}${isLastChunk ? ' (ÚLTIMO CHUNK)' : ''}...`, {
                    chunkIndex: chunkIndex,
                    chunkSize: Math.round(chunks[chunkIndex].length / 1024) + 'KB',
                    isLastChunk: isLastChunk,
                    batchNumber: Math.floor(i / batchSize) + 1
                  });
                  
                  return uploadChunkWithRetry(chunkIndex);
                });
                
                // Aguardar o lote atual antes de prosseguir
                await Promise.all(batchPromises);
                
                // Delay mínimo entre lotes para upload mais rápido
                if (i + batchSize < chunks.length) {
                  await new Promise(resolve => setTimeout(resolve, 100)); // 100ms entre lotes (reduzido de 200ms)
                }
              }
            };
            
            // Processar chunks comprimidos em lotes de 3 (pode ser ajustado conforme necessário)
            await processChunksInBatches(compressedChunks, 3);
            
            console.log(`✅ TODOS os ${compressedChunks.length} chunks de troca comprimidos enviados em paralelo - upload concluído`);
          } catch (chunkError: any) {
            console.error('❌ Upload de troca por chunks falhou:', chunkError.message);
            throw chunkError;
          }
        }

        // Remove o status do localStorage para que a arte volte para "Em Análise"
        localStorage.removeItem(`order_${anuncio.order_id}`);
        localStorage.removeItem(`replacement_order_${anuncio.order_id}`);
        
        console.log(`Removendo status do localStorage para order ${anuncio.order_id}`);

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
    <div className="min-h-screen">
      {/* Header fixo */}
      <div className="sticky top-0 z-10">
        <div className="px-6 py-8 max-w-4xl mx-auto">
          <Link href="/results" className="flex items-center gap-3 text-xl font-semibold text-black hover:text-gray-700 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Voltar
          </Link>
          <h1 className="text-3xl font-bold text-orange-600">Meus Anúncios</h1>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="px-6 py-4 max-w-4xl mx-auto">
        {loading ? (
        <p>Carregando anúncios...</p>
      ) : error ? (
        <div className="text-center">
          <p className="text-red-500">Erro: {error}</p>
          <p className="text-sm text-gray-500 mt-2">Verifique o console para mais detalhes</p>
        </div>
      ) : (
        <div className="grid gap-4 md:gap-6 pb-8">
          {anuncios.map((anuncio) => {
            let statusText = "Arte em Análise...";
            let statusColor = "yellow";
            
            // Verificar se há troca de arte pendente
            const hasTrocaPendente = localStorage.getItem(`replacement_order_${anuncio.id}`) !== null;
            const trocaStatus = localStorage.getItem(`replacement_order_${anuncio.id}`);
            
            if (hasTrocaPendente) {
              if (trocaStatus === "aceita") {
                statusText = "Arte Aceita";
                statusColor = "green";
              } else if (trocaStatus === "não aceita") {
                statusText = "Arte não aceita, tente novamente!";
                statusColor = "red";
              } else {
                // Troca pendente (sem status específico)
                statusText = "Arte em análise";
                statusColor = "yellow";
              }
            } else if (anuncio.status === "aprovado") {
              statusText = "Arte Aceita";
              statusColor = "green";
            } else if (anuncio.status === "rejeitado") {
              statusText = "Arte não aceita, tente novamente!";
              statusColor = "red";
            }
            
            // Debug: verificar o status
            console.log(`Anúncio ${anuncio.id} - Status: ${anuncio.status}, StatusText: ${statusText}`);

            return (
              <div key={anuncio.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Header do card */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isVideo(anuncio.caminho_imagem) ? (
                        <video
                          src={anuncio.caminho_imagem}
                          className="w-12 h-12 object-cover rounded-lg"
                          controls={false}
                          preload="metadata"
                          muted
                        />
                      ) : (
                        <Image
                          src={anuncio.caminho_imagem}
                          alt={anuncio.nome_campanha}
                          width={60}
                          height={60}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      )}
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
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                      statusColor === "green" ? "bg-green-100 text-green-700" :
                      statusColor === "red" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        statusColor === "green" ? "bg-green-500" :
                        statusColor === "red" ? "bg-red-500" :
                        "bg-yellow-500"
                      }`}></div>
                      {statusText}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      className="flex-1 text-xs font-medium py-2 px-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setSelectedAnuncioDetails(anuncio);
                        fetchOrderDetails(anuncio.order_id);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      Ver detalhes
                    </button>
                    <button 
                      className={`flex-1 text-xs font-medium py-2 px-3 rounded-lg border transition-colors ${
                        statusText === "Arte em Análise..." 
                          ? "border-gray-200 text-gray-400 cursor-not-allowed" 
                          : "border-orange-200 text-orange-600 hover:bg-orange-50"
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
            );
          })}
        </div>
        )}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm mx-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header do modal */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Trocar Arte</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
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
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="flex-1 py-3 px-4 rounded-xl bg-orange-600 text-white font-medium hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed" 
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
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
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
                    {selectedAnuncioDetails?.caminho_imagem && isVideo(selectedAnuncioDetails.caminho_imagem) ? (
                      <video
                        src={selectedAnuncioDetails.caminho_imagem}
                        className="w-32 h-32 object-cover rounded-lg"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <Image
                        src={selectedAnuncioDetails?.caminho_imagem || ''}
                        alt={orderDetails.nome_campanha || ''}
                        width={200}
                        height={200}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    )}
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

      <ToastContainer />
    </div>
  );
};

export default MeusAnuncios;
