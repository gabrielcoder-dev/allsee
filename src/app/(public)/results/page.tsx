'use client'

import React, { useState, useEffect, useRef } from 'react'
import HeaderResultsDesktop from '@/Components/HeaderResultsDesktop'
import MobileHeader from '@/Components/HeaderResultsMobile'
import HeaderPrice from '@/Components/HeaderPrice'
import dynamic from 'next/dynamic'
import GetAnunciosResults from '@/Components/GetAnunciosResults'
import SearchAnimation from '@/Components/SearchAnimation'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useCart } from '@/context/CartContext'
import ModalNichoEmpresa from '@/Components/ModalNichoEmpresa'
import { createClient } from '@supabase/supabase-js'
import { MapIcon, PanelLeftIcon } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const Mapbox = dynamic(() => import('@/Components/MapboxWrapper'), { 
  ssr: false,
  loading: () => (
    <div className="hidden xl:flex w-[400px] flex-shrink-0 z-0 items-center justify-center" style={{ height: '100vh' }}>
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="text-sm text-gray-600">Carregando mapa...</span>
      </div>
    </div>
  )
})

const Page = () => {
  const { selectedDurationGlobal, setSelectedDurationGlobal } = useCart();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [tipoMidia, setTipoMidia] = useState<string | null>(null);
  const [bairros, setBairros] = useState<string[]>([]);
  const [orderBy, setOrderBy] = useState<string>('');
  const [anunciosFiltrados, setAnunciosFiltrados] = useState<any[]>([]);
  const [specificTotemId, setSpecificTotemId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const mapRef = useRef<any>(null);
  
  // Estados para o modal de nicho
  const [showNichoModal, setShowNichoModal] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [userNicho, setUserNicho] = useState<string | null>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isMobileMapView, setIsMobileMapView] = useState(false);

  // Garantir que o componente está montado no cliente
  useEffect(() => {
    setMounted(true);
    
    // Simular tempo de carregamento inicial para mostrar a animação
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 2000); // 2 segundos de animação inicial
    
    // Cleanup function para limpar estado quando componente for desmontado
    return () => {
      clearTimeout(timer);
      setMounted(false);
      setProdutos([]);
      setTipoMidia(null);
      setBairros([]);
      setOrderBy('');
      setAnunciosFiltrados([]);
      setSpecificTotemId(null);
      setIsMapFullscreen(false);
      setIsMobileMapView(false);
      setShowNichoModal(false);
      setIsFirstTimeUser(false);
      setUserNicho(null);
      setIsInitialLoading(true);
    }
  }, []);

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
    setSpecificTotemId(totemId)
  }

  // Função para alternar entre mapa lateral e mapa em tela cheia
  const toggleMapView = () => {
    setIsMapFullscreen(!isMapFullscreen)
  }

  // Função para alternar entre lista e mapa no mobile
  const toggleMobileMapView = () => {
    setIsMobileMapView(!isMobileMapView)
  }

  // Limpar specificTotemId quando bairros mudar (usuário digitou algo novo)
  useEffect(() => {
    if (bairros.length === 0) {
      setSpecificTotemId(null);
    }
  }, [bairros]);

  // Verificar se é o primeiro acesso do usuário e obter o nicho
  useEffect(() => {
    if (!mounted) return;

    const checkFirstTimeUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          console.log('🔍 Verificando usuário:', user.id)
          
          // Verificar se já existe um profile com nicho
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('nicho')
            .eq('id', user.id)
            .single()

          console.log('📋 Profile encontrado:', profile)
          console.log('❌ Erro na busca:', error)

          // Se não existe profile ou não tem nicho, é primeiro acesso
          if (!profile || !profile.nicho) {
            console.log('🆕 Usuário novo detectado - mostrando modal')
            setIsFirstTimeUser(true)
            setShowNichoModal(true)
          } else {
            console.log('👤 Usuário existente - nicho:', profile.nicho)
            setUserNicho(profile.nicho)
          }
        } else {
          console.log('❌ Nenhum usuário autenticado')
        }
      } catch (error) {
        console.error('❌ Erro ao verificar primeiro acesso:', error)
        // Em caso de erro, mostrar o modal para garantir
        setIsFirstTimeUser(true)
        setShowNichoModal(true)
      }
    }

    checkFirstTimeUser()
  }, [mounted])

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

  // Não renderizar até estar montado
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="text-sm text-gray-600">Carregando...</span>
        </div>
      </div>
    );
  }

  // Mostrar animação de carregamento inicial
  if (isInitialLoading) {
    return (
      <div className='h-screen flex flex-col'>
        {/* Cabeçalho Desktop */}
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
          onSpecificTotemFound={handleSpecificTotemFound}
        />
        
        {/* Cabeçalho Mobile */}
        <div className={`${isMobileMapView ? 'hidden' : 'block'}`}>
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
            onToggleMapView={toggleMobileMapView}
            isMapView={isMobileMapView}
          />
        </div>

        {/* Animação de carregamento inicial */}
        <SearchAnimation isVisible={true} />

        {/* HeaderPrice - sempre visível e fixo */}
        <HeaderPrice />
      </div>
    );
  }

  return (
    <div className='h-screen flex flex-col'>
      {/* Cabeçalho Desktop */}
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
        onSpecificTotemFound={handleSpecificTotemFound}
      />
      
      {/* Cabeçalho Mobile - ocultar quando mapa estiver ativo */}
      <div className={`${isMobileMapView ? 'hidden' : 'block'}`}>
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
          onToggleMapView={toggleMobileMapView}
          isMapView={isMobileMapView}
        />
      </div>

      {/* Área principal com scroll controlado */}
      <div className={`flex flex-1 min-h-0 overflow-hidden ${isMapFullscreen ? '' : 'xl:pl-16'} justify-center xl:justify-between relative`}>
        {/* Conteúdo principal - Desktop */}
        <div className={`flex flex-1 ${isMapFullscreen ? 'hidden' : 'block'} hidden xl:block overflow-y-auto pb-20`}>
          <GetAnunciosResults 
            onAdicionarProduto={handleAdicionarProduto} 
            selectedDuration={selectedDurationGlobal} 
            tipoMidia={tipoMidia} 
            bairros={bairros}
            orderBy={orderBy}
            onChangeAnunciosFiltrados={setAnunciosFiltrados}
            userNicho={userNicho}
            onSpecificTotemFound={handleSpecificTotemFound}
            specificTotemId={specificTotemId}
            isInitialLoading={isInitialLoading}
          />
        </div>

        {/* Mapa - Desktop */}
        <div className={`${isMapFullscreen ? 'w-full h-full' : 'hidden xl:block w-[400px]'}`}>
          <Mapbox 
            anunciosFiltrados={anunciosFiltrados} 
            onCityFound={handleCityFound} 
            userNicho={userNicho} 
            specificTotemId={specificTotemId}
            isFullscreen={isMapFullscreen}
            onToggleMapView={toggleMapView}
            isInitialLoading={isInitialLoading}
          />
        </div>

        {/* Mobile - Lista ou Mapa */}
        <div className="xl:hidden w-full h-full relative">
          {/* GetAnunciosResults sempre presente */}
          <div className={`w-full h-full overflow-y-auto pb-20 ${isMobileMapView ? 'hidden' : 'block'}`}>
            <GetAnunciosResults 
              onAdicionarProduto={handleAdicionarProduto} 
              selectedDuration={selectedDurationGlobal} 
              tipoMidia={tipoMidia} 
              bairros={bairros}
              orderBy={orderBy}
              onChangeAnunciosFiltrados={setAnunciosFiltrados}
              userNicho={userNicho}
              onSpecificTotemFound={handleSpecificTotemFound}
              specificTotemId={specificTotemId}
              isInitialLoading={isInitialLoading}
            />
          </div>
          
          {/* Mapa sobreposto quando ativo */}
          {isMobileMapView && (
            <div className="absolute inset-0 z-50">
              <Mapbox 
                anunciosFiltrados={anunciosFiltrados} 
                onCityFound={handleCityFound} 
                userNicho={userNicho} 
                specificTotemId={specificTotemId}
                isFullscreen={true}
                onToggleMapView={toggleMobileMapView}
                isInitialLoading={isInitialLoading}
              />
            </div>
          )}
        </div>
      </div>

      {/* HeaderPrice - sempre visível e fixo */}
      <HeaderPrice />

      {/* Modal de Nicho da Empresa */}
      <ModalNichoEmpresa
        open={showNichoModal}
        onClose={() => setShowNichoModal(false)}
        onNichoSelected={handleNichoSelected}
      />

      <ToastContainer />
    </div>
  )
}

export default Page
