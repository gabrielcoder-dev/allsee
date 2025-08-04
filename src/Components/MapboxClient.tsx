'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { orangePinIcon, greenPinIcon } from './CustomMarkerIcon';
import MiniAnuncioCard from './MiniAnuncioCard';
import { useCart } from '../context/CartContext';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
})

// Coordenadas de Primavera do Leste, MT - Centralizada ainda mais para a esquerda para mostrar todos os totens
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
    image?: string;
    adress?: string;
    endereco?: string;
    price?: number;
    duration?: number;
    nicho?: string;
    type_screen?: string;
    display?: number;
    views?: number;
    screens?: number;
    duration_2?: boolean;
    duration_4?: boolean;
    duration_12?: boolean;
    duration_24?: boolean;
  };
};

// Componente para controlar o mapa
function MapController({ 
  onCityFound, 
  markers 
}: { 
  onCityFound?: (coords: { lat: number; lng: number; totemId?: number }) => void;
  markers: MarkerType[];
}) {
  const map = useMap();

  // Função para navegar para uma cidade
  const navigateToCity = (coords: { lat: number; lng: number }, totemId?: number) => {
    console.log('🗺️ Navegando para:', coords, 'totemId:', totemId);
    
    // Se for um totem específico, navegar para ele
    if (totemId) {
      console.log('🔍 Procurando totem com ID:', totemId);
      console.log('📍 Markers disponíveis:', markers.map(m => ({ id: m.id, anuncio_id: m.anuncio_id, lat: m.lat, lng: m.lng })));
      
      const totemMarker = markers.find(marker => marker.anuncio_id === totemId);
      if (totemMarker) {
        console.log('✅ Totem encontrado no mapa:', totemMarker);
        
                 // Centralizar o totem com zoom mais próximo e animação suave
         map.setView([totemMarker.lat, totemMarker.lng], 15, {
           animate: true,
           duration: 2.5
         });
        
        return;
      } else {
        console.log('❌ Totem não encontrado no mapa. ID buscado:', totemId);
        console.log('📍 Coordenadas disponíveis:', markers.map(m => ({ anuncio_id: m.anuncio_id, lat: m.lat, lng: m.lng })));
        
                 // Fallback: navegar para as coordenadas fornecidas mesmo sem marker
         console.log('🗺️ Navegando para coordenadas fornecidas (fallback):', coords);
         map.setView([coords.lat, coords.lng], 15, {
           animate: true,
           duration: 2.5
         });
      }
    } else {
      // Navegação para cidade (não totem específico)
      console.log('🏙️ Navegando para cidade:', coords);
      
      // Verificar se há markers próximos à cidade (dentro de 50km)
      const hasNearbyMarkers = markers.some(marker => {
        const distance = Math.sqrt(
          Math.pow(marker.lat - coords.lat, 2) + 
          Math.pow(marker.lng - coords.lng, 2)
        ) * 111;
        return distance <= 50;
      });

      console.log('Há markers próximos?', hasNearbyMarkers);

              // Navegar se houver markers próximos
             if (hasNearbyMarkers) {
         console.log('Navegando para cidade:', coords);
         map.setView([coords.lat, coords.lng], 14, {
           animate: true,
           duration: 1.5
         });
       } else {
         // Se não há markers próximos, voltar para Primavera do Leste
         console.log('🏠 Nenhum marker próximo, voltando para Primavera do Leste');
         map.setView(PRIMAVERA_DO_LESTE_COORDS, 14, {
           animate: true,
           duration: 1.5
         });
       }
    }
  };

  // Expor as funções globalmente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).navigateToCity = navigateToCity;
    }
  }, [navigateToCity]);

  // Garantir que o mapa sempre inicie em Primavera do Leste
  useEffect(() => {
    const timer = setTimeout(() => {
      map.setView(PRIMAVERA_DO_LESTE_COORDS, 14);
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

export default function Mapbox({ anunciosFiltrados, onCityFound, userNicho, isFullscreen = false }: { 
  anunciosFiltrados?: any[], 
  onCityFound?: (coords: { lat: number; lng: number; totemId?: number }) => void,
  userNicho?: string | null,
  isFullscreen?: boolean
}) {
  const [mapHeight, setMapHeight] = useState<number>(0)
  const [markers, setMarkers] = useState<MarkerType[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0)
  
  // Usar try-catch para evitar erros de contexto
  let produtos: any[] = [];
  try {
    const cartContext = useCart();
    produtos = cartContext.produtos || [];
  } catch (error) {
    console.warn('Erro ao acessar contexto do carrinho:', error);
    produtos = [];
  }

  // Forçar re-renderização quando o carrinho mudar
  useEffect(() => {
    console.log('🔄 Carrinho mudou, forçando re-renderização:', {
      produtosLength: produtos.length,
      produtosIds: produtos.map(p => p.id),
      forceUpdate: forceUpdate + 1
    });
    setForceUpdate(prev => prev + 1);
  }, [produtos]);

  useEffect(() => {
    setMounted(true)
  }, [])

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

  useEffect(() => {
    function updateHeight() {
      const header = document.getElementById('header-price')
      const headerHeight = header ? header.offsetHeight : 64
      const viewportHeight = window.visualViewport
        ? window.visualViewport.height
        : window.innerHeight
      
      // Se estiver em modo tela cheia, usar toda a altura disponível
      if (isFullscreen) {
        setMapHeight(viewportHeight - headerHeight)
      } else {
        setMapHeight(viewportHeight - headerHeight)
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
  }, [mounted, isFullscreen])

  useEffect(() => {
    async function fetchMarkers() {
      setLoading(true)
      const { data, error } = await supabase
        .from('markers')
        .select('id, anuncio_id, lat, lng, anuncio:anuncio_id(id, name, nome, image, address, adress, endereco, price, duration, nicho, type_screen, display, views, screens, duration_2, duration_4, duration_12, duration_24)')
      if (error || !data) {
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
      setLoading(false)
    }
    if (mounted) fetchMarkers()
  }, [mounted])

  // Filtrar markers baseado no nicho do usuário
  const markersToDisplay = markers.filter(marker => {
    if (!userNicho || userNicho === 'outro') {
      return true;
    }
    return marker.anuncio?.nicho !== userNicho;
  });

  console.log('Markers para exibir:', markersToDisplay);

  if (!mounted || mapHeight === 0) return null
  if (loading) return <div className={`${isFullscreen ? 'w-full' : 'hidden xl:flex w-[400px]'} flex-shrink-0 z-0 items-center justify-center map-loading`} style={{ height: '100%' }}>Carregando totens no mapa...</div>

  return (
    <div
      className={`${isFullscreen ? 'w-full' : 'hidden xl:flex w-[400px]'} flex-shrink-0 z-0 map-container`}
      style={{ height: `${mapHeight}px`, background: '#fff' }}
    >
             <MapContainer
         center={PRIMAVERA_DO_LESTE_COORDS}
         zoom={14}
         style={{ width: '100%', height: '100%' }}
        whenReady={() => {}}
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
        />
        
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={18}
          minZoom={1}
        />

        {markersToDisplay.map((marker) => {
          // Pegar todos os IDs dos totens que estão no carrinho
          const idsNoCarrinho = produtos.map(p => p.id);
          
          // Verificar se o ID do marker está na lista de IDs do carrinho
          const markerAnuncioId = marker.anuncio_id?.toString();
          const estaNoCarrinho = idsNoCarrinho.includes(markerAnuncioId);
          
          // Log simples para debug
          if (produtos.length > 0) {
            console.log(`🎯 Marker ${marker.id}: anuncio_id=${markerAnuncioId}, no carrinho=${estaNoCarrinho}, cor=${estaNoCarrinho ? 'VERDE' : 'LARANJA'}`);
          }
          
          return (
            <Marker
              key={`${marker.id}-${forceUpdate}-${estaNoCarrinho}`}
              position={[marker.lat, marker.lng]}
              icon={estaNoCarrinho ? greenPinIcon : orangePinIcon}
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
