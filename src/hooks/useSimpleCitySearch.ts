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

// Lista de cidades de Mato Grosso com totens (filtrada para MT)
const CITIES_WITH_TOTEMS = [
  { name: 'Primavera do Leste', lat: -15.5586, lng: -54.2811 },
  { name: 'Cuiabá', lat: -15.6014, lng: -56.0979 },
  { name: 'Várzea Grande', lat: -15.6500, lng: -56.1322 },
  { name: 'Rondonópolis', lat: -16.4706, lng: -54.6356 },
  { name: 'Sinop', lat: -11.8604, lng: -55.5091 },
  { name: 'Tangará da Serra', lat: -14.6229, lng: -57.4933 },
  { name: 'Cáceres', lat: -16.0764, lng: -57.6811 },
  { name: 'Sorriso', lat: -12.5428, lng: -55.7069 },
  { name: 'Lucas do Rio Verde', lat: -13.0583, lng: -55.9042 },
  { name: 'Nova Mutum', lat: -13.8378, lng: -56.0861 },
  { name: 'Campo Verde', lat: -15.5450, lng: -55.1625 },
  { name: 'Diamantino', lat: -14.4086, lng: -56.4461 },
  { name: 'Poconé', lat: -16.2561, lng: -56.6228 },
  { name: 'Barra do Garças', lat: -15.8900, lng: -52.2567 },
  { name: 'Alta Floresta', lat: -9.8756, lng: -56.0861 },
  { name: 'Juína', lat: -11.3778, lng: -58.7392 },
  { name: 'Colíder', lat: -10.8139, lng: -55.4511 },
  { name: 'Guarantã do Norte', lat: -9.7878, lng: -54.9011 },
  { name: 'Peixoto de Azevedo', lat: -10.2250, lng: -54.9811 },
  { name: 'Nova Xavantina', lat: -14.6761, lng: -52.3550 },
  { name: 'Canarana', lat: -13.5519, lng: -52.2708 },
  { name: 'Querência', lat: -12.6097, lng: -52.1831 },
  { name: 'São Félix do Araguaia', lat: -11.6147, lng: -50.6706 },
  { name: 'Confresa', lat: -10.6439, lng: -51.5697 },
  { name: 'Vila Rica', lat: -10.0139, lng: -51.1186 },
  { name: 'Comodoro', lat: -13.6619, lng: -59.7861 },
  { name: 'Pontes e Lacerda', lat: -15.2261, lng: -59.3353 },
  { name: 'Vila Bela da Santíssima Trindade', lat: -15.0089, lng: -59.9508 },
  { name: 'Mirassol d\'Oeste', lat: -15.6758, lng: -58.0950 },
  { name: 'São José dos Quatro Marcos', lat: -15.6278, lng: -58.1772 },
  { name: 'Araputanga', lat: -15.4647, lng: -58.3425 },
  { name: 'Lambari d\'Oeste', lat: -15.3189, lng: -58.0028 },
  { name: 'Rio Branco', lat: -15.2419, lng: -58.1258 },
  { name: 'Salto do Céu', lat: -15.1303, lng: -58.1317 },
  { name: 'Glória d\'Oeste', lat: -15.7689, lng: -58.3108 },
  { name: 'Porto Esperidião', lat: -15.8572, lng: -58.4619 },
  { name: 'Porto Estrela', lat: -16.6169, lng: -57.5508 },
  { name: 'Barão de Melgaço', lat: -16.1947, lng: -55.9675 },
  { name: 'Nossa Senhora do Livramento', lat: -15.7728, lng: -56.3728 },
  { name: 'Santo Antônio do Leverger', lat: -15.8658, lng: -56.0789 },
  { name: 'Rosário Oeste', lat: -14.8258, lng: -56.4239 },
  { name: 'Acorizal', lat: -15.2000, lng: -56.3728 },
  { name: 'Jangada', lat: -15.2358, lng: -56.4917 },
  { name: 'Chapada dos Guimarães', lat: -15.4606, lng: -55.7497 },
  { name: 'Nova Brasilândia', lat: -14.9611, lng: -54.9689 },
  { name: 'Planalto da Serra', lat: -14.6519, lng: -54.7819 },
  { name: 'Nova Bandeirantes', lat: -9.8167, lng: -57.8667 },
  { name: 'Nova Monte Verde', lat: -9.9758, lng: -57.5269 },
  { name: 'Apiacás', lat: -9.5397, lng: -57.4586 },
  { name: 'Paranatinga', lat: -14.4306, lng: -54.0508 },
  { name: 'Nova Ubiratã', lat: -12.9833, lng: -55.2556 },
  { name: 'Vera', lat: -12.3017, lng: -55.3047 },
  { name: 'Santa Rita do Trivelato', lat: -13.8167, lng: -55.2706 },
  { name: 'Nova Santa Helena', lat: -10.8658, lng: -55.1872 },
  { name: 'Gaúcha do Norte', lat: -13.2444, lng: -53.0808 },
  { name: 'Nova Canaã do Norte', lat: -10.5578, lng: -55.9531 },
  { name: 'Itanhangá', lat: -12.2258, lng: -56.6467 },
  { name: 'Tapurah', lat: -12.5333, lng: -56.5167 },
  { name: 'Ipiranga do Norte', lat: -15.3333, lng: -56.1833 },
  { name: 'Itiquira', lat: -17.2167, lng: -54.1422 },
  { name: 'Santo Afonso', lat: -14.4950, lng: -57.0058 },
  { name: 'Nortelândia', lat: -14.4547, lng: -56.8028 },
  { name: 'São José do Rio Claro', lat: -13.4667, lng: -56.7217 },
  { name: 'Nova Olímpia', lat: -14.7972, lng: -57.2886 },
  { name: 'Denise', lat: -14.7372, lng: -57.0583 },
  { name: 'Porto dos Gaúchos', lat: -11.5333, lng: -57.4167 },
  { name: 'Nova Maringá', lat: -13.0139, lng: -57.0906 },
  { name: 'Nova Marilândia', lat: -14.3667, lng: -56.9667 },
  { name: 'Nova Nazaré', lat: -13.9833, lng: -51.8000 },
  { name: 'Santa Carmem', lat: -11.3500, lng: -55.7167 },
  { name: 'União do Sul', lat: -11.5167, lng: -54.3667 },
  { name: 'Nova Lacerda', lat: -14.4667, lng: -59.6000 }
]

// Função para buscar cidade por correspondência parcial
function findCityByPartialName(searchTerm: string): CitySearchResult | null {
  const normalizedSearch = searchTerm.toLowerCase().trim()
  
  // Buscar por correspondência exata primeiro
  const exactMatch = CITIES_WITH_TOTEMS.find(city => 
    city.name.toLowerCase() === normalizedSearch
  )
  
  if (exactMatch) {
    return {
      lat: exactMatch.lat,
      lng: exactMatch.lng,
      displayName: exactMatch.name
    }
  }
  
  // Buscar por correspondência parcial - simplificada e mais eficaz
  const partialMatches = CITIES_WITH_TOTEMS.filter(city => {
    const cityName = city.name.toLowerCase()
    
    // Verificar se o termo de busca está contido no nome da cidade
    if (cityName.includes(normalizedSearch)) {
      return true
    }
    
    // Verificar se alguma palavra da cidade contém o termo de busca
    const cityWords = cityName.split(' ')
    for (const word of cityWords) {
      if (word.includes(normalizedSearch) || normalizedSearch.includes(word)) {
        return true
      }
    }
    
    return false
  })
  
  if (partialMatches.length > 0) {
    // Priorizar cidades que começam com o termo de busca
    const startsWithMatch = partialMatches.find(city => 
      city.name.toLowerCase().startsWith(normalizedSearch)
    )
    
    // Se não encontrar cidade que começa com o termo, priorizar cidades que contêm o termo no início de uma palavra
    const wordStartMatch = !startsWithMatch ? partialMatches.find(city => {
      const cityWords = city.name.toLowerCase().split(' ')
      return cityWords.some(word => word.startsWith(normalizedSearch))
    }) : null
    
    const match = startsWithMatch || wordStartMatch || partialMatches[0]
    
    return {
      lat: match.lat,
      lng: match.lng,
      displayName: match.name
    }
  }
  
  return null
}

async function geocodeCity(cityName: string): Promise<CitySearchResult | null> {
  try {
    // Primeiro tentar buscar na lista local
    const localResult = findCityByPartialName(cityName)
    if (localResult) {
      return localResult
    }
    
    // Se não encontrar na lista local, usar Nominatim (apenas para cidades de MT)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName + ', Mato Grosso, Brasil')}&limit=1&addressdetails=1&countrycodes=br`
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
async function checkIfSpecificTotem(address: string): Promise<{ isSpecificTotem: boolean; totemId?: number; markerId?: number; coords?: { lat: number; lng: number } }> {
  try {
    console.log('🔍 Verificando totem específico para:', address);
    
    const response = await fetch('/api/check-totem-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    })
    
    if (!response.ok) {
      console.error('❌ Erro na resposta da API:', response.status, response.statusText);
      return { isSpecificTotem: false }
    }
    
    const result = await response.json()
    console.log('📡 Resposta da API:', result);

    const { data, error } = result

    if (error || !data) {
      console.log('❌ Erro ou dados não encontrados:', error);
      return { isSpecificTotem: false }
    }

    console.log('✅ Totem encontrado:', data);
    return { 
      isSpecificTotem: data.isSpecificTotem, 
      totemId: data.totemId,
      markerId: data.markerId,
      coords: data.coords
    }
  } catch (error) {
    console.error('💥 Erro ao verificar totem específico:', error)
    return { isSpecificTotem: false }
  }
}

export function useSimpleCitySearch(delay: number = 0) { // Mudança: delay padrão para 0 (imediato)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [lastResult, setLastResult] = useState<CitySearchResult | null>(null)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  // Garantir que está no cliente
  useEffect(() => {
    setMounted(true)
  }, [])

  const searchCity = useCallback(async (term: string) => {
    if (!mounted) return;
    
    if (!term.trim()) {
      // Quando o campo estiver vazio, navegar para Primavera do Leste
      if (typeof window !== 'undefined' && (window as any).navigateToCity) {
        (window as any).navigateToCity(PRIMAVERA_DO_LESTE_COORDS);
      }
      return
    }

    setIsSearching(true)
    setError('')

    try {
      // SEMPRE verificar se é um totem específico primeiro
      const totemCheck = await checkIfSpecificTotem(term)
      
      if (totemCheck.isSpecificTotem && totemCheck.totemId) {
        console.log('🎯 Totem específico encontrado:', totemCheck);
        
        // Se for um totem específico, navegar diretamente para as coordenadas do marker
        if (typeof window !== 'undefined' && (window as any).navigateToCity && totemCheck.coords) {
          console.log('🗺️ Navegando para coordenadas do marker:', totemCheck.coords);
          (window as any).navigateToCity(totemCheck.coords, totemCheck.totemId);
        } else if (typeof window !== 'undefined' && (window as any).navigateToCity) {
          // Fallback para coordenadas padrão se não tiver coords
          console.log('🗺️ Navegando para coordenadas padrão');
          const cityCoords = { lat: -15.5586, lng: -54.2811 };
          (window as any).navigateToCity(cityCoords, totemCheck.totemId);
        }
        
        setLastResult({ 
          lat: totemCheck.coords?.lat || -15.5586, 
          lng: totemCheck.coords?.lng || -54.2811, 
          displayName: term, 
          isSpecificTotem: true, 
          totemId: totemCheck.totemId 
        });
        setError('');
        return;
      }
      
      // Se não for totem específico, tentar geocodificar como cidade
      console.log('🔍 Nenhum totem específico encontrado, tentando buscar como cidade...');
      const result = await geocodeCity(term)
      
      if (result) {
        const finalResult = {
          ...result,
          isSpecificTotem: false,
          totemId: undefined
        }
        
        setLastResult(finalResult)
        setError('')
        if (typeof window !== 'undefined' && (window as any).navigateToCity) {
          (window as any).navigateToCity(result);
        }
      } else {
        setError('Cidade não encontrada em Mato Grosso. Tente novamente.')
        setLastResult(null)
      }
    } catch (error) {
      console.error('💥 Erro na busca:', error)
      setError('Erro ao buscar cidade. Tente novamente.')
      setLastResult(null)
    } finally {
      setIsSearching(false)
    }
  }, [mounted])

  // Debounce effect - agora imediato (0ms)
  useEffect(() => {
    if (!mounted) return;
    
    if (searchTerm.trim()) {
      searchCity(searchTerm)
    } else {
      // Quando o campo estiver vazio, navegar para Primavera do Leste
      console.log('🏠 Campo vazio, voltando para Primavera do Leste');
      if (typeof window !== 'undefined' && (window as any).navigateToCity) {
        (window as any).navigateToCity(PRIMAVERA_DO_LESTE_COORDS);
      }
      // Limpar resultados anteriores
      setLastResult(null);
      setError('');
    }
  }, [searchTerm, searchCity, mounted])

  return {
    searchTerm,
    setSearchTerm,
    isSearching,
    lastResult,
    error,
    searchCity
  }
} 