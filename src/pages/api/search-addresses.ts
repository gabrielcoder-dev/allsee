import { NextApiRequest, NextApiResponse } from 'next'

// Cache para armazenar cidades brasileiras
let brazilianCitiesCache: any[] = []
let cacheTimestamp = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 horas

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
      lat: null, // IBGE não fornece coordenadas diretamente
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

// Função para obter coordenadas usando Nominatim (OpenStreetMap)
async function getCoordinates(cityName: string, state: string): Promise<{lat: number, lng: number} | null> {
  try {
    const query = `${cityName}, ${state}, Brasil`
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br`
    )
    
    if (!response.ok) return null
    
    const data = await response.json()
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      }
    }
    return null
  } catch (error) {
    console.error(`❌ Erro ao buscar coordenadas para ${cityName}:`, error)
    return null
  }
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
      .slice(0, 20) // Limitar a 20 resultados para performance
      .map(async (city) => {
        // Se não tem coordenadas, tentar buscar
        let lat = city.lat
        let lng = city.lng
        
        if (!lat || !lng) {
          const coords = await getCoordinates(city.name, city.state)
          if (coords) {
            lat = coords.lat
            lng = coords.lng
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

    // Aguardar todas as coordenadas serem resolvidas
    const resolvedCities = await Promise.all(matchingCities)
    
    // Filtrar cidades com coordenadas válidas e ordenar
    const finalCities = resolvedCities
      .filter(city => city.lat && city.lng)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // Limitar a 10 cidades

    console.log(`✅ Encontradas ${finalCities.length} cidades para "${searchTerm}"`)

    res.json({ addresses: finalCities })
  } catch (error) {
    console.error('❌ Erro na API de busca de endereços:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}