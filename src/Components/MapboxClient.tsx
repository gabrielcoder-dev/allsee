'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { orangePinIcon, highlightedPinIcon } from './CustomMarkerIcon';
import MiniAnuncioCard from './MiniAnuncioCard';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
})

// Coordenadas de Primavera do Leste, MT
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
  const [highlightedMarkerId, setHighlightedMarkerId] = useState<number | null>(null);
  const markerRefs = useRef<{ [key: number]: any }>({});

  // Função para navegar para uma cidade
  const navigateToCity = (coords: { lat: number; lng: number }, totemId?: number) => {
    console.log('Navegando para:', coords, 'totemId:', totemId);
    
    // Se for um totem específico, navegar para ele
    if (totemId) {
      const totemMarker = markers.find(marker => marker.anuncio_id === totemId);
      if (totemMarker) {
        console.log('Navegando para totem específico:', totemMarker);
        map.setView([totemMarker.lat, totemMarker.lng], 16, {
          animate: true,
          duration: 1.5
        });
        
        // Destacar o marker
        setHighlightedMarkerId(totemMarker.id);
        
        // Remover destaque após 3 segundos
        setTimeout(() => {
          setHighlightedMarkerId(null);
        }, 3000);
        
        return;
      }
    }

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
    }
  };

  // Função para destacar um marker específico
  const setHighlightedMarker = (markerId: number) => {
    console.log('Destacando marker:', markerId);
    setHighlightedMarkerId(markerId);
    
    // Remover destaque após 3 segundos
    setTimeout(() => {
      setHighlightedMarkerId(null);
    }, 3000);
  };

  // Função para abrir o popup de um marker específico
  const openMarkerPopup = (markerId: number) => {
    console.log('Abrindo popup do marker:', markerId);
    const markerRef = markerRefs.current[markerId];
    if (markerRef && markerRef.leafletElement) {
      markerRef.leafletElement.openPopup();
    }
  };

  // Expor as funções globalmente
  useEffect(() => {
    (window as any).navigateToCity = navigateToCity;
    (window as any).setHighlightedMarker = setHighlightedMarker;
    (window as any).openMarkerPopup = openMarkerPopup;
  }, [navigateToCity, setHighlightedMarker, openMarkerPopup]);

  // Garantir que o mapa sempre inicie em Primavera do Leste
  useEffect(() => {
    const timer = setTimeout(() => {
      map.setView(PRIMAVERA_DO_LESTE_COORDS, 13);
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

export default function Mapbox({ anunciosFiltrados, onCityFound, userNicho }: { 
  anunciosFiltrados?: any[], 
  onCityFound?: (coords: { lat: number; lng: number; totemId?: number }) => void,
  userNicho?: string | null 
}) {
  const [mapHeight, setMapHeight] = useState<number>(0)
  const [markers, setMarkers] = useState<MarkerType[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [highlightedMarkerId, setHighlightedMarkerId] = useState<number | null>(null);
  const markerRefs = useRef<{ [key: number]: any }>({});

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
      setMapHeight(viewportHeight - headerHeight)
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
  if (loading) return <div className="hidden xl:flex w-[400px] flex-shrink-0 z-0 items-center justify-center map-loading" style={{ height: '100%' }}>Carregando totens no mapa...</div>

  return (
    <div
      className="hidden xl:flex w-[400px] flex-shrink-0 z-0 map-container"
      style={{ height: `${mapHeight}px`, background: '#fff' }}
    >
      <MapContainer
        center={PRIMAVERA_DO_LESTE_COORDS}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        whenReady={() => {}}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        boxZoom={true}
        keyboard={true}
        dragging={true}
      >
        <MapController 
          onCityFound={onCityFound}
          markers={markers}
        />
        
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
          minZoom={10}
        />

        {markersToDisplay.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={highlightedMarkerId === marker.id ? highlightedPinIcon : orangePinIcon}
            ref={(ref) => {
              if (ref) {
                markerRefs.current[marker.id] = ref;
              }
            }}
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
