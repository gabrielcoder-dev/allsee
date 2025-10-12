import { NextApiRequest, NextApiResponse } from 'next'

// Cache para armazenar cidades brasileiras
let brazilianCitiesCache: any[] = []
let cacheTimestamp = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 horas

// Função para buscar coordenadas específicas de uma cidade
async function fetchCityCoordinates(cityName: string, state: string): Promise<{lat: number, lng: number} | null> {
  try {
    // Usar Nominatim (OpenStreetMap) para geocoding
    const query = encodeURIComponent(`${cityName}, ${state}, Brasil`)
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=br`)
    
    if (!response.ok) {
      throw new Error(`Erro no Nominatim: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      }
    }
    
    return null
  } catch (error) {
    console.error(`❌ Erro ao buscar coordenadas para ${cityName}, ${state}:`, error)
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
    
    if (searchTerm.length < 2) {
      return res.json({ addresses: [] })
    }

    console.log('🔍 Buscando cidades para:', searchTerm)

    // Verificar se o cache ainda é válido
    const now = Date.now()
    if (brazilianCitiesCache.length === 0 || (now - cacheTimestamp) > CACHE_DURATION) {
      brazilianCitiesCache = await fetchBrazilianCities()
      cacheTimestamp = now
    }

    // Buscar apenas cidades brasileiras
    const matchingCities = brazilianCitiesCache
      .filter(city => 
        city.name.toLowerCase().includes(searchTerm) ||
        city.state.toLowerCase().includes(searchTerm)
      )
      .slice(0, 10) // Limitar a 10 para não sobrecarregar a API

    // Buscar coordenadas específicas para cada cidade encontrada
    const citiesWithCoordinates = await Promise.all(
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
            console.log(`✅ Coordenadas encontradas: ${lat}, ${lng}`)
          } else {
            // Fallback para coordenadas do estado
            const stateCoords = getStateCoordinates(city.state)
            lat = stateCoords.lat
            lng = stateCoords.lng
            console.log(`⚠️ Usando coordenadas do estado: ${lat}, ${lng}`)
          }
        }

        return {
          id: `city_${city.name}_${city.state}`,
          name: city.name,
          address: `${city.name}, ${city.state}, ${city.country}`,
          lat: lat,
          lng: lng,
          type: 'city' as const,
          // Score para ordenação (cidades que começam com o termo têm prioridade)
          score: city.name.toLowerCase().startsWith(searchTerm) ? 100 : 
                 city.name.toLowerCase().includes(searchTerm) ? 50 : 10
        }
      })
    )
    
    // Ordenar e limitar resultados
    const finalCities = citiesWithCoordinates
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // Limitar a 10 cidades

    console.log(`✅ Encontradas ${finalCities.length} cidades para "${searchTerm}"`)

    res.json({ addresses: finalCities })
  } catch (error) {
    console.error('❌ Erro na API de busca de endereços:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}