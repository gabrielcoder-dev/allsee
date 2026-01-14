'use client'

import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { greenPinIcon } from './CustomMarkerIcon';
import MiniAnuncioCard from './MiniAnuncioCard';
import { MapIcon, ArrowLeft } from 'lucide-react';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/images/marker-icon-2x.png',
  iconUrl: '/images/marker-icon.png',
  shadowUrl: '/images/marker-shadow.png',
})

// Coordenadas de Primavera do Leste, MT
const PRIMAVERA_DO_LESTE_COORDS: LatLngTuple = [-15.5586, -54.2940]

type MarkerType = {
  id: number;
  anuncio_id: number;
  lat: number;
  lng: number;
  anuncio: {
    id: number;
    name?: string;
    nome?: string;
    adress?: string;
    endereco?: string;
    price?: number;
    duration?: number;
    nicho?: string;
  };
};

// Função para extrair cidade do endereço
function extractCityFromAddress(address: string): string | null {
  if (!address) return null;
  
  // Formato típico: "Rua - Número - Bairro - Cidade - Estado"
  const parts = address.split(' - ').map(p => p.trim());
  
  // A cidade geralmente está no penúltimo ou último lugar (antes do estado)
  // Ex: "Rua Goiás - 1345 - Jardim Cuiabá - Barra do Garças - MT"
  if (parts.length >= 2) {
    // Se tiver estado no final, a cidade é o penúltimo
    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts[parts.length - 2];
    
    // Se o último é um estado (2 letras), a cidade é o penúltimo
    if (lastPart.length === 2 && /^[A-Z]{2}$/.test(lastPart)) {
      return secondLastPart;
    }
    // Caso contrário, pode ser que a cidade esteja no último lugar
    return lastPart;
  }
  
  return null;
}

// Lista de cidades conhecidas de Mato Grosso com coordenadas
const KNOWN_CITIES_COORDS: {[key: string]: LatLngTuple} = {
  'Primavera do Leste': [-15.5586, -54.2811],
  'Cuiabá': [-15.6014, -56.0979],
  'Várzea Grande': [-15.6500, -56.1322],
  'Rondonópolis': [-16.4706, -54.6356],
  'Sinop': [-11.8604, -55.5091],
  'Barra do Garças': [-15.8900, -52.2567],
  'Tangará da Serra': [-14.6229, -57.4933],
  'Cáceres': [-16.0764, -57.6811],
  'Sorriso': [-12.5428, -55.7069],
  'Lucas do Rio Verde': [-13.0583, -55.9042],
  'Nova Mutum': [-13.8378, -56.0861],
  'Campo Verde': [-15.5450, -55.1625],
  'Diamantino': [-14.4086, -56.4461],
  'Poconé': [-16.2561, -56.6228],
  'Alta Floresta': [-9.8756, -56.0861],
  'Juína': [-11.3778, -58.7392],
  'Colíder': [-10.8139, -55.4511],
  'Guarantã do Norte': [-9.7878, -54.9011],
  'Peixoto de Azevedo': [-10.2250, -54.9811],
  'Nova Xavantina': [-14.6761, -52.3550],
  'Canarana': [-13.5519, -52.2708],
  'Querência': [-12.6097, -52.1831],
  'São Félix do Araguaia': [-11.6147, -50.6706],
  'Confresa': [-10.6439, -51.5697],
  'Vila Rica': [-10.0139, -51.1186],
  'Comodoro': [-13.6619, -59.7861],
  'Pontes e Lacerda': [-15.2261, -59.3353],
  'Vila Bela da Santíssima Trindade': [-15.0089, -59.9508],
  'Mirassol d\'Oeste': [-15.6758, -58.0950],
  'São José dos Quatro Marcos': [-15.6278, -58.1772],
  'Araputanga': [-15.4647, -58.3425],
  'Lambari d\'Oeste': [-15.3189, -58.0028],
  'Rio Branco': [-15.2419, -58.1258],
  'Salto do Céu': [-15.1303, -58.1317],
  'Glória d\'Oeste': [-15.7689, -58.3108]
}

// Função para normalizar nome da cidade (case-insensitive, sem acentos)
function normalizeCityName(cityName: string): string {
  return cityName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// Função para encontrar coordenadas de uma cidade
function getCityCoordinates(cityName: string): LatLngTuple | null {
  if (!cityName) return null;
  
  const normalized = normalizeCityName(cityName);
  
  for (const [knownCity, coords] of Object.entries(KNOWN_CITIES_COORDS)) {
    if (normalizeCityName(knownCity) === normalized) {
      return coords;
    }
  }
  
  return null;
}

// Componente para controlar o mapa
function MapController({ 
  markers,
  produtos
}: { 
  markers: MarkerType[];
  produtos: any[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!produtos || produtos.length === 0) {
      // Se não há produtos, voltar para Primavera do Leste
      const timer = setTimeout(() => {
        map.setView(PRIMAVERA_DO_LESTE_COORDS, 12);
      }, 100);
      return () => clearTimeout(timer);
    }

    // Filtrar apenas os markers que estão no carrinho
    const markersNoCarrinho = markers.filter(marker => {
      const markerAnuncioId = marker.anuncio_id?.toString();
      return produtos.some(p => p.id === markerAnuncioId);
    });

    if (markersNoCarrinho.length === 0) {
      // Se não há markers no carrinho, voltar para Primavera do Leste
      const timer = setTimeout(() => {
        map.setView(PRIMAVERA_DO_LESTE_COORDS, 12);
      }, 100);
      return () => clearTimeout(timer);
    }

    // Extrair cidades de cada produto
    const produtosComCidades = produtos.map((produto, index) => {
      const cidade = extractCityFromAddress(produto.endereco || '');
      const marker = markersNoCarrinho.find(m => m.anuncio_id?.toString() === produto.id);
      return {
        produto,
        cidade,
        marker,
        index // Ordem de adição (primeiro = 0)
      };
    }).filter(item => item.marker); // Apenas produtos que têm marker

    if (produtosComCidades.length === 0) {
      const timer = setTimeout(() => {
        map.setView(PRIMAVERA_DO_LESTE_COORDS, 12);
      }, 100);
      return () => clearTimeout(timer);
    }

    // Lógica de navegação
    let targetCoords: LatLngTuple;
    let targetZoom: number;

    if (produtosComCidades.length === 1) {
      // Caso 1: Apenas 1 totem → ir para o marker específico
      const marker = produtosComCidades[0].marker!;
      targetCoords = [marker.lat, marker.lng];
      targetZoom = 15; // Zoom próximo para ver o totem
      console.log('📍 Navegando para 1 totem específico:', targetCoords);
    } else {
      // Caso 2: 2 ou mais totens
      const cidades = produtosComCidades.map(item => item.cidade).filter(Boolean);
      const cidadesUnicas = [...new Set(cidades)];
      
      if (cidadesUnicas.length === 1 && cidadesUnicas[0]) {
        // Caso 2a: Todos da mesma cidade → mostrar a cidade
        const cidadeCoords = getCityCoordinates(cidadesUnicas[0]);
        if (cidadeCoords) {
          targetCoords = cidadeCoords;
          targetZoom = 13; // Zoom médio para ver a cidade
          console.log('🏙️ Navegando para cidade:', cidadesUnicas[0], targetCoords);
        } else {
          // Se não encontrou coordenadas da cidade, calcular centro dos markers
          const lats = produtosComCidades.map(item => item.marker!.lat);
          const lngs = produtosComCidades.map(item => item.marker!.lng);
          targetCoords = [
            (Math.min(...lats) + Math.max(...lats)) / 2,
            (Math.min(...lngs) + Math.max(...lngs)) / 2
          ];
          targetZoom = 13;
          console.log('📍 Navegando para centro dos totens da mesma cidade:', targetCoords);
        }
      } else {
        // Caso 2b: Cidades diferentes → mostrar o primeiro totem adicionado
        const primeiroProduto = produtosComCidades[0];
        const marker = primeiroProduto.marker!;
        targetCoords = [marker.lat, marker.lng];
        targetZoom = 15; // Zoom próximo para ver o totem
        console.log('📍 Navegando para primeiro totem adicionado:', targetCoords);
      }
    }

    // Navegar para a posição calculada
    const timer = setTimeout(() => {
      map.setView(targetCoords, targetZoom);
    }, 100);

    return () => clearTimeout(timer);
  }, [map, produtos, markers]);

  return null;
}

export default function ResumoMap({ produtos }: { produtos: any[] }) {
  const [markers, setMarkers] = useState<MarkerType[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Verificação adicional para evitar erros de hidratação
  if (typeof window === 'undefined') {
    return null;
  }

  useEffect(() => {
    setMounted(true)
    
    // Cleanup function para limpar estado quando componente for desmontado
    return () => {
      setMounted(false)
      setMarkers([])
      setLoading(true)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return;

    async function fetchMarkers() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('markers')
          .select('id, anuncio_id, lat, lng, anuncio:anuncio_id(*)')
        
        if (error) {
          console.error('Erro ao buscar markers:', error);
          setMarkers([])
          setLoading(false)
          return
        }
        
        if (!data || data.length === 0) {
          console.log('Nenhum marker encontrado');
          setMarkers([])
          setLoading(false)
          return
        }
        
        const markersFixed = data.map((marker: any) => ({
          ...marker,
          anuncio: Array.isArray(marker.anuncio) ? marker.anuncio[0] : marker.anuncio
        }));
        
        console.log('Markers carregados:', markersFixed);
        setMarkers(markersFixed)
      } catch (error) {
        console.error('Erro ao buscar markers:', error);
        setMarkers([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchMarkers()
  }, [mounted])

  // Filtrar apenas os markers que estão no carrinho
  const markersNoCarrinho = markers.filter(marker => {
    const markerAnuncioId = marker.anuncio_id?.toString();
    return produtos.some(p => p.id === markerAnuncioId);
  });

  console.log('Markers no carrinho:', markersNoCarrinho);

  // Não renderizar até estar montado
  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="text-sm text-gray-600">Carregando mapa...</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="text-sm text-gray-600">Carregando totens no mapa...</span>
        </div>
      </div>
    );
  }

  // Se o mapa estiver expandido, renderizar em tela cheia
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-20 bg-white" style={{ top: '95px', bottom: '80px' }}>
        {/* Mapa em tela cheia */}
        <div className="w-full h-full relative">
          {/* Botão "Voltar à compra" */}
          <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 99999, pointerEvents: 'auto' }}>
            <button
              onClick={() => setIsExpanded(false)}
              className="bg-white text-gray-800 px-4 py-2 rounded-2xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-md border border-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar à compra
            </button>
          </div>
          
          <MapContainer
            center={PRIMAVERA_DO_LESTE_COORDS}
            zoom={12}
            style={{ width: '100%', height: '100%' }}
            whenReady={() => {}}
            zoomControl={true}
            scrollWheelZoom={true}
            doubleClickZoom={true}
            boxZoom={true}
            keyboard={true}
            dragging={true}
            maxBounds={undefined}
            minZoom={1}
            maxZoom={18}
            worldCopyJump={true}
          >
            <MapController markers={markers} produtos={produtos} />
            
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              maxZoom={18}
              minZoom={1}
            />

            {markersNoCarrinho.map((marker) => (
              <Marker
                key={marker.id}
                position={[marker.lat, marker.lng]}
                icon={greenPinIcon}
              >
                <Popup minWidth={160} maxWidth={180}>
                  <MiniAnuncioCard anuncio={marker.anuncio} size="small" />
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    );
  }

  // Renderização normal do mapa
  return (
    <div className="w-full h-full map-container relative" style={{ position: 'relative' }}>
      {/* Botão "Ver o mapa" */}
      <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 1, pointerEvents: 'auto' }}>
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-white text-gray-800 px-4 py-2 rounded-2xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-md border border-gray-200"
        >
          <MapIcon className="w-4 h-4" />
          Ver o mapa
        </button>
      </div>
      
      <MapContainer
        center={PRIMAVERA_DO_LESTE_COORDS}
        zoom={12}
        style={{ width: '100%', height: '100%', zIndex: 0 }}
        whenReady={() => {}}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        boxZoom={true}
        keyboard={true}
        dragging={true}
        maxBounds={undefined}
        minZoom={1}
        maxZoom={18}
        worldCopyJump={true}
      >
        <MapController markers={markers} produtos={produtos} />
        
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={18}
          minZoom={1}
        />

        {markersNoCarrinho.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={greenPinIcon}
          >
            <Popup minWidth={160} maxWidth={180}>
              <MiniAnuncioCard anuncio={marker.anuncio} size="small" />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
} 