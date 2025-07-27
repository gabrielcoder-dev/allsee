'use client'

import React, { useState, useEffect } from 'react'
import HeaderResultsDesktop from '@/Components/HeaderResultsDesktop'
import MobileHeader from '@/Components/HeaderResultsMobile'
import HeaderPrice from '@/Components/HeaderPrice'
import dynamic from 'next/dynamic'
import GetAnunciosResults from '@/Components/GetAnunciosResults'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useCart } from '@/context/CartContext';

const Mapbox = dynamic(() => import('@/Components/MapboxClient'), { ssr: false })

const Page = () => {
  const { selectedDurationGlobal, setSelectedDurationGlobal } = useCart();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [tipoMidia, setTipoMidia] = useState<string | null>(null);
  const [bairros, setBairros] = useState<string[]>([]);
  const [orderBy, setOrderBy] = useState<string>('');
  const [anunciosFiltrados, setAnunciosFiltrados] = useState<any[]>([]); // NOVO
  const mapRef = useRef<any>(null);

  // Função para adicionar produto ao carrinho
  function handleAdicionarProduto(produto: any) {
    setProdutos(prev => [...prev, produto])
    toast.success('Produto adicionado ao carrinho!')
  }

  // Função para lidar com a busca do modal mobile
  const handleSearch = (location: string, duration: string, startDate: Date | undefined) => {
    setSelectedDurationGlobal(duration);
    console.log('Busca realizada:', { location, duration, startDate })
  }

  // Função para lidar com cidade encontrada
  const handleCityFound = (coords: { lat: number; lng: number }) => {
    console.log('Cidade encontrada:', coords)
    // Aqui você pode adicionar lógica adicional se necessário
  }

  return (
    <div className="flex flex-col h-screen">
      <HeaderResultsDesktop 
        onDurationChange={setSelectedDurationGlobal} 
        selectedDuration={selectedDurationGlobal} 
        onTipoMidiaChange={(tipo, bairros) => { setTipoMidia(tipo); setBairros(bairros); }}
        orderBy={orderBy}
        onOrderChange={setOrderBy}
        onCityFound={handleCityFound}
      />
      <MobileHeader 
        onDurationChange={setSelectedDurationGlobal} 
        selectedDuration={selectedDurationGlobal}
        onSearch={handleSearch}
        onTipoMidiaChange={(tipo, bairros) => { setTipoMidia(tipo); setBairros(bairros); }}
        orderBy={orderBy}
        onOrderChange={setOrderBy}
        onCityFound={handleCityFound}
      />
      {/* Área principal com scroll controlado */}
      <div className="flex flex-1 min-h-0 overflow-hidden xl:pl-16 justify-center xl:justify-between">
        <GetAnunciosResults 
          onAdicionarProduto={handleAdicionarProduto} 
          selectedDuration={selectedDurationGlobal} 
          tipoMidia={tipoMidia} 
          bairros={bairros}
          orderBy={orderBy}
          onChangeAnunciosFiltrados={setAnunciosFiltrados} // NOVO
        />
        <Mapbox anunciosFiltrados={anunciosFiltrados} onCityFound={handleCityFound} />
      </div>

      <HeaderPrice />

      <ToastContainer />
    </div>
  )
}

export default Page
