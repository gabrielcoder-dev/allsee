'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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

export default function Mapbox() {
  const center: LatLngTuple = [-15.5586, -54.2811]
  const [mapHeight, setMapHeight] = useState<number | null>(null)
  const [totens, setTotens] = useState<Totem[]>([])
  const [loading, setLoading] = useState(true)

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
  }, [])

  useEffect(() => {
    async function fetchAndGeocode() {
      setLoading(true)
      const { data, error } = await supabase.from('totten').select('*')
      if (error || !data) {
        setTotens([])
        setLoading(false)
        return
      }
      const totensWithCoords = await Promise.all(
        data.map(async (totem: Totem) => {
          const coords = await geocodeAddress(totem.adress)
          if (!coords) {
            console.warn(`Endereço não encontrado para o totem: ${totem.name} (${totem.adress})`)
          }
          return coords ? { ...totem, ...coords } : null
        })
      )
      setTotens(totensWithCoords.filter(Boolean) as Totem[])
      setLoading(false)
    }
    fetchAndGeocode()
  }, [])

  if (mapHeight === null) return null
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
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {totens.map((totem) => (
          <Marker key={totem.id} position={[totem.lat!, totem.lng!] as LatLngTuple}>
            <Popup>
              <strong>{totem.name}</strong><br />
              {totem.adress}<br />
              Preço: {totem.price}<br />
              Duração: {totem.duration}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
