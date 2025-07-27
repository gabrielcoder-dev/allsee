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

    // Buscar totens que correspondam ao endereço
    const { data, error } = await supabase
      .from('anuncios')
      .select('id, name, adress, endereco')
      .or(`adress.ilike.%${address}%,endereco.ilike.%${address}%`)

    if (error) {
      console.error('Erro ao buscar totem:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }

    // Se encontrou um totem específico
    if (data && data.length > 0) {
      return res.status(200).json({ 
        data: { 
          isSpecificTotem: true, 
          totemId: data[0].id 
        } 
      })
    }

    // Se não encontrou totem específico
    return res.status(200).json({ 
      data: { 
        isSpecificTotem: false 
      } 
    })

  } catch (error) {
    console.error('Erro na API:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
} 