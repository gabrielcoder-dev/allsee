import { useState, useEffect, useCallback } from 'react'

type CitySearchResult = {
  lat: number
  lng: number
  displayName: string
}

async function geocodeCity(cityName: string): Promise<CitySearchResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1&addressdetails=1`
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
      return
    }

    setIsSearching(true)
    setError('')

    try {
      const result = await geocodeCity(term)
      if (result) {
        setLastResult(result)
        setError('')
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