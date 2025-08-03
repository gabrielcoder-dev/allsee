'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { orangePinIcon } from './CustomMarkerIcon';
import MiniAnuncioCard from './MiniAnuncioCard';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
})

// Coordenadas de Primavera do Leste, MT - Centralizada para mostrar melhor os bairros
const PRIMAVERA_DO_LESTE_COORDS: LatLngTuple = [-15.5586, -54.2811]

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
        map.setView([totemMarker.lat, totemMarker.lng], 17, {
          animate: true,
          duration: 2.5
        });
        
        return;
      } else {
        console.log('❌ Totem não encontrado no mapa. ID buscado:', totemId);
        console.log('📍 Coordenadas disponíveis:', markers.map(m => ({ anuncio_id: m.anuncio_id, lat: m.lat, lng: m.lng })));
        
        // Fallback: navegar para as coordenadas fornecidas mesmo sem marker
        console.log('🗺️ Navegando para coordenadas fornecidas (fallback):', coords);
        map.setView([coords.lat, coords.lng], 17, {
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
        map.setView([coords.lat, coords.lng], 16, {
          animate: true,
          duration: 1.5
        });
      } else {
        // Se não há markers próximos, voltar para Primavera do Leste
        console.log('🏠 Nenhum marker próximo, voltando para Primavera do Leste');
        map.setView(PRIMAVERA_DO_LESTE_COORDS, 16, {
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
      map.setView(PRIMAVERA_DO_LESTE_COORDS, 16);
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

  useEffect(() => {
    setMounted(true)
  }, [])

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
        .select('id, anuncio_id, lat, lng, anuncio:anuncio_id(*)')
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
        zoom={16}
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

        {markersToDisplay.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={orangePinIcon}
          >
            <Popup minWidth={200} maxWidth={300}>
              <MiniAnuncioCard anuncio={marker.anuncio} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
