'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useCart } from '@/context/CartContext'
import { PlayIcon, ShoppingCartIcon, TrashIcon, User2, ZoomIn, Monitor, Printer, Zap, Smartphone } from 'lucide-react'
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
  screen_type?: 'standing' | 'down';
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
  isInitialLoading?: boolean;
  selectedCity?: { lat: number; lng: number; name: string } | null;
}

export default function GetAnunciosResults({ onAdicionarProduto, selectedDuration = '2', tipoMidia, bairros, orderBy, onChangeAnunciosFiltrados, userNicho, onSpecificTotemFound, specificTotemId, isInitialLoading = false, selectedCity }: GetAnunciosResultsProps) {
  const { adicionarProduto, removerProduto, produtos, atualizarProdutosComNovaDuracao } = useCart()
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loading, setLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [modalImage, setModalImage] = useState<{ image: string, name: string, address: string } | null>(null)
  const [noResults, setNoResults] = useState(false)

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
      console.log('🔄 GetAnunciosResults - useEffect executado');
      console.log('📊 Parâmetros:', { selectedDuration, tipoMidia, bairros, specificTotemId, userNicho, selectedCity });
      
      setLoading(true)
      setNoResults(false)
      
      // Se há uma cidade selecionada, buscar totens da cidade
      if (selectedCity) {
        console.log('🏙️ Buscando totens para cidade:', selectedCity.name);
        
        try {
          const response = await fetch(`/api/anuncios-por-cidade?cityLat=${selectedCity.lat}&cityLng=${selectedCity.lng}&cityName=${encodeURIComponent(selectedCity.name)}&radius=50`);
          const cityData = await response.json();
          
          console.log('📊 Totens encontrados na cidade:', cityData.totens.length);
          
          if (cityData.totens.length === 0) {
            setAnuncios([]);
            setNoResults(true);
            setLoading(false);
            return;
          }
          
          // Filtrar por duração
          let durationColumn = 'duration_2';
          if (selectedDuration === '4') durationColumn = 'duration_4';
          if (selectedDuration === '12') durationColumn = 'duration_12';
          if (selectedDuration === '24') durationColumn = 'duration_24';
          
          let filteredTotens = cityData.totens.filter((totem: any) => totem[durationColumn]);
          
          // Filtrar por tipo de mídia se especificado
          if (tipoMidia) {
            filteredTotens = filteredTotens.filter((totem: any) => totem.type_screen === tipoMidia);
          }
          
          // Filtrar por nicho do usuário
          if (userNicho && userNicho !== 'outro') {
            filteredTotens = filteredTotens.filter((totem: any) => totem.nicho !== userNicho);
          }
          
          console.log('✅ Totens filtrados para cidade:', filteredTotens.length);
          
          if (filteredTotens.length === 0) {
            setAnuncios([]);
            setNoResults(true);
            setLoading(false);
            return;
          }
          
          // Aplicar ordenação
          const anunciosOrdenados = ordenarAnuncios(filteredTotens, orderBy || '');
          
          setAnuncios(anunciosOrdenados);
          atualizarProdutosComNovaDuracao(anunciosOrdenados, selectedDuration);
          if (onChangeAnunciosFiltrados) {
            onChangeAnunciosFiltrados(anunciosOrdenados);
          }
          
          setLoading(false);
          return;
          
        } catch (error) {
          console.error('❌ Erro ao buscar totens da cidade:', error);
          setAnuncios([]);
          setNoResults(true);
          setLoading(false);
          return;
        }
      }
      
      // Lógica original para busca normal (sem cidade selecionada)
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
          console.log('🔍 Filtrando por bairros:', bairros);
          console.log('🔍 Total de anúncios antes do filtro:', filteredData.length);
          
          // Se há um totem específico selecionado, sempre incluí-lo primeiro
          let specificTotem = null;
          if (specificTotemId) {
            specificTotem = filteredData.find(anuncio => anuncio.id === specificTotemId);
            console.log('🎯 Totem específico encontrado:', specificTotem ? specificTotem.name : 'não encontrado');
          }
          
          const filteredByAddress = filteredData.filter((anuncio: any) =>
            bairros.some(bairro => {
              // Busca mais flexível - verificar se o endereço contém o termo ou vice-versa
              const anuncioAddress = anuncio.address?.toLowerCase() || '';
              const searchTerm = bairro.toLowerCase();
              
              // Verificar se o endereço do anúncio contém o termo de busca
              const containsTerm = anuncioAddress.includes(searchTerm);
              
              // Verificar se o termo de busca contém partes do endereço (para casos como "Primavera do Leste")
              const addressParts = anuncioAddress.split(/[,\s-]+/).filter((part: string) => part.length > 2);
              const hasMatchingPart = addressParts.some((part: string) => searchTerm.includes(part));
              
              // Verificar se há palavras-chave comuns (para incluir totens próximos)
              const commonKeywords = ['centro', 'bairro', 'rua', 'avenida', 'av', 'praça', 'shopping', 'mercado', 'feira'];
              const hasCommonKeyword = commonKeywords.some(keyword => 
                anuncioAddress.includes(keyword) && searchTerm.includes(keyword)
              );
              
              const matches = containsTerm || hasMatchingPart || hasCommonKeyword;
              
              if (matches) {
                console.log('✅ Match encontrado:', {
                  anuncioId: anuncio.id,
                  anuncioName: anuncio.name,
                  anuncioAddress: anuncio.address,
                  searchTerm: bairro,
                  containsTerm,
                  hasMatchingPart,
                  hasCommonKeyword
                });
              }
              
              return matches;
            })
          );
          
          console.log('🔍 Anúncios após filtro por endereço:', filteredByAddress.length);
          
          // Se há um totem específico, colocá-lo primeiro e depois os outros filtrados
          if (specificTotem) {
            // Remover o totem específico da lista filtrada se estiver lá
            const otherFilteredTotems = filteredByAddress.filter(a => a.id !== specificTotemId);
            filteredData = [specificTotem, ...otherFilteredTotems];
            console.log('🎯 Totem específico colocado primeiro:', specificTotem.name);
            console.log('🎯 Outros totens filtrados:', otherFilteredTotems.map(a => a.name));
            console.log('🎯 Resultado final com totem específico primeiro:', filteredData.map(a => ({ id: a.id, name: a.name, address: a.address })));
          } else {
            filteredData = filteredByAddress;
            console.log('⚠️ Totem específico não encontrado, usando apenas filtro por endereço');
          }
        } else if (specificTotemId) {
          // Se não há filtro por bairros mas há totem específico, mostrar todos os totens
          console.log('🎯 Totem específico selecionado sem filtro de bairros - mostrando todos os totens');
        }
        // Aplicar ordenação, mas preservar o totem específico na primeira posição
        let anunciosOrdenados = ordenarAnuncios(filteredData, orderBy || '');
        
        // Se há um totem específico e ele não está na primeira posição após ordenação, colocá-lo lá
        if (specificTotemId && anunciosOrdenados.length > 0) {
          const specificTotemIndex = anunciosOrdenados.findIndex(a => a.id === specificTotemId);
          if (specificTotemIndex > 0) {
            console.log('🔄 Recolocando totem específico na primeira posição após ordenação');
            const specificTotem = anunciosOrdenados[specificTotemIndex];
            const otherAnuncios = anunciosOrdenados.filter(a => a.id !== specificTotemId);
            anunciosOrdenados = [specificTotem, ...otherAnuncios];
            console.log('🎯 Ordem final após correção:', anunciosOrdenados.map(a => ({ id: a.id, name: a.name })));
          }
        }
        
        console.log('✅ Resultado final:', {
          totalAnuncios: anunciosOrdenados.length,
          anuncios: anunciosOrdenados.map(a => ({ id: a.id, name: a.name, address: a.address }))
        });
        
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
  }, [selectedDuration, tipoMidia, JSON.stringify(bairros), orderBy, userNicho, specificTotemId, selectedCity])



  if (loading && !isInitialLoading) return <div>Carregando anúncios...</div>
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

  // Se não há resultados para a cidade selecionada
  if (noResults) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
          <div className="text-center">
            <div className="mb-6">
              <svg className="w-24 h-24 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Sem resultados</h3>
            <p className="text-gray-500 mb-4">
              Não encontramos totens disponíveis na cidade selecionada.
            </p>
            <p className="text-sm text-gray-400">
              Tente selecionar outra cidade ou verificar se há totens próximos.
            </p>
          </div>
        </div>
      </div>
    );
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
                  {/* Ícone de posição da tela */}
                  {anuncio.screen_type && (
                    <div className="absolute flex items-center gap-1 top-2 right-2 bg-orange-500/90 backdrop-blur-sm rounded-full p-1.5 shadow-md">
                      <span className="text-white text-xs font-medium">{anuncio.screen_type === 'down' ? 'Deitado' : 'Em pé'}</span>
                      <Smartphone 
                        className={`w-4 h-4 text-white ${
                          anuncio.screen_type === 'down' ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  )}
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