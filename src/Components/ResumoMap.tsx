'use client'

import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { greenPinIcon } from './CustomMarkerIcon';
import MiniAnuncioCard from './MiniAnuncioCard';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/images/marker-icon-2x.png',
  iconUrl: '/images/marker-icon.png',
  shadowUrl: '/images/marker-shadow.png',
})

// Coordenadas de Primavera do Leste, MT
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
  markers
}: { 
  markers: MarkerType[];
}) {
  const map = useMap();

  // Garantir que o mapa sempre inicie em Primavera do Leste
  useEffect(() => {
    const timer = setTimeout(() => {
      map.setView(PRIMAVERA_DO_LESTE_COORDS, 14);
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

export default function ResumoMap({ produtos }: { produtos: any[] }) {
  const [markers, setMarkers] = useState<MarkerType[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Verificação adicional para evitar erros de hidratação
  if (typeof window === 'undefined') {
    return null;
  }

  useEffect(() => {
    setMounted(true)
    
    // Cleanup function para limpar estado quando componente for desmontado
    return () => {
      setMounted(false)
      setMarkers([])
      setLoading(true)
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

  // Filtrar apenas os markers que estão no carrinho
  const markersNoCarrinho = markers.filter(marker => {
    const markerAnuncioId = marker.anuncio_id?.toString();
    return produtos.some(p => p.id === markerAnuncioId);
  });

  console.log('Markers no carrinho:', markersNoCarrinho);

  // Não renderizar até estar montado
  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="text-sm text-gray-600">Carregando mapa...</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="text-sm text-gray-600">Carregando totens no mapa...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full map-container relative">
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
        <MapController markers={markers} />
        
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={18}
          minZoom={1}
        />

        {markersNoCarrinho.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={greenPinIcon}
          >
            <Popup minWidth={160} maxWidth={180}>
              <MiniAnuncioCard anuncio={marker.anuncio} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
} 