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
import { useCitySearch } from '@/hooks/useCitySearch'

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
  onCityFound?: (coords: { lat: number; lng: number; totemId?: number }) => void;
}

const HeaderResultsDesktop = ({ onDurationChange, selectedDuration, onTipoMidiaChange, orderBy, onOrderChange, onCityFound }: HeaderResultsDesktopProps) => {
  const [userName, setUserName] = useState<string>('')
  const [showFilter, setShowFilter] = useState(false)
  const [open, setOpen] = useState(false)
  const [tipoMidia, setTipoMidia] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { produtos, setSelectedDurationGlobal, selectedDurationGlobal, formData, updateFormData } = useCart()
  const durationValue = selectedDuration || '2'
  const totalNoCarrinho = produtos.reduce((acc, p) => acc + p.quantidade, 0)
  const [showMenuModal, setShowMenuModal] = useState(false)
  
  // Hook de busca automática de cidade
  const { searchTerm, setSearchTerm, isSearching, lastResult, error } = useCitySearch(2000)

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

  useEffect(() => {
    const fetchUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.name || user.email)
      }
    }
    fetchUserName()
  }, [])

  // Debug: log when showMenuModal changes
  useEffect(() => {
    console.log('showMenuModal changed:', showMenuModal)
  }, [showMenuModal])

  // Notificar quando uma cidade é encontrada
  useEffect(() => {
    if (lastResult) {
      // NÃO navegar automaticamente para a cidade encontrada
      // A navegação só acontecerá se houver markers nessa cidade
      
      // Notificar o componente pai
      if (onCityFound) {
        onCityFound({ 
          lat: lastResult.lat, 
          lng: lastResult.lng,
          totemId: lastResult.totemId 
        })
      }
    }
  }, [lastResult, onCityFound])

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
      <div className="w-full hidden px-12 py-3 lg:flex top-0 left-0 right-0 z-50 justify-between items-center gap-4 ">

        <Image
        src={logoImg}
        alt="Logo"
        className='w-20'
        />

        {/* Pesquisa de localização */}
        <div className=' flex flex-col gap-4  md:flex-col lg:flex-row lg:items-center justify-center'>


          <div className='flex items-center gap-4 shadow-sm rounded-xl p-3'>
            <div className='flex items-center gap-8 bg-gray-50 rounded-lg px-3 py-2'>

            
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-1">
                <MapPinIcon className="w-4 h-5 text-orange-500" />
                <span className="text-gray-500 mb-1 font-semibold">Endereço ou região</span>
                {isSearching && (
                  <span className="text-xs text-blue-500 ml-2">Buscando...</span>
                )}
              </div>

              <input
                type="text"
                placeholder="Ex.: Bairro Castelândia"
                className="bg-transparent outline-none flex-1 w-72 text-sm"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  if (onTipoMidiaChange) onTipoMidiaChange(null, e.target.value ? [e.target.value] : []);
                }}
              />
              {error && (
                <span className="text-xs text-red-500 mt-1">{error}</span>
              )}
            </div>
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
          <div className="absolute left-0 mt-2 min-w-[180px] bg-white rounded-xl shadow-lg border z-50 py-2">
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
          console.log('HeaderResultsDesktop - tipo recebido:', tipo);
          console.log('HeaderResultsDesktop - bairros recebidos:', bairros);
          setTipoMidia(tipo);
          if (onTipoMidiaChange) onTipoMidiaChange(tipo, bairros);
        }} />
        <ModalMenu open={showMenuModal} onClose={() => setShowMenuModal(false)} />

      </div>
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
