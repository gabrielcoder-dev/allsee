'use client'

import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { orangePinIcon, greenPinIcon } from './CustomMarkerIcon';
import MiniAnuncioCard from './MiniAnuncioCard';
import { useCart } from '../context/CartContext';
import { MapIcon, PanelLeftIcon } from 'lucide-react'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/images/marker-icon-2x.png',
  iconUrl: '/images/marker-icon.png',
  shadowUrl: '/images/marker-shadow.png',
})

// Coordenadas de Primavera do Leste, MT - Centralizada para mostrar todos os totens
const PRIMAVERA_DO_LESTE_COORDS: LatLngTuple = [-15.5586, -54.2940]

type MarkerType = {
  id: number;
  anuncio_id: number;
  lat: number;
  lng: number;
  anuncio: {
    id: number;
    name?: string;
    nome?: string;
    adress?: string;
    endereco?: string;
    price?: number;
    duration?: number;
    nicho?: string;
  };
};

// Componente para controlar o mapa
function MapController({ 
  onCityFound, 
  markers,
  highlightedMarkerId,
  isFullscreen
}: { 
  onCityFound?: (coords: { lat: number; lng: number; totemId?: number }) => void;
  markers: MarkerType[];
  highlightedMarkerId?: number | null;
  isFullscreen?: boolean;
}) {
  const map = useMap();

  // Função para navegar para uma cidade
  const navigateToCity = (coords: { lat: number; lng: number }, totemId?: number) => {
    console.log('🗺️ SimpleMap - Navegando para:', coords, 'totemId:', totemId);
    
    // Se for um totem específico, navegar para ele com zoom mais próximo
    if (totemId) {
      const totemMarker = markers.find(marker => marker.id === totemId);
      if (totemMarker) {
        console.log('🎯 Encontrou marker para totem:', totemMarker);
        // Navegar para as coordenadas exatas do marker com zoom bem próximo
        map.setView([totemMarker.lat, totemMarker.lng], 15, {
          animate: true,
          duration: 1.5
        });
        console.log('✅ Navegação para totem concluída');
        return;
      } else {
        console.log('❌ Não encontrou marker para totemId:', totemId);
      }
    }

    // Se não encontrou o marker ou não é totem específico, navegar para as coordenadas fornecidas
    console.log('🌍 Navegando para coordenadas da cidade:', coords);
    map.setView([coords.lat, coords.lng], 14, {
      animate: true,
      duration: 1.5
    });
    console.log('✅ Navegação para cidade concluída');
  };

  // Expor a função globalmente
  useEffect(() => {
    (window as any).navigateToCity = navigateToCity;
    console.log('🗺️ Função navigateToCity exposta globalmente');
  }, [navigateToCity]);

  // Garantir que o mapa sempre inicie em Primavera do Leste apenas na primeira vez
  useEffect(() => {
    const timer = setTimeout(() => {
      // Só definir posição inicial se não houver navegação pendente
      if (!(window as any).navigateToCity) {
        map.setView(PRIMAVERA_DO_LESTE_COORDS, 14);
        console.log('🗺️ Mapa inicializado em Primavera do Leste');
      } else {
        console.log('🗺️ Navegação pendente detectada, pulando inicialização');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  // Forçar invalidação do mapa quando isFullscreen mudar
  useEffect(() => {
    if (map) {
      // Aguardar um pouco para o DOM se ajustar
      const timer = setTimeout(() => {
        map.invalidateSize();
        
        // Disparar novamente após um delay
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [map, isFullscreen]);

  return null;
}

export default function SimpleMap({ anunciosFiltrados, onCityFound, userNicho, specificTotemId, isFullscreen = false, onToggleMapView }: { 
  anunciosFiltrados?: any[], 
  onCityFound?: (coords: { lat: number; lng: number; totemId?: number }) => void,
  userNicho?: string | null,
  specificTotemId?: number | null,
  isFullscreen?: boolean,
  onToggleMapView?: () => void
}) {
  const [mapHeight, setMapHeight] = useState<number>(0)
  const [markers, setMarkers] = useState<MarkerType[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [highlightedMarkerId, setHighlightedMarkerId] = useState<number | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  
  // Acessar contexto do carrinho
  const cartContext = useCart();
  const produtos = cartContext?.produtos || [];

  // Verificação adicional para evitar erros de hidratação
  if (typeof window === 'undefined') {
    return null;
  }

  useEffect(() => {
    setMounted(true)
    
    const updateViewport = () => {
      if (typeof window !== 'undefined') {
        setIsMobileViewport(window.innerWidth < 1280)
      }
    }
    
    updateViewport()
    window.addEventListener('resize', updateViewport)
    
    // Cleanup function para limpar estado quando componente for desmontado
    return () => {
      setMounted(false)
      setMarkers([])
      setLoading(true)
      setHighlightedMarkerId(null)
      setMapHeight(0)
      window.removeEventListener('resize', updateViewport)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return;

    function updateHeight() {
      try {
        const header = document.getElementById('header-price')
        const headerHeight = header ? header.offsetHeight : 64
        const viewportHeight = window.visualViewport
          ? window.visualViewport.height
          : window.innerHeight
        
        // Sempre usar a altura disponível menos o header
        setMapHeight(viewportHeight - headerHeight)
      } catch (error) {
        console.error('Erro ao calcular altura do mapa:', error);
        setMapHeight(600); // altura padrão
      }
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight)
      window.visualViewport.addEventListener('scroll', updateHeight)
    }
    return () => {
      window.removeEventListener('resize', updateHeight)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateHeight)
        window.visualViewport.removeEventListener('scroll', updateHeight)
      }
    }
  }, [mounted])

  // Cleanup adicional quando componente for desmontado
  useEffect(() => {
    return () => {
      // Limpar funções globais
      if (typeof window !== 'undefined') {
        delete (window as any).navigateToCity;
        delete (window as any).setHighlightedMarker;
      }
    }
  }, [])

  useEffect(() => {
    if (!mounted) return;

    async function fetchMarkers() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('markers')
          .select('id, anuncio_id, lat, lng, anuncio:anuncio_id(*)')
        
        if (error) {
          console.error('Erro ao buscar markers:', error);
          setMarkers([])
          setLoading(false)
          return
        }
        
        if (!data || data.length === 0) {
          console.log('Nenhum marker encontrado');
          setMarkers([])
          setLoading(false)
          return
        }
        
        const markersFixed = data.map((marker: any) => ({
          ...marker,
          anuncio: Array.isArray(marker.anuncio) ? marker.anuncio[0] : marker.anuncio
        }));
        
        console.log('Markers carregados:', markersFixed);
        setMarkers(markersFixed)
      } catch (error) {
        console.error('Erro ao buscar markers:', error);
        setMarkers([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchMarkers()
  }, [mounted])

  // Filtrar markers baseado no nicho do usuário
  const markersToDisplay = markers.filter(marker => {
    if (!userNicho || userNicho === 'outro') {
      return true;
    }
    return marker.anuncio?.nicho !== userNicho;
  });

  console.log('Markers para exibir:', markersToDisplay);

  // Função para criar ícone destacado
  const createHighlightedIcon = (markerId: number) => {
    return L.divIcon({
      className: '', // Remover classe CSS para evitar conflitos
      html: `
        <div style="
          background: #ff6b35; 
          border: 4px solid #fff; 
          border-radius: 50%; 
          width: 30px; 
          height: 30px; 
          box-shadow: 0 0 20px rgba(255,107,53,1), 0 0 40px rgba(255,107,53,0.6);
          position: relative;
          z-index: 1000;
          animation: pulseHighlight 1.2s infinite, bounceHighlight 1.8s infinite;
        ">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 8px;
            height: 8px;
            background: #fff;
            border-radius: 50%;
          "></div>
        </div>
        <style>
          @keyframes pulseHighlight {
            0% {
              transform: scale(1);
              box-shadow: 0 0 20px rgba(255, 107, 53, 1), 0 0 40px rgba(255, 107, 53, 0.6);
            }
            50% {
              transform: scale(1.3);
              box-shadow: 0 0 30px rgba(255, 107, 53, 1), 0 0 60px rgba(255, 107, 53, 0.8);
            }
            100% {
              transform: scale(1);
              box-shadow: 0 0 20px rgba(255, 107, 53, 1), 0 0 40px rgba(255, 107, 53, 0.6);
            }
          }
          @keyframes bounceHighlight {
            0%, 20%, 50%, 80%, 100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-15px);
            }
            60% {
              transform: translateY(-8px);
            }
          }
        </style>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  };

  // Limpar destaque após 5 segundos
  useEffect(() => {
    if (highlightedMarkerId) {
      const timer = setTimeout(() => {
        setHighlightedMarkerId(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightedMarkerId]);

  // Expor função para definir totem destacado
  useEffect(() => {
    (window as any).setHighlightedMarker = (markerId: number) => {
      console.log('🎯 setHighlightedMarker chamado com markerId:', markerId);
      setHighlightedMarkerId(markerId);
    };
  }, []);

  // Destacar marker quando receber specificTotemId
  useEffect(() => {
    if (specificTotemId) {
      console.log('🎯 SpecificTotemId recebido:', specificTotemId);
      console.log('🎯 Markers disponíveis:', markers.map(m => ({ id: m.id, anuncio_id: m.anuncio_id, name: m.anuncio?.name })));
      
      // Encontrar o marker que tem o anuncio_id igual ao specificTotemId
      const markerToHighlight = markers.find(marker => marker.anuncio_id === specificTotemId);
      if (markerToHighlight) {
        console.log('🎯 Marker encontrado para destacar:', markerToHighlight);
        console.log('🎯 Definindo highlightedMarkerId como:', markerToHighlight.id);
        setHighlightedMarkerId(markerToHighlight.id);
        
        // Navegar para o marker
        if ((window as any).navigateToCity) {
          console.log('🗺️ Navegando para marker:', markerToHighlight.id);
          (window as any).navigateToCity(
            { lat: markerToHighlight.lat, lng: markerToHighlight.lng }, 
            markerToHighlight.id
          );
        }
      } else {
        console.log('❌ Marker não encontrado para totemId:', specificTotemId);
        console.log('❌ Procurando por anuncio_id:', specificTotemId);
        console.log('❌ IDs disponíveis:', markers.map(m => m.anuncio_id));
      }
    }
  }, [specificTotemId, markers]);

  // Forçar renderização completa do mapa
  useEffect(() => {
    if (mounted && !loading && mapHeight > 0) {
      // Aguardar um pouco para garantir que o DOM esteja pronto
      const timer = setTimeout(() => {
        // Forçar re-render do mapa para garantir que renderize completamente
        setMapReady(true);
        
        // Adicionar um pequeno delay para garantir que o mapa seja totalmente renderizado
        setTimeout(() => {
          // Disparar evento de resize para forçar o mapa a recalcular suas dimensões
          window.dispatchEvent(new Event('resize'));
        }, 100);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [mounted, loading, mapHeight]);

  // Forçar re-renderização quando o mapa é expandido/contraído
  useEffect(() => {
    if (mapReady) {
      // Quando isFullscreen muda, forçar re-renderização do mapa
      setMapReady(false);
      
      const timer = setTimeout(() => {
        setMapReady(true);
        
        // Forçar o mapa a recalcular suas dimensões após expansão/contração
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
          
          // Disparar novamente após um pequeno delay para garantir
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 150);
        }, 100);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isFullscreen]);

  // Não renderizar até estar montado
  if (!mounted) {
    return (
      <div className={`${isFullscreen ? 'w-full' : 'hidden xl:flex w-[400px]'} flex-shrink-0 z-0 items-center justify-center`} style={{ height: '100vh' }}>
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="text-sm text-gray-600">Carregando mapa...</span>
        </div>
      </div>
    );
  }

  if (loading || !mapReady) {
    return (
      <div className={`${isFullscreen ? 'w-full' : 'hidden xl:flex w-[400px]'} flex-shrink-0 z-0 items-center justify-center`} style={{ height: '100vh' }}>
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="text-sm text-gray-600">{loading ? 'Carregando totens no mapa...' : 'Preparando mapa...'}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${isFullscreen ? 'w-full h-full' : 'hidden xl:flex w-[400px]'} flex-shrink-0 z-0 map-container relative`}
      style={{ 
        height: isFullscreen ? 'calc(100vh - 180px)' : `${mapHeight}px`, 
        background: '#fff',
        ...(isFullscreen && {
          position: 'fixed',
          top: isMobileViewport ? '0px' : '110px',
          left: '0px',
          right: '0px',
          bottom: '70px', // Acima do header price
          zIndex: 50
        })
      }}
    >
      {/* Botão de alternância do mapa */}
      {onToggleMapView && (
        <button
          onClick={onToggleMapView}
          className="absolute top-4 right-4 z-[1000] map-toggle-button rounded-lg px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors bg-white shadow-lg border"
        >
          {isFullscreen ? (
            <>
              <PanelLeftIcon className="w-4 h-4" />
              Ver em lista
            </>
          ) : (
            <>
              <MapIcon className="w-4 h-4" />
              Ver em mapa
            </>
          )}
        </button>
      )}

             <MapContainer
         center={PRIMAVERA_DO_LESTE_COORDS}
         zoom={14}
         style={{ 
           width: '100%', 
           height: '100%',
           ...(isFullscreen && {
             position: 'absolute',
             top: 0,
             left: 0,
             right: 0,
             bottom: 0
           })
         }}
        whenReady={() => {
          // Forçar o mapa a invalidar seu tamanho quando estiver pronto
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              // Disparar evento de resize para forçar o mapa a recalcular suas dimensões
              window.dispatchEvent(new Event('resize'));
            }
          }, 100);
        }}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        boxZoom={true}
        keyboard={true}
        dragging={true}
        maxBounds={undefined}
        minZoom={1}
        maxZoom={18}
        worldCopyJump={true}
      >
        <MapController 
          onCityFound={onCityFound}
          markers={markers}
          highlightedMarkerId={highlightedMarkerId}
          isFullscreen={isFullscreen}
        />
        
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={18}
          minZoom={1}
        />

        {markersToDisplay.map((marker) => {
          // Verificar se o marker está no carrinho usando o ID do anúncio
          const markerAnuncioId = marker.anuncio_id?.toString();
          const estaNoCarrinho = produtos.some(p => p.id === markerAnuncioId);
          
          // Determinar qual ícone usar
          let iconToUse = orangePinIcon;
          const isHighlighted = highlightedMarkerId === marker.id;
          
          if (isHighlighted) {
            console.log('⭐ Renderizando marker destacado:', {
              markerId: marker.id,
              anuncioId: marker.anuncio_id,
              anuncioName: marker.anuncio?.name,
              position: [marker.lat, marker.lng],
              highlightedMarkerId: highlightedMarkerId
            });
            iconToUse = createHighlightedIcon(marker.id);
          } else if (estaNoCarrinho) {
            iconToUse = greenPinIcon;
          }
          
          return (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={iconToUse}
            >
              <Popup minWidth={200} maxWidth={300}>
                <MiniAnuncioCard anuncio={marker.anuncio} />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  )
} 