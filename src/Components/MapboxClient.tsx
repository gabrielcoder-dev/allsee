'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import type { LatLngTuple, LeafletEvent } from 'leaflet'
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

type Totem = {
  id: string
  name: string
  image: string
  adress: string
  screens: number
  price: number
  duration: number
  lat?: number
  lng?: number
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
  )
  const data = await response.json()
  if (data && data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  }
  return null
}

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
  };
};

export default function Mapbox({ anunciosFiltrados, onCityFound }: { anunciosFiltrados?: any[], onCityFound?: (coords: { lat: number; lng: number; totemId?: number }) => void }) {
  // Coordenadas de Primavera do Leste, MT (coordenadas mais precisas)
  const center: LatLngTuple = [-15.5586, -54.2811]
  const [mapHeight, setMapHeight] = useState<number>(0)
  const [markers, setMarkers] = useState<MarkerType[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [highlightedMarkerId, setHighlightedMarkerId] = useState<number | null>(null)
  const mapRef = useRef<any>(null);

  // Função para navegar para uma cidade
  const navigateToCity = (coords: { lat: number; lng: number }, totemId?: number) => {
    if (mapRef.current) {
      // Se for um totem específico, destacar o marker
      if (totemId) {
        setHighlightedMarkerId(totemId)
        // Remover o destaque após 5 segundos
        setTimeout(() => setHighlightedMarkerId(null), 5000)
      }

      // Verificar se há markers próximos à cidade (dentro de 50km)
      const hasNearbyMarkers = markers.some(marker => {
        const distance = Math.sqrt(
          Math.pow(marker.lat - coords.lat, 2) + 
          Math.pow(marker.lng - coords.lng, 2)
        ) * 111; // Aproximadamente 111km por grau
        return distance <= 50; // 50km de raio
      });

      // Só navegar se houver markers próximos
      if (hasNearbyMarkers) {
        mapRef.current.setView([coords.lat, coords.lng], 14);
      }
      // Se não houver markers próximos, o mapa permanece onde está
      // e o GetAnunciosResults mostrará "totem não encontrado"
    }
  };

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
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
      // Corrigir: garantir que anuncio seja objeto, não array
      const markersFixed = data.map((marker: any) => ({
        ...marker,
        anuncio: Array.isArray(marker.anuncio) ? marker.anuncio[0] : marker.anuncio
      }));
      setMarkers(markersFixed)
      setLoading(false)
    }
    if (mounted) fetchMarkers()
  }, [mounted])

  // Filtrar markers pelos anunciosFiltrados (apenas para zoom)
  const filteredMarkers = anunciosFiltrados && anunciosFiltrados.length > 0
    ? markers.filter(m => anunciosFiltrados.some(a => a.id === m.anuncio_id))
    : [];

  // Ajustar o centro/zoom do mapa para os markers filtrados
  useEffect(() => {
    if (!mapRef.current || !filteredMarkers.length) return;
    const group = L.featureGroup(filteredMarkers.map(m => L.marker([m.lat, m.lng])));
    try {
      mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });
    } catch {}
  }, [filteredMarkers]);

  // Navegar para cidade quando encontrada
  useEffect(() => {
    if (onCityFound) {
      const handleCityFound = (coords: { lat: number; lng: number; totemId?: number }) => {
        navigateToCity(coords, coords.totemId);
        onCityFound(coords);
      };
      
      // Expor a função globalmente para que os headers possam usar
      (window as any).navigateToCity = navigateToCity;
    }
  }, [onCityFound]);

  if (!mounted || mapHeight === 0) return null
  if (loading) return <div className="hidden xl:flex w-[400px] flex-shrink-0 z-0 items-center justify-center" style={{ height: '100%' }}>Carregando totens no mapa...</div>

  return (
    <div
      className="hidden xl:flex w-[400px] flex-shrink-0 z-0"
      style={{ height: `${mapHeight}px`, background: '#fff' }}
    >
             <MapContainer
         center={center}
         zoom={13}
         style={{ width: '100%', height: '100%' }}
         whenReady={() => {}}
         ref={mapRef}
       >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={highlightedMarkerId === marker.id ? 
              L.divIcon({
                className: 'highlighted-marker',
                html: '<div style="background: #ff6b35; border: 3px solid #fff; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 0 10px rgba(255,107,53,0.8);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              }) : orangePinIcon
            }
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
