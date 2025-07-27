import { useState, useEffect, useCallback } from 'react'

type CitySearchResult = {
  lat: number
  lng: number
  displayName: string
  isSpecificTotem?: boolean
  totemId?: number
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

// Função para verificar se o endereço corresponde a um totem específico
async function checkIfSpecificTotem(address: string): Promise<{ isSpecificTotem: boolean; totemId?: number }> {
  try {
    const { data, error } = await fetch('/api/check-totem-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    }).then(res => res.json())

    if (error || !data) {
      return { isSpecificTotem: false }
    }

    return { isSpecificTotem: true, totemId: data.totemId }
  } catch (error) {
    return { isSpecificTotem: false }
  }
}

// Função para verificar se o endereço contém o nome de uma cidade com markers
async function checkIfAddressContainsCityWithMarkers(address: string): Promise<boolean> {
  try {
    const { data, error } = await fetch('/api/check-city-in-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    }).then(res => res.json())

    if (error || !data) {
      return false
    }

    return data.hasCityWithMarkers
  } catch (error) {
    return false
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
        // Verificar se é um totem específico
        const totemCheck = await checkIfSpecificTotem(term)
        const finalResult = {
          ...result,
          isSpecificTotem: totemCheck.isSpecificTotem,
          totemId: totemCheck.totemId
        }
        
        setLastResult(finalResult)
        setError('')
        // NÃO navegar automaticamente para a cidade encontrada
        // A navegação só acontecerá se houver markers nessa cidade
      } else {
        // Se a geocodificação falhou, verificar se o endereço contém uma cidade com markers
        const hasCityWithMarkers = await checkIfAddressContainsCityWithMarkers(term)
        
        if (hasCityWithMarkers) {
          // Se contém cidade com markers, não mostrar erro
          setError('')
          setLastResult(null)
        } else {
          setError('Cidade não encontrada. Tente novamente.')
          setLastResult(null)
        }
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

  // Efeito adicional para garantir que quando searchTerm ficar vazio, volte para Primavera do Leste
  useEffect(() => {
    if (!searchTerm.trim()) {
      setError('')
      setLastResult(null)
      // Navegar para Primavera do Leste quando o campo ficar vazio
      setTimeout(() => {
        if ((window as any).navigateToCity) {
          (window as any).navigateToCity(PRIMAVERA_DO_LESTE_COORDS);
        }
      }, 100); // Pequeno delay para garantir que a função esteja disponível
    }
  }, [searchTerm])

  return {
    searchTerm,
    setSearchTerm,
    isSearching,
    lastResult,
    error,
    searchCity
  }
} 