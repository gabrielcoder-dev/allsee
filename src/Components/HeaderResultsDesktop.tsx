'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Button } from '@/Components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Calendar } from '@/Components/ui/calendar'
import { CalendarIcon, ChevronDownIcon, MapPinIcon, ShoppingCartIcon, MenuIcon, Search, Sliders } from 'lucide-react'
import { supabase } from '@/lib/supabase' // ajuste o caminho se necessário
import logoImg from "@/assets/logo.png"
import Image from 'next/image'
import FilterModal from '@/Components/FilterModal'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import ModalMenu from './ModalMenu'
import { useAddressSearch } from '@/hooks/useAddressSearch'
import AddressAutocomplete from '@/Components/AddressAutocomplete'
import SearchAnimation from '@/Components/SearchAnimation'

const durations = [
  { label: '2 semanas', value: '2' },
  { label: '4 semanas', value: '4' },
  { label: '12 semanas', value: '12' },
  { label: '24 semanas', value: '24' },
]

const orderOptions = [
  { label: '$ menor para maior', value: 'price-asc' },
  { label: '$ maior para menor', value: 'price-desc' },
]

type Produto = {
  id: string
  name: string
  image: string
  address: string
  price: number
  quantity: number
  duration: string
  screens: number
  // Adicione outros campos conforme necessário para corresponder ao ModalCartToten
}

type HeaderResultsDesktopProps = {
  onDurationChange?: (value: string) => void;
  selectedDuration?: string;
  onTipoMidiaChange?: (tipo: string | null, bairros: string[]) => void;
  orderBy?: string;
  onOrderChange?: (order: string) => void;
  onCityFound?: (coords: { lat: number; lng: number; totemId?: number; cityName?: string }) => void;
  onSpecificTotemFound?: (totemId: number) => void;
}

const HeaderResultsDesktop = ({ onDurationChange, selectedDuration, onTipoMidiaChange, orderBy, onOrderChange, onCityFound, onSpecificTotemFound }: HeaderResultsDesktopProps) => {
  const [userName, setUserName] = useState<string>('')
  const [showFilter, setShowFilter] = useState(false)
  const [open, setOpen] = useState(false)
  const [tipoMidia, setTipoMidia] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { produtos, setSelectedDurationGlobal, selectedDurationGlobal, formData, updateFormData } = useCart()
  const durationValue = selectedDuration || '2'
  const totalNoCarrinho = produtos.reduce((acc, p) => acc + p.quantidade, 0)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  
  // Hook de busca de endereços com autocomplete
  const {
    query,
    setQuery,
    suggestions,
    isLoading,
    isOpen,
    error,
    selectAddress,
    closeDropdown
  } = useAddressSearch({ debounceMs: 300, minLength: 2 })

  // Garantir que está no cliente
  useEffect(() => {
    setMounted(true)
  }, [])

  // Função para criar string yyyy-MM-dd
  function toYMD(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
  // Função para parsear string yyyy-MM-dd para Date
  function parseLocalDateString(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // Novo: obter startDate do contexto global
  const startDate = formData.startDate && /^\d{4}-\d{2}-\d{2}$/.test(formData.startDate)
    ? parseLocalDateString(formData.startDate)
    : undefined;
  const today = new Date();
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);

  useEffect(() => {
    if (!mounted) return;
    
    const fetchUserName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserName(user.user_metadata?.name || user.email)
        }
      } catch (error) {
        console.error('Erro ao buscar usuário:', error)
      }
    }
    fetchUserName()
  }, [mounted])

  // Debug: log when showMenuModal changes
  useEffect(() => {
    if (mounted) {
      console.log('showMenuModal changed:', showMenuModal)
    }
  }, [showMenuModal, mounted])


  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <>
      <div className="w-full border-b border-gray-200 hidden px-12 py-3 lg:flex top-0 left-0 right-0 z-40 justify-between items-center gap-4 ">

        <Image
        src={logoImg}
        alt="Logo"
        className='w-20'
        />

        {/* Pesquisa de localização */}
        <div className=' flex flex-col gap-4  md:flex-col lg:flex-row lg:items-center justify-center'>

          <div className='flex items-center gap-4 shadow-sm rounded-xl p-3'>
            <div className='flex items-center gap-8 bg-gray-50 rounded-lg px-3 py-2'>
              <AddressAutocomplete
                query={query}
                setQuery={setQuery}
                suggestions={suggestions}
                isLoading={isLoading}
                isOpen={isOpen}
                error={error}
                onSelectAddress={(address) => {
                  const selectedAddress = selectAddress(address);
                  console.log('🎯 Endereço selecionado:', selectedAddress.address);
                  console.log('🎯 Tipo:', address.type);
                  console.log('🎯 ID:', address.id);
                  console.log('🎯 Nome:', address.name);
                  console.log('🎯 Coordenadas:', { lat: address.lat, lng: address.lng });
                  
                  // Mostrar animação de pesquisa
                  setIsSearching(true);
                  
                  if (address.type === 'city') {
                    // Se for uma cidade, navegar para ela
                    console.log('🏙️ Cidade selecionada:', address.name);
                    
                    if (onCityFound) {
                      console.log('🗺️ Chamando onCityFound para navegar para cidade');
                      onCityFound({
                        lat: address.lat || 0,
                        lng: address.lng || 0,
                        totemId: undefined, // Cidades não têm totem específico
                        cityName: address.name // Passar nome da cidade
                      });
                    }
                    
                    // Para cidades, não filtrar por endereço específico
                    if (onTipoMidiaChange) {
                      console.log('🔄 Chamando onTipoMidiaChange sem filtro (cidade)');
                      onTipoMidiaChange(null, []); // Limpar filtros para mostrar todos os totens da cidade
                    }
                  } else {
                    // Se for um totem específico
                    console.log('🎯 Totem específico selecionado:', address.name);
                    
                    // Passar o endereço selecionado para mostrar totens relacionados
                    if (onTipoMidiaChange) {
                      console.log('🔄 Chamando onTipoMidiaChange com endereço:', address.address);
                      onTipoMidiaChange(null, [address.address]);
                    }
                    
                    // Notificar sobre totem específico encontrado
                    if (onSpecificTotemFound) {
                      console.log('🎯 Chamando onSpecificTotemFound com ID:', address.id);
                      onSpecificTotemFound(address.id);
                    }
                    
                    // Notificar o componente pai sobre a seleção (para o mapa)
                    if (onCityFound) {
                      console.log('🗺️ Chamando onCityFound para destacar no mapa');
                      onCityFound({
                        lat: address.lat || 0,
                        lng: address.lng || 0,
                        totemId: address.id
                      });
                    }
                  }
                  
                  // Simular tempo de carregamento e esconder animação
                  setTimeout(() => {
                    setIsSearching(false);
                  }, 2000); // 2 segundos de animação
                }}
                onCloseDropdown={closeDropdown}
                placeholder="Ex: Rua das Flores, Centro, Primavera do Leste"
                className="flex-1"
              />
              <Search className="w-5 h-5 text-gray-500 cursor-pointer lg:hidden" />
            </div>

            {/* Duração */}

            <div className='flex-col hidden md:flex'>
              <span className="text-gray-500 mb-1 font-semibold">Duração</span>
              <Select value={selectedDurationGlobal} onValueChange={setSelectedDurationGlobal}>
                <SelectTrigger className="w-32 bg-gray-50 rounded-lg px-3 py-2">
                  <SelectValue placeholder="duração" />
                </SelectTrigger>
                <SelectContent>
                  {durations.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data de início */}
             <div className='flex-col hidden md:flex'>
              <span className="text-gray-500 mb-1 font-semibold">Inicio</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-orange-500" />
                  <span>
                    {formData.startDate && /^\d{4}-\d{2}-\d{2}$/.test(formData.startDate)
                      ? startDate && startDate instanceof Date
                        ? startDate.toLocaleDateString('pt-BR')
                        : 'início'
                      : 'início'}
                  </span>
                  <ChevronDownIcon className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={date => {
                    if (date) updateFormData({ startDate: toYMD(date) });
                  }}
                  disabled={date =>
                    date < twoDaysFromNow
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          </div>
          <div className='w-full flex items-center justify-between gap-6'>
            {/* Ordenar */}
            <div className="relative" ref={popoverRef}>
        <button
          type="button"
          className="flex items-center gap-1 text-gray-600 font-medium px-2 py-1 rounded hover:bg-gray-100"
          onClick={() => setOpen(o => !o)}
        >
          ordenar
          <ChevronDownIcon className="w-4 h-4" />
        </button>
        {open && (
          <div className="absolute left-0 mt-2 min-w-[180px] bg-white rounded-xl shadow-lg border z-30 py-2">
            {orderOptions.map(opt => (
              <button
                key={opt.value}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 text-sm ${
                  orderBy === opt.value ? 'font-semibold text-orange-600' : 'text-gray-900'
                }`}
                onClick={() => {
                  onOrderChange?.(opt.value)
                  setOpen(false)
                }}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

            {/* Filtrar */}
            <Button variant="ghost" className="flex items-center gap-1 text-gray-700" onClick={() => setShowFilter(true)} type="button">
              <Sliders className="w-5 h-5" />
              <span>filtrar</span>
            </Button>
          </div>
        </div>


        <div className='flex items-center gap-8'>
          {/* Carrinho */}
          <Button
            variant="ghost"
            className="relative cursor-pointer"
            onClick={() => router.push('/resumo')}
          >
            <ShoppingCartIcon className="w-7 h-7" />
            {totalNoCarrinho > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full px-1">
                {String(totalNoCarrinho).padStart(2, '0')}
              </span>
            )}
          </Button>

          {/* Saudação e menu */}
          <div className="flex items-center gap-2">
            {userName && (
              <span className="text-gray-700">
                Olá, <span className="font-semibold text-orange-600">{userName}</span>
              </span>
            )}
            <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => {
              setShowMenuModal(true)
            }}>
              <MenuIcon className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Modal de filtro */}
        <FilterModal open={showFilter} onClose={() => setShowFilter(false)} onFilter={(tipo, bairros) => {
          setTipoMidia(tipo);
          if (onTipoMidiaChange) onTipoMidiaChange(tipo, bairros);
        }} />
        <ModalMenu open={showMenuModal} onClose={() => setShowMenuModal(false)} />

      </div>
      
      {/* Animação de pesquisa */}
      <SearchAnimation isVisible={isSearching} />
    </>
  )
}

const Page = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <HeaderResultsDesktop />
      {/* Conteúdo dos resultados vai aqui */}
    </div>
  )
}

export default HeaderResultsDesktop