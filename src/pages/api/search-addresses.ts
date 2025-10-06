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

    // Dados mockados para teste
    const mockAddresses = [
      {
        id: 1,
        name: "Totem Centro",
        address: "Rua das Flores, Centro, Primavera do Leste - MT",
        score: calculateRelevanceScore(searchTerm, "Totem Centro", "Rua das Flores, Centro, Primavera do Leste - MT")
      },
      {
        id: 2,
        name: "Totem Shopping",
        address: "Avenida Paulista, Bela Vista, São Paulo - SP",
        score: calculateRelevanceScore(searchTerm, "Totem Shopping", "Avenida Paulista, Bela Vista, São Paulo - SP")
      },
      {
        id: 3,
        name: "Totem Mercado",
        address: "Rua do Comércio, Centro, Primavera do Leste - MT",
        score: calculateRelevanceScore(searchTerm, "Totem Mercado", "Rua do Comércio, Centro, Primavera do Leste - MT")
      }
    ]

    // Filtrar por termo de busca
    const filteredAddresses = mockAddresses.filter(addr => 
      addr.name.toLowerCase().includes(searchTerm) || 
      addr.address.toLowerCase().includes(searchTerm)
    )

    // Ordenar por relevância
    filteredAddresses.sort((a, b) => b.score - a.score)

    console.log(`✅ Encontrados ${filteredAddresses.length} endereços para "${searchTerm}"`)

    res.json({ addresses: filteredAddresses })
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
