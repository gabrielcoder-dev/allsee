'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Importação dinâmica do mapa para evitar problemas de SSR
const SimpleMap = dynamic(() => import('./SimpleMap'), { 
  ssr: false,
  loading: () => (
    <div className="hidden xl:flex w-[400px] flex-shrink-0 z-0 items-center justify-center map-loading" style={{ height: '100vh' }}>
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="text-sm text-gray-600">Carregando mapa...</span>
      </div>
    </div>
  )
})

type MapboxWrapperProps = {
  anunciosFiltrados?: any[]
  onCityFound?: (coords: { lat: number; lng: number; totemId?: number }) => void
  userNicho?: string | null
  specificTotemId?: number | null
  isFullscreen?: boolean
  onToggleMapView?: () => void
}

export default function MapboxWrapper({ anunciosFiltrados, onCityFound, userNicho, specificTotemId, isFullscreen = false, onToggleMapView }: MapboxWrapperProps) {
  return (
    <Suspense fallback={
      <div className={`${isFullscreen ? 'w-full' : 'hidden xl:flex w-[400px]'} flex-shrink-0 z-0 items-center justify-center map-loading`} style={{ height: '100vh' }}>
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="text-sm text-gray-600">Carregando mapa...</span>
        </div>
      </div>
    }>
      <SimpleMap 
        anunciosFiltrados={anunciosFiltrados}
        onCityFound={onCityFound}
        userNicho={userNicho}
        specificTotemId={specificTotemId}
        isFullscreen={isFullscreen}
        onToggleMapView={onToggleMapView}
      />
    </Suspense>
  )
}