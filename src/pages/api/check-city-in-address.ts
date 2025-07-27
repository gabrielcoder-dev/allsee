import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { address } = req.body

    if (!address) {
      return res.status(400).json({ error: 'Address is required' })
    }

    // Lista de cidades conhecidas com markers (você pode expandir esta lista)
    const citiesWithMarkers = [
      'Primavera do Leste',
      'Cuiabá',
      'Rondonópolis',
      'Barra do Garças',
      'Campo Verde',
      'Poxoréu',
      'Nova Xavantina',
      'Água Boa',
      'Canarana',
      'Querência',
      'São Félix do Araguaia',
      'Confresa',
      'Vila Rica',
      'Luciara',
      'Porto Alegre do Norte',
      'São José do Xingu',
      'Santa Cruz do Xingu',
      'Bom Jesus do Araguaia',
      'Serra Nova Dourada',
      'Novo Santo Antônio',
      'Ribeirão Cascalheira',
      'São José do Rio Claro',
      'Nova Mutum',
      'Lucas do Rio Verde',
      'Sorriso',
      'Sinop',
      'Alta Floresta',
      'Colíder',
      'Nova Canaã do Norte',
      'Peixoto de Azevedo',
      'Guarantã do Norte',
      'Matupá',
      'Itaúba',
      'Nova Santa Helena',
      'Terra Nova do Norte',
      'Nova Bandeirantes',
      'Nova Monte Verde',
      'Cotriguaçu',
      'Juara',
      'Porto dos Gaúchos',
      'Nova Maringá',
      'Nova Ubiratã',
      'Ipiranga do Norte',
      'Itanhangá',
      'Tapurah',
      'Cláudia',
      'Marcelândia',
      'Santa Carmem',
      'União do Sul',
      'Nova Guarita',
      'Nova Brasilândia',
      'Aripuanã',
      'Colniza',
      'Rondolândia',
      'Juruena',
      'Castanheira',
      'Juína',
      'Ariquemes',
      'Ji-Paraná',
      'Vilhena',
      'Cacoal',
      'Pimenta Bueno',
      'Rolim de Moura',
      'Ouro Preto do Oeste',
      'Jaru',
      'Machadinho d\'Oeste',
      'Cerejeiras',
      'Colorado do Oeste',
      'Costa Marques',
      'Guajará-Mirim',
      'Porto Velho',
      'Rio Branco',
      'Cruzeiro do Sul',
      'Tarauacá',
      'Sena Madureira',
      'Brasiléia',
      'Epitaciolândia',
      'Xapuri',
      'Capixaba',
      'Plácido de Castro',
      'Acrelândia',
      'Senador Guiomard',
      'Mâncio Lima',
      'Rodrigues Alves',
      'Marechal Thaumaturgo',
      'Porto Walter',
      'Feijó',
      'Manoel Urbano',
      'Santa Rosa do Purus',
      'Assis Brasil'
    ]

    // Verificar se o endereço contém alguma cidade com markers
    const hasCityWithMarkers = citiesWithMarkers.some(city => 
      address.toLowerCase().includes(city.toLowerCase())
    )

    return res.status(200).json({ 
      data: { 
        hasCityWithMarkers 
      } 
    })

  } catch (error) {
    console.error('Erro na API:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
} 