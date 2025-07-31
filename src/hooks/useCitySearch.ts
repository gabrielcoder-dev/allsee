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

export function useCitySearch(delay: number = 0) {
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
        if ((window as any).setIsSearchingCity) {
          (window as any).setIsSearchingCity(false);
        }
        (window as any).navigateToCity(PRIMAVERA_DO_LESTE_COORDS);
      }
      return
    }

    setIsSearching(true)
    setError('')

    try {
      // Primeiro verificar se é um totem específico
      const totemCheck = await checkIfSpecificTotem(term)
      
      if (totemCheck.isSpecificTotem && totemCheck.totemId) {
        // Se for um totem específico, navegar diretamente
        if ((window as any).navigateToCity) {
          if ((window as any).setIsSearchingCity) {
            (window as any).setIsSearchingCity(true);
          }
          const cityCoords = { lat: -15.5586, lng: -54.2811 };
          (window as any).navigateToCity(cityCoords, totemCheck.totemId);
        }
        setLastResult({ lat: -15.5586, lng: -54.2811, displayName: term, isSpecificTotem: true, totemId: totemCheck.totemId });
        setError('');
        return;
      }
      
      // Se não for totem específico, tentar geocodificar
      const result = await geocodeCity(term)
      
      if (result) {
        const finalResult = {
          ...result,
          isSpecificTotem: false,
          totemId: undefined
        }
        
        setLastResult(finalResult)
        setError('')
        if ((window as any).setIsSearchingCity) {
          (window as any).setIsSearchingCity(true);
        }
        if ((window as any).navigateToCity) {
          (window as any).navigateToCity(result);
        }
      } else {
        setError('Cidade não encontrada. Tente novamente.')
        setLastResult(null)
        if ((window as any).setIsSearchingCity) {
          (window as any).setIsSearchingCity(false);
        }
      }
    } catch (error) {
      setError('Erro ao buscar cidade. Tente novamente.')
      setLastResult(null)
      if ((window as any).setIsSearchingCity) {
        (window as any).setIsSearchingCity(false);
      }
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
        if ((window as any).navigateToCity) {
          if ((window as any).setIsSearchingCity) {
            (window as any).setIsSearchingCity(false);
          }
          (window as any).navigateToCity(PRIMAVERA_DO_LESTE_COORDS);
        }
      }
    }, searchTerm.trim() ? delay : 0)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, delay, searchCity])

  // Efeito adicional para garantir que quando searchTerm ficar vazio, volte para Primavera do Leste
  useEffect(() => {
    if (!searchTerm.trim()) {
      setError('')
      setLastResult(null)
      if ((window as any).navigateToCity) {
        if ((window as any).setIsSearchingCity) {
          (window as any).setIsSearchingCity(false);
        }
        (window as any).navigateToCity(PRIMAVERA_DO_LESTE_COORDS);
      }
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