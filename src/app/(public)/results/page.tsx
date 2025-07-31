'use client'

import React, { useState, useEffect, useRef } from 'react'
import HeaderResultsDesktop from '@/Components/HeaderResultsDesktop'
import MobileHeader from '@/Components/HeaderResultsMobile'
import HeaderPrice from '@/Components/HeaderPrice'
import dynamic from 'next/dynamic'
import GetAnunciosResults from '@/Components/GetAnunciosResults'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useCart } from '@/context/CartContext'
import ModalNichoEmpresa from '@/Components/ModalNichoEmpresa'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const Mapbox = dynamic(() => import('@/Components/MapboxWrapper'), { ssr: false })

const Page = () => {
  const { selectedDurationGlobal, setSelectedDurationGlobal } = useCart();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [tipoMidia, setTipoMidia] = useState<string | null>(null);
  const [bairros, setBairros] = useState<string[]>([]);
  const [orderBy, setOrderBy] = useState<string>('');
  const [anunciosFiltrados, setAnunciosFiltrados] = useState<any[]>([]); // NOVO
  const [specificTotemId, setSpecificTotemId] = useState<number | null>(null);
  const mapRef = useRef<any>(null);
  
  // Estados para o modal de nicho
  const [showNichoModal, setShowNichoModal] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [userNicho, setUserNicho] = useState<string | null>(null);

  // Função para adicionar produto ao carrinho
  function handleAdicionarProduto(produto: any) {
    setProdutos(prev => [...prev, produto]);
  }

  // Função para remover produto do carrinho
  function handleRemoverProduto(produtoId: number) {
    setProdutos(prev => prev.filter(p => p.id !== produtoId));
  }

  // Função para limpar carrinho
  function handleLimparCarrinho() {
    setProdutos([]);
  }

  // Função para buscar coordenadas da cidade
  const handleCityFound = (coords: { lat: number; lng: number; totemId?: number }) => {
    if (mapRef.current) {
      mapRef.current.setView([coords.lat, coords.lng], 15);
    }
  };

  // Função para busca
  const handleSearch = (location: string, duration: string, startDate: Date | undefined) => {
    // Implementar lógica de busca se necessário
    console.log('Busca:', { location, duration, startDate });
  };

  // Função para lidar com totem específico encontrado
  const handleSpecificTotemFound = (totemId: number) => {
    console.log('🎯 Totem específico encontrado na página:', totemId);
    setSpecificTotemId(totemId);
  };

  // Limpar specificTotemId quando bairros mudar (usuário digitou algo novo)
  useEffect(() => {
    if (bairros.length === 0) {
      setSpecificTotemId(null);
    }
  }, [bairros]);

  // Verificar se é o primeiro acesso do usuário e obter o nicho
  useEffect(() => {
    const checkFirstTimeUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Verificar se já existe um profile com nicho
          const { data: profile } = await supabase
            .from('profiles')
            .select('nicho')
            .eq('id', user.id)
            .single()

          // Se não existe profile ou não tem nicho, é primeiro acesso
          if (!profile || !profile.nicho) {
            setIsFirstTimeUser(true)
            setShowNichoModal(true)
          } else {
            // Se tem nicho, salvar para usar no filtro
            setUserNicho(profile.nicho)
          }
        }
      } catch (error) {
        console.error('Erro ao verificar primeiro acesso:', error)
      }
    }

    checkFirstTimeUser()
  }, [])

  // Função chamada quando o nicho é selecionado
  const handleNichoSelected = async () => {
    setShowNichoModal(false)
    setIsFirstTimeUser(false)
    
    // Buscar o nicho atualizado do usuário
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nicho')
          .eq('id', user.id)
          .single()
        
        if (profile?.nicho) {
          setUserNicho(profile.nicho)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar nicho atualizado:', error)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <HeaderResultsDesktop 
        onDurationChange={setSelectedDurationGlobal} 
        selectedDuration={selectedDurationGlobal}
        onTipoMidiaChange={(tipo, bairros) => { 
          setTipoMidia(tipo); 
          setBairros(bairros); 
        }}
        orderBy={orderBy}
        onOrderChange={setOrderBy}
        onCityFound={handleCityFound}
      />
      <MobileHeader 
        onDurationChange={setSelectedDurationGlobal} 
        selectedDuration={selectedDurationGlobal}
        onSearch={handleSearch}
        onTipoMidiaChange={(tipo, bairros) => { 
          setTipoMidia(tipo); 
          setBairros(bairros); 
        }}
        orderBy={orderBy}
        onOrderChange={setOrderBy}
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
          userNicho={userNicho}
          onSpecificTotemFound={handleSpecificTotemFound}
        />
        <Mapbox anunciosFiltrados={anunciosFiltrados} onCityFound={handleCityFound} userNicho={userNicho} specificTotemId={specificTotemId} />
      </div>

      <HeaderPrice />

      <ToastContainer />
      
      {/* Modal de nicho da empresa - obrigatório para primeiro acesso */}
      <ModalNichoEmpresa
        open={showNichoModal}
        onClose={() => setShowNichoModal(false)}
        onNichoSelected={handleNichoSelected}
      />
    </div>
  )
}

export default Page
