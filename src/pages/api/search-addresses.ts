import { NextApiRequest, NextApiResponse } from 'next'

// Cache para armazenar cidades brasileiras
let brazilianCitiesCache: any[] = []
let cacheTimestamp = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 horas

// Função para buscar coordenadas específicas de uma cidade (com timeout)
async function fetchCityCoordinates(cityName: string, state: string): Promise<{lat: number, lng: number} | null> {
  try {
    const query = encodeURIComponent(`${cityName}, ${state}, Brasil`)
    
    // Adicionar timeout de 2 segundos para não demorar muito
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=br`,
      {
        headers: {
          'User-Agent': 'AllSee-App/1.0'
        },
        signal: controller.signal
      }
    )
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.error(`❌ Erro no Nominatim (${response.status}) para ${cityName}, ${state}`)
      return null
    }
    
    const data = await response.json()
    
    if (data && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      }
      console.log(`✅ Coordenadas encontradas para ${cityName}: ${coords.lat}, ${coords.lng}`)
      return coords
    }
    
    console.log(`⚠️ Nenhuma coordenada encontrada para ${cityName}, ${state}`)
    return null
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`⏱️ Timeout ao buscar coordenadas para ${cityName}, ${state}`)
    } else {
      console.error(`❌ Erro ao buscar coordenadas para ${cityName}, ${state}:`, error)
    }
    return null
  }
}

// Função para buscar cidades brasileiras da API do IBGE
async function fetchBrazilianCities(): Promise<any[]> {
  try {
    console.log('🌐 Buscando cidades brasileiras da API do IBGE...')
    
    // API do IBGE para municípios brasileiros
    const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios')
    
    if (!response.ok) {
      throw new Error(`Erro na API do IBGE: ${response.status}`)
    }
    
    const municipalities = await response.json()
    
    // Converter para o formato que usamos
    const cities = municipalities.map((city: any) => ({
      name: city.nome,
      state: city.microrregiao?.mesorregiao?.UF?.sigla || city.microrregiao?.UF?.sigla || 'BR',
      country: "Brasil",
      lat: null, // Será preenchido dinamicamente
      lng: null
    })).filter((city: any) => city.state !== 'BR') // Filtrar cidades com estado inválido
    
    console.log(`✅ Carregadas ${cities.length} cidades brasileiras`)
    return cities
  } catch (error) {
    console.error('❌ Erro ao buscar cidades do IBGE:', error)
    
    // Fallback: lista básica de cidades principais
    return [
      { name: "São Paulo", state: "SP", country: "Brasil", lat: -23.5505, lng: -46.6333 },
      { name: "Rio de Janeiro", state: "RJ", country: "Brasil", lat: -22.9068, lng: -43.1729 },
      { name: "Brasília", state: "DF", country: "Brasil", lat: -15.7801, lng: -47.9292 },
      { name: "Salvador", state: "BA", country: "Brasil", lat: -12.9714, lng: -38.5014 },
      { name: "Fortaleza", state: "CE", country: "Brasil", lat: -3.7172, lng: -38.5434 },
      { name: "Belo Horizonte", state: "MG", country: "Brasil", lat: -19.9167, lng: -43.9345 },
      { name: "Manaus", state: "AM", country: "Brasil", lat: -3.1190, lng: -60.0217 },
      { name: "Curitiba", state: "PR", country: "Brasil", lat: -25.4244, lng: -49.2654 },
      { name: "Recife", state: "PE", country: "Brasil", lat: -8.0476, lng: -34.8770 },
      { name: "Goiânia", state: "GO", country: "Brasil", lat: -16.6864, lng: -49.2643 },
      { name: "Primavera do Leste", state: "MT", country: "Brasil", lat: -15.5619, lng: -54.3067 },
      { name: "Praia Grande", state: "SP", country: "Brasil", lat: -24.0089, lng: -46.4128 },
      { name: "Presidente Prudente", state: "SP", country: "Brasil", lat: -22.1267, lng: -51.3892 },
      { name: "Praia do Rosa", state: "SC", country: "Brasil", lat: -28.0167, lng: -48.6167 },
      { name: "Praia do Forte", state: "BA", country: "Brasil", lat: -12.5833, lng: -38.0833 }
    ]
  }
}

// Função para obter coordenadas aproximadas por estado (mais rápida)
function getStateCoordinates(state: string): {lat: number, lng: number} {
  const stateCoords: {[key: string]: {lat: number, lng: number}} = {
    'AC': { lat: -9.9756, lng: -67.8242 }, // Rio Branco
    'AL': { lat: -9.6658, lng: -35.7353 }, // Maceió
    'AP': { lat: 0.0389, lng: -51.0664 },  // Macapá
    'AM': { lat: -3.1190, lng: -60.0217 }, // Manaus
    'BA': { lat: -12.9714, lng: -38.5014 }, // Salvador
    'CE': { lat: -3.7172, lng: -38.5434 }, // Fortaleza
    'DF': { lat: -15.7801, lng: -47.9292 }, // Brasília
    'ES': { lat: -20.3155, lng: -40.3128 }, // Vitória
    'GO': { lat: -16.6864, lng: -49.2643 }, // Goiânia
    'MA': { lat: -2.5289, lng: -44.3041 },  // São Luís
    'MT': { lat: -15.6014, lng: -56.0979 }, // Cuiabá
    'MS': { lat: -20.4697, lng: -54.6201 }, // Campo Grande
    'MG': { lat: -19.9167, lng: -43.9345 }, // Belo Horizonte
    'PA': { lat: -1.4558, lng: -48.5044 },  // Belém
    'PB': { lat: -7.1195, lng: -34.8450 },  // João Pessoa
    'PR': { lat: -25.4244, lng: -49.2654 }, // Curitiba
    'PE': { lat: -8.0476, lng: -34.8770 },  // Recife
    'PI': { lat: -5.0892, lng: -42.8019 },  // Teresina
    'RJ': { lat: -22.9068, lng: -43.1729 }, // Rio de Janeiro
    'RN': { lat: -5.7945, lng: -35.2110 },  // Natal
    'RS': { lat: -30.0346, lng: -51.2177 }, // Porto Alegre
    'RO': { lat: -8.7612, lng: -63.9020 },  // Porto Velho
    'RR': { lat: 2.8195, lng: -60.6719 },   // Boa Vista
    'SC': { lat: -27.5954, lng: -48.5480 }, // Florianópolis
    'SP': { lat: -23.5505, lng: -46.6333 }, // São Paulo
    'SE': { lat: -10.9472, lng: -37.0731 }, // Aracaju
    'TO': { lat: -10.1839, lng: -48.3336 }  // Palmas
  }
  
  return stateCoords[state] || { lat: -15.7801, lng: -47.9292 } // Default: Brasília
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { q } = req.query

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' })
    }

    const searchTerm = q.toLowerCase().trim()
    
    if (searchTerm.length < 1) {
      return res.json({ addresses: [] })
    }

    console.log('🔍 Buscando cidades para:', searchTerm)

    // Função para normalizar texto (remover acentos)
    const normalizeText = (text: string): string => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
    }

    const normalizedSearchTerm = normalizeText(searchTerm)

    // Verificar se o cache ainda é válido
    const now = Date.now()
    if (brazilianCitiesCache.length === 0 || (now - cacheTimestamp) > CACHE_DURATION) {
      brazilianCitiesCache = await fetchBrazilianCities()
      cacheTimestamp = now
    }

    // Função para calcular score de relevância
    const calculateScore = (cityName: string, state: string, searchTerm: string): number => {
      const normalizedCityName = normalizeText(cityName)
      const normalizedState = normalizeText(state)
      
      // Dividir o nome da cidade em palavras
      const cityWords = normalizedCityName.split(/\s+/)
      const searchWords = searchTerm.split(/\s+/)
      
      let score = 0
      
      // Verificar se começa com o termo de busca (maior prioridade)
      if (normalizedCityName.startsWith(searchTerm)) {
        score += 1000
      }
      
      // Verificar se alguma palavra da cidade começa com o termo de busca
      searchWords.forEach(searchWord => {
        cityWords.forEach(cityWord => {
          if (cityWord.startsWith(searchWord)) {
            score += 500
          } else if (cityWord.includes(searchWord)) {
            score += 200 // Aumentado de 100 para 200 para dar mais peso
          }
        })
      })
      
      // Verificar se o nome completo contém o termo (aumentar peso)
      if (normalizedCityName.includes(searchTerm)) {
        score += 300 // Aumentado de 200 para 300
      }
      
      // Verificar se alguma palavra contém o termo no início (ex: "Barra" em "Barra do Garças")
      cityWords.forEach(word => {
        if (word.includes(searchTerm) && word.indexOf(searchTerm) === 0) {
          score += 400 // Bonus para palavras que começam com o termo
        }
      })
      
      // Verificar se o estado contém o termo (menor prioridade)
      if (normalizedState.includes(searchTerm)) {
        score += 10
      }
      
      return score
    }

    // Buscar cidades brasileiras com busca melhorada
    const matchingCities = brazilianCitiesCache
      .map(city => {
        const normalizedCityName = normalizeText(city.name)
        const normalizedState = normalizeText(city.state)
        
        // Verificar se corresponde ao termo de busca - busca mais flexível
        const cityWords = normalizedCityName.split(/\s+/)
        
        // Verificar correspondência de forma mais abrangente
        // A busca deve encontrar cidades que contenham o termo em qualquer parte do nome
        const matches = 
          // Nome completo contém o termo (ex: "barra" em "barra do garças")
          normalizedCityName.includes(normalizedSearchTerm) ||
          // Estado contém o termo
          normalizedState.includes(normalizedSearchTerm) ||
          // Alguma palavra da cidade começa com o termo (ex: "barra" em "Barra do Garças")
          cityWords.some(word => word.startsWith(normalizedSearchTerm)) ||
          // Alguma palavra da cidade contém o termo (ex: "barra" em qualquer palavra)
          cityWords.some(word => word.includes(normalizedSearchTerm))
        
        if (!matches) return null
        
        const score = calculateScore(city.name, city.state, normalizedSearchTerm)
        
        return {
          ...city,
          score
        }
      })
      .filter((city): city is any => city !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15) // Aumentar para 15 resultados iniciais para ter mais opções

    // Buscar coordenadas específicas para cada cidade encontrada
    const citiesWithCoordinates = (await Promise.all(
      matchingCities.map(async (city) => {
        let lat = city.lat
        let lng = city.lng
        
        // Se não tem coordenadas, buscar coordenadas específicas
        if (!lat || !lng) {
          console.log(`🔍 Buscando coordenadas para ${city.name}, ${city.state}`)
          const coords = await fetchCityCoordinates(city.name, city.state)
          
          if (coords) {
            lat = coords.lat
            lng = coords.lng
            console.log(`✅ Coordenadas específicas encontradas: ${lat}, ${lng}`)
          } else {
            // Se não encontrou coordenadas, usar coordenadas aproximadas do estado como fallback
            console.log(`⚠️ Coordenadas não encontradas para ${city.name}, ${city.state}, usando coordenadas do estado`)
            const stateCoords = getStateCoordinates(city.state)
            lat = stateCoords.lat
            lng = stateCoords.lng
          }
        }

        return {
          id: `city_${city.name}_${city.state}`,
          name: city.name, // Nome limpo da cidade (sem estado/país)
          address: `${city.name}, ${city.state}, ${city.country}`,
          cityName: city.name, // Nome da cidade para filtrar totens
          state: city.state,
          country: city.country,
          lat: lat,
          lng: lng,
          type: 'city' as const,
          // Score para ordenação (cidades que começam com o termo têm prioridade)
          score: city.score || (city.name.toLowerCase().startsWith(searchTerm) ? 100 : 
                 city.name.toLowerCase().includes(searchTerm) ? 50 : 10)
        }
      })
    )).filter(city => city !== null && city.lat && city.lng) as any[]
    
    // Ordenar e limitar resultados
    const finalCities = citiesWithCoordinates
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // Limitar a 5 cidades para resposta rápida

    console.log(`✅ Encontradas ${finalCities.length} cidades para "${searchTerm}"`)

    res.json({ addresses: finalCities })
  } catch (error) {
    console.error('❌ Erro na API de busca de endereços:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}