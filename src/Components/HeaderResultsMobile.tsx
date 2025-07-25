'use client'

import { MenuIcon, ShoppingCartIcon, Search, MapPinIcon, ChevronDownIcon, Sliders } from 'lucide-react'
import Image from 'next/image'
import logoImg from '@/assets/logo.png'
import { Button } from './ui/button'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import ModalHeaderMobile from './ModalHeaderMobile'
import FilterModal from '@/Components/FilterModal'
import { useCart } from '@/context/CartContext'
import { useRouter } from 'next/navigation'
import ModalMenu from './ModalMenu'

const orderOptions = [
  { label: '$ menor para maior', value: 'price-asc' },
  { label: '$ maior para menor', value: 'price-desc' },
]

type MobileHeaderProps = {
  onDurationChange?: (value: string) => void;
  selectedDuration?: string;
  onSearch?: (location: string, duration: string, startDate: Date | undefined) => void;
  onTipoMidiaChange?: (tipo: string | null, bairros: string[]) => void;
  orderBy?: string;
  onOrderChange?: (order: string) => void;
}

export default function MobileHeader({ 
  onDurationChange, 
  selectedDuration = '2',
  onSearch,
  onTipoMidiaChange,
  orderBy,
  onOrderChange
}: MobileHeaderProps) {
  const [userName, setUserName] = useState<string>('')
  const [location, setLocation] = useState('')

  const [showTopBar, setShowTopBar] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [open, setOpen] = useState(false)
  const [tipoMidia, setTipoMidia] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const { produtos, setSelectedDurationGlobal, selectedDurationGlobal } = useCart()
  const totalNoCarrinho = produtos.reduce((acc, p) => acc + p.quantidade, 0)
  const router = useRouter()
  const [showMenuModal, setShowMenuModal] = useState(false)

  // Top bar show/hide on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowTopBar(window.scrollY <= 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Fetch user name
  useEffect(() => {
    const fetchUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.name || user.email)
      }
    }
    fetchUserName()
  }, [])

  // Fechar popover ao clicar fora
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
      <div className="flex lg:hidden flex-col gap-4 w-full px-4 py-3 bg-white z-50 transition-all duration-500">
        {/* Top Bar: Logo, carrinho, saudação, menu */}
        <div
          className={`
            flex justify-between items-center transition-all duration-300
            ${showTopBar ? 'opacity-100 max-h-32' : 'opacity-0 max-h-0 overflow-hidden'}
          `}
          style={{
            transition: 'opacity 0.3s, max-height 0.3s',
          }}
        >
          <Image
            src={logoImg}
            alt="Logo"
            className='w-20'
          />

          <div className='flex items-center gap-8'>
            {/* Carrinho */}
            <Button
              variant="ghost"
              className="relative"
              onClick={() => router.push('/resumo')}
            >
              <ShoppingCartIcon className="w-6 h-6" />
              {totalNoCarrinho > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full px-1">
                  {String(totalNoCarrinho).padStart(2, '0')}
                </span>
              )}
            </Button>

            {/* Saudação e menu */}
            <div className="flex items-center gap-2">
              <span className="text-gray-700">
                Olá, <span className="font-semibold text-orange-600">{userName}</span>
              </span>
              <Button variant="ghost" size="icon" onClick={() => setShowMenuModal(true)}>
                <MenuIcon className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Header de filtros */}
        <div className="w-full flex flex-col gap-4 md:flex-col justify-center">
          {/* Campo de localização */}
          <div className="w-full flex items-center shadow-sm rounded-xl p-3"
            onClick={() => setShowModal(true)}
          >
            <div className="w-full flex items-center gap-8 bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex-1 flex flex-col">
                <div className="flex items-center gap-1">
                  <MapPinIcon className="w-4 h-5 text-gray-600" />
                  <span className="text-gray-500 mb-1 font-semibold">Endereço ou região</span>
                </div>
                <input
                  type="text"
                  placeholder="Ex.: Bairro Castelândia"
                  className="bg-transparent outline-none w-full text-sm"
                  value={location}
                  onChange={e => {
                    setLocation(e.target.value);
                    if (onTipoMidiaChange) onTipoMidiaChange(null, e.target.value ? [e.target.value] : []);
                  }}
                  onFocus={() => setShowModal(true)}
                />
              </div>
              <Search className="w-5 h-5 text-gray-500 cursor-pointer lg:hidden" />
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
            <Button variant="ghost" className="flex items-center gap-1 text-gray-700"
              onClick={() => setShowFilter(true)}
              type="button"
            >
              <Sliders className="w-5 h-5" />
              <span>filtrar</span>
            </Button>
          </div>
        </div>
      </div>

      {showModal && (
        <ModalHeaderMobile 
          onClose={() => setShowModal(false)} 
          onDurationChange={setSelectedDurationGlobal}
          selectedDuration={selectedDurationGlobal}
          onSearch={onSearch}
        />
      )}

      {/* Modal de filtro */}
      <FilterModal open={showFilter} onClose={() => setShowFilter(false)} onFilter={(tipo, bairros) => {
        setTipoMidia(tipo);
        if (onTipoMidiaChange) onTipoMidiaChange(tipo, bairros);
      }} />

      <ModalMenu open={showMenuModal} onClose={() => setShowMenuModal(false)} />
    </>
  )
}

