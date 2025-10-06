import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '@/lib/supabaseServer'

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

    console.log('🔍 Buscando endereços para:', searchTerm)

    // Buscar totens que correspondem ao termo de busca com coordenadas dos markers
    const { data: anunciosData, error: anunciosError } = await supabaseServer
      .from('anuncios')
      .select(`
        id, 
        name, 
        address,
        markers!inner(id, lat, lng)
      `)
      .or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
      .limit(10)

    console.log('📊 Resultado da busca:', { anunciosData, anunciosError })

    if (anunciosError) {
      console.error('❌ Erro ao buscar endereços:', anunciosError)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }

    // Processar e formatar os resultados
    const addresses = anunciosData?.map(totem => {
      // Usar o campo de endereço mais completo disponível
      const fullAddress = totem.address || totem.name
      
      // Pegar as coordenadas do primeiro marker (se houver)
      const marker = Array.isArray(totem.markers) ? totem.markers[0] : totem.markers
      
      return {
        id: totem.id,
        name: totem.name,
        address: fullAddress,
        lat: marker?.lat || 0,
        lng: marker?.lng || 0,
        // Adicionar score para ordenação (mais relevante primeiro)
        score: calculateRelevanceScore(searchTerm, totem.name, fullAddress)
      }
    }) || []

    // Ordenar por relevância (score mais alto primeiro)
    addresses.sort((a, b) => b.score - a.score)

    console.log(`✅ Encontrados ${addresses.length} endereços para "${searchTerm}"`)

    res.json({ addresses })
  } catch (error) {
    console.error('❌ Erro na API de busca de endereços:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// Função para calcular relevância do resultado
function calculateRelevanceScore(searchTerm: string, name: string, address: string): number {
  let score = 0
  const searchLower = searchTerm.toLowerCase()
  const nameLower = name.toLowerCase()
  const addressLower = address.toLowerCase()

  // Match exato no nome = score mais alto
  if (nameLower === searchLower) {
    score += 100
  } else if (nameLower.startsWith(searchLower)) {
    score += 80
  } else if (nameLower.includes(searchLower)) {
    score += 60
  }

  // Match exato no endereço
  if (addressLower === searchLower) {
    score += 90
  } else if (addressLower.startsWith(searchLower)) {
    score += 70
  } else if (addressLower.includes(searchLower)) {
    score += 50
  }

  // Bonus para correspondências no início das palavras
  const words = addressLower.split(' ')
  words.forEach(word => {
    if (word.startsWith(searchLower)) {
      score += 10
    }
  })

  return score
}
