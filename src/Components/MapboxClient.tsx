'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
})

export default function Mapbox() {
  // Centro do mapa (latitude, longitude)
  const center: LatLngTuple = [-23.55052, -46.633308] // São Paulo, por exemplo

  return (
    <div className="hidden xl:block" style={{ width: '400px', height: '450px', borderRadius: '0px', overflow: 'hidden' }}>
      <MapContainer center={center as LatLngTuple} zoom={13} style={{ width: '100%', height: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center}>
          <Popup>
            Centro do mapa!
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}