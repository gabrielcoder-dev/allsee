'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { orangePinIcon } from './CustomMarkerIcon';
import MiniAnuncioCard from './MiniAnuncioCard';
import { MapIcon, PanelLeftIcon } from 'lucide-react'

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
  highlightedMarkerId
}: { 
  onCityFound?: (coords: { lat: number; lng: number; totemId?: number }) => void;
  markers: MarkerType[];
  highlightedMarkerId?: number | null;
}) {
  const map = useMap();

  // Função para navegar para uma cidade
  const navigateToCity = (coords: { lat: number; lng: number }, totemId?: number) => {
    console.log('Navegando para:', coords, 'totemId:', totemId);
    
    // Se for um totem específico, navegar para ele com zoom mais próximo
    if (totemId) {
      const totemMarker = markers.find(marker => marker.id === totemId);
      if (totemMarker) {
        console.log('Encontrou marker para totem:', totemMarker);
                 // Navegar para as coordenadas exatas do marker com zoom bem próximo
         map.setView([totemMarker.lat, totemMarker.lng], 15, {
           animate: true,
           duration: 1.5
         });
        return;
      } else {
        console.log('Não encontrou marker para totemId:', totemId);
      }
    }

         // Se não encontrou o marker ou não é totem específico, navegar para as coordenadas fornecidas
     console.log('Navegando para coordenadas:', coords);
     map.setView([coords.lat, coords.lng], 14, {
       animate: true,
       duration: 1.5
     });
  };

  // Expor a função globalmente
  useEffect(() => {
    (window as any).navigateToCity = navigateToCity;
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

  useEffect(() => {
    setMounted(true)
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
      className: 'highlighted-marker',
      html: '<div style="background: #ff6b35; border: 3px solid #fff; border-radius: 50%; width: 25px; height: 25px; box-shadow: 0 0 15px rgba(255,107,53,0.9); animation: pulse 1.5s infinite;"></div>',
      iconSize: [25, 25],
      iconAnchor: [12, 12]
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
      // Encontrar o marker que tem o anuncio_id igual ao specificTotemId
      const markerToHighlight = markers.find(marker => marker.anuncio_id === specificTotemId);
      if (markerToHighlight) {
        console.log('🎯 Marker encontrado para destacar:', markerToHighlight);
        setHighlightedMarkerId(markerToHighlight.id);
        
        // Navegar para o marker
        if ((window as any).navigateToCity) {
          (window as any).navigateToCity(
            { lat: markerToHighlight.lat, lng: markerToHighlight.lng }, 
            markerToHighlight.id
          );
        }
      } else {
        console.log('❌ Marker não encontrado para totemId:', specificTotemId);
      }
    }
  }, [specificTotemId, markers]);

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

  if (loading) {
    return (
      <div className={`${isFullscreen ? 'w-full' : 'hidden xl:flex w-[400px]'} flex-shrink-0 z-0 items-center justify-center`} style={{ height: '100vh' }}>
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="text-sm text-gray-600">Carregando totens no mapa...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${isFullscreen ? 'w-full' : 'hidden xl:flex w-[400px]'} flex-shrink-0 z-0 map-container relative`}
      style={{ height: `${mapHeight}px`, background: '#fff' }}
    >
      {/* Botão de alternância do mapa */}
      {onToggleMapView && (
        <button
          onClick={onToggleMapView}
          className="absolute top-4 right-4 z-[1000] map-toggle-button rounded-lg px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors"
        >
          {isFullscreen ? (
            <>
              <PanelLeftIcon className="w-4 h-4" />
              Ver em lateral
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
          highlightedMarkerId={highlightedMarkerId}
        />
        
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={18}
          minZoom={1}
        />

        {markersToDisplay.map((marker) => {
          if (highlightedMarkerId === marker.id) {
            console.log('⭐ Renderizando marker destacado:', marker.id);
          }
          return (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={highlightedMarkerId === marker.id ? createHighlightedIcon(marker.id) : orangePinIcon}
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