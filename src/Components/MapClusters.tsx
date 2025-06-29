// components/MapClusters.tsx
'use client'

import { useMap } from 'react-leaflet'
import { useEffect } from 'react'
import L, { LatLngTuple } from 'leaflet'
import 'leaflet.markercluster'

type Totem = {
  id: string
  name: string
  adress: string
  lat: number
  lng: number
  price: number
  duration: number
}

interface Props {
  totens: Totem[]
}

export default function MapClusters({ totens }: Props) {
  const map = useMap()

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup()

    totens.forEach((totem) => {
      const marker = L.marker([totem.lat, totem.lng] as LatLngTuple).bindPopup(`
        <strong>${totem.name}</strong><br />
        ${totem.adress}<br />
        Preço: R$ ${totem.price}<br />
        Duração: ${totem.duration}s
      `)
      clusterGroup.addLayer(marker)
    })

    map.addLayer(clusterGroup)

    return () => {
      map.removeLayer(clusterGroup)
    }
  }, [map, totens])

  return null
}
