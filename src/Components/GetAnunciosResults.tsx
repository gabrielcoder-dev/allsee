'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useCart } from '@/context/CartContext'
import { PlayIcon, ShoppingCartIcon, TrashIcon, User2, ZoomIn, Monitor, Printer, Zap } from 'lucide-react'
import ModalLogin from './ModalLogin'
import ImageModal from './ImageModal'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Anuncio = {
  id: number
  name: string
  image: string
  address: string
  screens: number
  price: number
  duration: string
  display: number
  views: number
  duration_2: boolean
  duration_4: boolean
  duration_12: boolean
  duration_24: boolean
  type_screen: string;
  nicho?: 'restaurante' | 'academia' | 'mercado' | 'padaria' | 'banco' | 'outro';
}

type GetAnunciosResultsProps = {
  onAdicionarProduto?: (produto: Anuncio) => void;
  selectedDuration?: string;
  tipoMidia?: string | null;
  bairros?: string[];
  orderBy?: string;
  onChangeAnunciosFiltrados?: (anuncios: Anuncio[]) => void;
  userNicho?: string | null;
  onSpecificTotemFound?: (totemId: number) => void;
  specificTotemId?: number | null;
}

export default function GetAnunciosResults({ onAdicionarProduto, selectedDuration = '2', tipoMidia, bairros, orderBy, onChangeAnunciosFiltrados, userNicho, onSpecificTotemFound, specificTotemId }: GetAnunciosResultsProps) {
  const { adicionarProduto, removerProduto, produtos, atualizarProdutosComNovaDuracao } = useCart()
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loading, setLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [modalImage, setModalImage] = useState<{ image: string, name: string, address: string } | null>(null)

  // Função para ordenar anúncios
  const ordenarAnuncios = (anuncios: Anuncio[], orderBy: string) => {
    if (!orderBy) return anuncios;
    
    return [...anuncios].sort((a, b) => {
      if (orderBy === 'price-asc') {
        return a.price - b.price;
      } else if (orderBy === 'price-desc') {
        return b.price - a.price;
      }
      return 0;
    });
  };

  // Função para reordenar com totem específico primeiro
  const reorderWithSpecificTotem = (anuncios: Anuncio[], specificTotemId: number) => {
    const specificTotem = anuncios.find(anuncio => anuncio.id === specificTotemId);
    const otherAnuncios = anuncios.filter(anuncio => anuncio.id !== specificTotemId);
    
    if (specificTotem) {
      return [specificTotem, ...otherAnuncios];
    }
    
    return anuncios;
  };

  useEffect(() => {
    async function fetchAnuncios() {
      setLoading(true)
      let durationColumn = 'duration_2';
      if (selectedDuration === '4') durationColumn = 'duration_4';
      if (selectedDuration === '12') durationColumn = 'duration_12';
      if (selectedDuration === '24') durationColumn = 'duration_24';
      let query = supabase
        .from('anuncios')
        .select('*')
        .eq(durationColumn, true)
        .order('id', { ascending: false });
      if (tipoMidia) {
        query = query.eq('type_screen', tipoMidia);
      }
      const { data, error } = await query;
      // Garante que data e filteredData são arrays
      const anunciosData: any[] = Array.isArray(data) ? data : [];
      let filteredData: any[] = anunciosData;
      if (!error) {
        // Filtrar por nicho do usuário
        if (userNicho && userNicho !== 'outro') {
          // Se o usuário tem nicho específico (não é 'outro'), excluir totens do mesmo nicho
          filteredData = anunciosData.filter((anuncio: any) => 
            anuncio.nicho !== userNicho
          );
        }
        // Se userNicho é 'outro' ou null, mostrar todos os totens
        
        // Filtrar por bairros (address) - mas sempre incluir o totem específico se selecionado
        if (bairros && bairros.length > 0) {
          const filteredByAddress = filteredData.filter((anuncio: any) =>
            bairros.some(bairro => anuncio.address?.toLowerCase().includes(bairro.toLowerCase()))
          );
          
          // Se há um totem específico selecionado, garantir que ele apareça mesmo se não passar no filtro
          if (specificTotemId) {
            const specificTotem = filteredData.find(anuncio => anuncio.id === specificTotemId);
            if (specificTotem && !filteredByAddress.find(a => a.id === specificTotemId)) {
              console.log('🎯 Adicionando totem específico que não passou no filtro:', specificTotem.name);
              filteredData = [specificTotem, ...filteredByAddress];
            } else {
              filteredData = filteredByAddress;
            }
          } else {
            filteredData = filteredByAddress;
          }
        }
        // Aplicar ordenação
        let anunciosOrdenados = ordenarAnuncios(filteredData, orderBy || '');
        
        // Reordenar se há um totem específico selecionado
        if (specificTotemId) {
          console.log('🎯 Reordenando com totem específico:', specificTotemId);
          anunciosOrdenados = reorderWithSpecificTotem(anunciosOrdenados, specificTotemId);
          console.log('🎯 Anúncios após reordenação:', anunciosOrdenados.map(a => ({ id: a.id, name: a.name })));
        }
        
        setAnuncios(anunciosOrdenados)
        atualizarProdutosComNovaDuracao(anunciosOrdenados, selectedDuration);
        if (onChangeAnunciosFiltrados) onChangeAnunciosFiltrados(anunciosOrdenados);
        
        // Se há apenas 1 totem e há bairros filtrados, provavelmente é um totem específico
        if (anunciosOrdenados.length === 1 && bairros && bairros.length > 0) {
          console.log('🎯 Totem específico encontrado:', anunciosOrdenados[0]);
          if (onSpecificTotemFound) {
            onSpecificTotemFound(anunciosOrdenados[0].id);
          }
        }
      } else {
        console.error("Erro ao carregar anúncios:", error);
        setAnuncios([]);
        atualizarProdutosComNovaDuracao([], selectedDuration);
        if (onChangeAnunciosFiltrados) onChangeAnunciosFiltrados([]);
      }
      setLoading(false)
    }
    fetchAnuncios()
  }, [selectedDuration, tipoMidia, JSON.stringify(bairros), orderBy, userNicho])



  if (loading) return <div>Carregando anúncios...</div>
  if (!anuncios.length) {
    if (userNicho && userNicho !== 'outro') {
      return (
        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 max-w-md">
              <h3 className="text-lg font-semibold text-orange-800 mb-2">
                Nenhum totem disponível
              </h3>
              <p className="text-orange-700 mb-4">
                Não há totens disponíveis para o seu nicho ({userNicho}). 
                Os totens do mesmo nicho não são exibidos para evitar concorrência.
              </p>
              <p className="text-sm text-orange-600">
                Você pode alterar seu nicho no perfil para ver mais opções.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return <div>Nenhum anúncio encontrado.</div>
  }

  return (
    <>
      {showLoginModal && <ModalLogin onClose={() => setShowLoginModal(false)} />}
      {modalImage && (
        <ImageModal imageUrl={modalImage.image} name={modalImage.name} address={modalImage.address} onClose={() => setModalImage(null)} />
      )}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 p-4 pb-32 md:pb-12">
          {anuncios.map(anuncio => {
            const estaNoCarrinho = produtos.some(p => p.id === anuncio.id.toString())
            // Lógica de cálculo de preço
            const durationsTrue = [
              anuncio.duration_2,
              anuncio.duration_4,
              anuncio.duration_12,
              anuncio.duration_24
            ].filter(Boolean).length;

            // Lógica de desconto por semanas
            const descontos: { [key: string]: number } = {
              '4': 20,
              '12': 60,
              '24': 120,
            };

            let precoCalculado = anuncio.price;
            let displayCalculado = anuncio.display;
            let viewsCalculado = anuncio.views;
            let desconto = 0;

            if (durationsTrue > 1) {
              if (selectedDuration === '4') {
                precoCalculado = anuncio.price * 2;
                displayCalculado = anuncio.display * 2;
                viewsCalculado = anuncio.views * 2;
                desconto = descontos['4'];
              }
              if (selectedDuration === '12') {
                precoCalculado = anuncio.price * 6;
                displayCalculado = anuncio.display * 6;
                viewsCalculado = anuncio.views * 6;
                desconto = descontos['12'];
              }
              if (selectedDuration === '24') {
                precoCalculado = anuncio.price * 12;
                displayCalculado = anuncio.display * 12;
                viewsCalculado = anuncio.views * 12;
                desconto = descontos['24'];
              }
            }
            precoCalculado = precoCalculado - desconto;
            return (
              <div
                key={anuncio.id}
                className="
                  bg-white rounded-2xl shadow-lg border border-gray-100 p-3 flex flex-col gap-1
                  w-full max-w-xl h-[440px]
                  transition-all
                  hover:shadow-xl
                "
              >
                <div className="rounded-lg overflow-hidden h-48 flex items-center justify-center bg-gray-100 mb-2 cursor-pointer relative group" onClick={() => setModalImage({ image: anuncio.image, name: anuncio.name, address: anuncio.address })}>
                  <img
                    src={anuncio.image}
                    alt={anuncio.name}
                    className="object-cover w-full h-48"
                  />
                  {/* Overlay de hover */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <ZoomIn className="text-white w-6 h-6" />
                  </div>
                </div>
                <div className="flex gap-2 mb-2">
                  {anuncio.type_screen?.toLowerCase() === 'impresso' ? (
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
                      <Printer className="w-4 h-4 mr-1 inline" /> impresso
                    </span>
                  ) : (
                    <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
                      <Monitor className="w-4 h-4 mr-1 inline" /> digital
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-lg">{anuncio.name}</h3>
                <div className="text-gray-500 text-xs mb-1">{anuncio.address}</div>
                <div className="flex gap-4 mb-1">
                  <div className="flex flex-col items-start">
                    <span className="text-[9px] text-gray-500 font-medium lowercase flex items-center gap-1">exibições <span className="text-[9px]"><PlayIcon className='w-2.5' /></span></span>
                    <span className="font-bold text-sm">
                      {String(anuncio.display) === 'fixo'
                        ? 'fixo'
                        : anuncio.type_screen === 'digital'
                          ? formatarMilhar(displayCalculado)
                          : formatarMilhar(Number(anuncio.display) && !isNaN(Number(anuncio.display)) ? Number(anuncio.display) : 0)}
                    </span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[9px] text-gray-500 font-medium lowercase flex items-center gap-1">alcance <span className="text-[9px]"><User2 className='w-2.5' /></span></span>
                    <span className="font-bold text-sm">{formatarMilhar(viewsCalculado)}</span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[9px] text-gray-500 font-medium lowercase flex items-center gap-1">impacto <span className="text-[9px]"><Zap className='w-2.5' /></span></span>
                    <span className="font-bold text-sm">{formatarMilhar(viewsCalculado * 3)}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-800 mb-1 font-bold">Telas: {anuncio.screens}</div>
                {/* Preço original riscado e preço com desconto */}
                {(() => {
                  let precoOriginal = anuncio.price;
                  if (durationsTrue > 1) {
                    if (selectedDuration === '4') precoOriginal = anuncio.price * 2;
                    if (selectedDuration === '12') precoOriginal = anuncio.price * 6;
                    if (selectedDuration === '24') precoOriginal = anuncio.price * 12;
                  }
                  return (
                    <div className="mb-1 flex flex-col gap-1">
                      {precoOriginal !== precoCalculado && (
                        <span className="text-sm text-gray-400 line-through">R$ {Number(precoOriginal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      )}
                      <span className="text-lg font-bold text-green-700">R$ {Number(precoCalculado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  );
                })()}
                <div className="text-xs text-gray-500 mb-2">/ {selectedDuration} semana{Number(selectedDuration) > 1 ? 's' : ''}</div>
                <button
                  className={`w-full cursor-pointer flex items-center justify-center gap-4 border rounded-lg py-2 text-base font-semibold transition ${estaNoCarrinho ? 'border-red-400 text-red-600 hover:bg-red-50' : 'border-green-400 text-green-600 hover:bg-green-50'}`}
                  onClick={async () => {
                    // Verifica autenticação
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                      setShowLoginModal(true);
                      return;
                    }
                    if (estaNoCarrinho) {
                      removerProduto(anuncio.id.toString())
                    } else {
                      adicionarProduto({
                        id: anuncio.id.toString(),
                        nome: anuncio.name,
                        preco: anuncio.price,
                        precoMultiplicado: precoCalculado,
                        selectedDuration: selectedDuration,
                        quantidade: 1,
                        image: anuncio.image,
                        endereco: anuncio.address,
                        screens: anuncio.screens,
                        display: anuncio.display,
                        views: anuncio.views,
                        duration_2: anuncio.duration_2,
                        duration_4: anuncio.duration_4,
                        duration_12: anuncio.duration_12,
                        duration_24: anuncio.duration_24,
                        type_screen: anuncio.type_screen && anuncio.type_screen.trim() ? anuncio.type_screen : 'digital',
                      })
                    }
                  }}
                >
                  {estaNoCarrinho ? (
                    <>remover ponto <TrashIcon className="inline w-4 h-4 mr-1" /></>
                  ) : (
                    <>adicionar ponto <ShoppingCartIcon className="inline w-4 h-4 mr-1" /></>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function formatarMilhar(valor: number) {
  if (valor >= 1000) {
    return (valor / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mil';
  }
  return valor?.toLocaleString('pt-BR');
}