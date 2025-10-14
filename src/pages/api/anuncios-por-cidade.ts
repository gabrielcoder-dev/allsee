import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '@/lib/supabaseServer'

// Função para calcular distância entre duas coordenadas (em km)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { cityLat, cityLng, cityName, radius = 50 } = req.query

    if (!cityLat || !cityLng) {
      return res.status(400).json({ error: 'cityLat and cityLng are required' })
    }

    const cityLatitude = parseFloat(cityLat as string)
    const cityLongitude = parseFloat(cityLng as string)
    const searchRadius = parseFloat(radius as string) || 50
    const cityNameStr = cityName as string

    console.log('🏙️ Buscando totens para cidade:', { cityLatitude, cityLongitude, cityName: cityNameStr, searchRadius })

    // Buscar todos os totens com markers
    const { data: anunciosData, error: anunciosError } = await supabaseServer
      .from('anuncios')
      .select(`
        id, 
        name, 
        address,
        price,
        type_screen,
        display,
        views,
        screens,
        duration_2,
        duration_4,
        duration_12,
        duration_24,
        nicho,
        image,
        markers!inner(id, lat, lng)
      `)

    if (anunciosError) {
      console.error('❌ Erro ao buscar totens:', anunciosError)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }

    // Filtrar totens pela cidade
    const totensNaCidade = anunciosData?.filter(totem => {
      // Pegar as coordenadas do primeiro marker
      const marker = Array.isArray(totem.markers) ? totem.markers[0] : totem.markers
      
      if (!marker || !marker.lat || !marker.lng) {
        return false
      }

      // FILTRO PRINCIPAL: Verificar se o nome da cidade está no endereço do totem
      if (cityNameStr) {
        const totemAddress = (totem.address || '').toLowerCase()
        const searchCityName = cityNameStr.toLowerCase()
        
        console.log('🔍 Verificando totem:', {
          totemId: totem.id,
          totemName: totem.name,
          totemAddress: totem.address,
          cityName: cityNameStr
        })
        
        // Verificar se o nome da cidade está no endereço
        const hasCityInAddress = totemAddress.includes(searchCityName)
        
        if (!hasCityInAddress) {
          console.log('❌ Cidade não encontrada no endereço do totem')
          return false
        }
        
        console.log('✅ Cidade encontrada no endereço do totem!')
        return true
      }

      // FILTRO SECUNDÁRIO (fallback): Filtrar por raio se não tiver nome da cidade
      const distance = calculateDistance(
        cityLatitude, 
        cityLongitude, 
        marker.lat, 
        marker.lng
      )

      return distance <= searchRadius
    }) || []

    console.log(`✅ Encontrados ${totensNaCidade.length} totens na cidade ${cityNameStr || 'desconhecida'}`)

    res.json({ 
      totens: totensNaCidade,
      total: totensNaCidade.length,
      city: {
        lat: cityLatitude,
        lng: cityLongitude,
        name: cityNameStr,
        radius: searchRadius
      }
    })
  } catch (error) {
    console.error('❌ Erro na API de totens por cidade:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}
