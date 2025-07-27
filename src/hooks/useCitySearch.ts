import { useState, useEffect, useCallback } from 'react'

type CitySearchResult = {
  lat: number
  lng: number
  displayName: string
}

// Coordenadas de Primavera do Leste, MT
const PRIMAVERA_DO_LESTE_COORDS = { lat: -15.5586, lng: -54.2811 }

async function geocodeCity(cityName: string): Promise<CitySearchResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1&addressdetails=1&countrycodes=br`
    )
    const data = await response.json()
    if (data && data.length > 0) {
      return { 
        lat: parseFloat(data[0].lat), 
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name
      }
    }
    return null
  } catch (error) {
    console.error('Erro ao buscar cidade:', error)
    return null
  }
}

export function useCitySearch(delay: number = 2000) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [lastResult, setLastResult] = useState<CitySearchResult | null>(null)
  const [error, setError] = useState('')

  const searchCity = useCallback(async (term: string) => {
    if (!term.trim()) {
      setError('')
      setLastResult(null)
      // Quando o campo estiver vazio, navegar para Primavera do Leste
      if ((window as any).navigateToCity) {
        (window as any).navigateToCity(PRIMAVERA_DO_LESTE_COORDS);
      }
      return
    }

    setIsSearching(true)
    setError('')

    try {
      const result = await geocodeCity(term)
      if (result) {
        setLastResult(result)
        setError('')
        // NÃO navegar automaticamente para a cidade encontrada
        // A navegação só acontecerá se houver markers nessa cidade
      } else {
        setError('Cidade não encontrada. Tente novamente.')
        setLastResult(null)
      }
    } catch (error) {
      setError('Erro ao buscar cidade. Tente novamente.')
      setLastResult(null)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounce effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        searchCity(searchTerm)
      } else {
        // Quando o campo estiver vazio, navegar para Primavera do Leste
        if ((window as any).navigateToCity) {
          (window as any).navigateToCity(PRIMAVERA_DO_LESTE_COORDS);
        }
      }
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, delay, searchCity])

  return {
    searchTerm,
    setSearchTerm,
    isSearching,
    lastResult,
    error,
    searchCity
  }
} 