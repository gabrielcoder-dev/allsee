'use client'

import { useState, useEffect } from 'react'
import { useMap } from 'react-leaflet'

type CitySearchProps = {
  onCityFound?: (coords: { lat: number; lng: number }) => void
}

async function geocodeCity(cityName: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1&addressdetails=1`
    )
    const data = await response.json()
    if (data && data.length > 0) {
      return { 
        lat: parseFloat(data[0].lat), 
        lng: parseFloat(data[0].lon) 
      }
    }
    return null
  } catch (error) {
    console.error('Erro ao buscar cidade:', error)
    return null
  }
}

export default function CitySearch({ onCityFound }: CitySearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const map = useMap()

  const handleSearch = async () => {
    if (!searchTerm.trim() || !map) return

    setIsLoading(true)
    setError('')

    try {
      const coords = await geocodeCity(searchTerm)
      
      if (coords) {
        map.setView([coords.lat, coords.lng], 12)
        onCityFound?.(coords)
        setSearchTerm('')
      } else {
        setError('Cidade não encontrada. Tente novamente.')
      }
    } catch (error) {
      setError('Erro ao buscar cidade. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 min-w-[280px]">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite o nome da cidade..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSearch}
            disabled={isLoading || !searchTerm.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
        <div className="text-xs text-gray-500">
          Exemplos: "São Paulo", "Rio de Janeiro", "Brasília"
        </div>
      </div>
    </div>
  )
} 