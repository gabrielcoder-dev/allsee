'use client'

import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
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

function MarkerWithHoverCard({ marker, onHover, onLeave, isOpen }: any) {
  const markerRef = useRef<any>(null);
  const map = useMap();
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && markerRef.current) {
      const latlng = L.latLng(marker.lat, marker.lng);
      const point = map.latLngToContainerPoint(latlng);
      setPos({ left: point.x, top: point.y });
    }
  }, [isOpen, map, marker.lat, marker.lng]);

  // Fecha o card só se mouse sair do marker e do card
  function handleCardMouseLeave(e: React.MouseEvent) {
    // Se mouse saiu para dentro do marker, não fecha
    if (markerRef.current) {
      const markerEl = markerRef.current._icon;
      if (markerEl && markerEl.contains(e.relatedTarget as Node)) return;
    }
    onLeave();
  }

  return (
    <>
      <Marker
        ref={markerRef}
        position={[marker.lat, marker.lng]}
        icon={orangePinIcon}
        eventHandlers={{
          mouseover: onHover,
          mouseout: (e: any) => {
            // Se mouseout for para o card, não fecha
            if (cardRef.current && cardRef.current.contains(e.originalEvent.relatedTarget)) return;
            onLeave();
          },
        }}
      />
      {isOpen && pos && (
        <div
          ref={cardRef}
          style={{
            position: 'absolute',
            left: pos.left,
            top: pos.top - 10,
            zIndex: 1000,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'auto',
          }}
          onMouseEnter={onHover}
          onMouseLeave={handleCardMouseLeave}
        >
          <MiniAnuncioCard anuncio={marker.anuncio} showPointer={true} />
        </div>
      )}
    </>
  );
}

export default function Mapbox() {
  const center: LatLngTuple = [-15.5586, -54.2811]
  const [mapHeight, setMapHeight] = useState<number>(0)
  const [markers, setMarkers] = useState<MarkerType[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [hoveredMarkerId, setHoveredMarkerId] = useState<number | null>(null);

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

  if (!mounted || mapHeight === 0) return null
  if (loading) return <div className="hidden xl:flex w-[400px] flex-shrink-0 z-0 items-center justify-center" style={{ height: '100%' }}>Carregando totens no mapa...</div>

  return (
    <div
      className="hidden xl:flex w-[400px] flex-shrink-0 z-0 relative"
      style={{ height: `${mapHeight}px`, background: '#fff' }}
    >
      <MapContainer
        center={center}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker) => (
          <MarkerWithHoverCard
            key={marker.id}
            marker={marker}
            isOpen={hoveredMarkerId === marker.id}
            onHover={() => setHoveredMarkerId(marker.id)}
            onLeave={() => setHoveredMarkerId((current) => current === marker.id ? null : current)}
          />
        ))}
      </MapContainer>
    </div>
  )
}
