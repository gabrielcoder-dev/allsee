'use client'

import { MenuIcon, ShoppingCartIcon, Search, MapPinIcon, CalendarIcon, ChevronDownIcon, Sliders } from 'lucide-react'
import Image from 'next/image'
import logoImg from '@/assets/logo.png'
import { Button } from './ui/button'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import ModalHeaderMobile from './ModalHeaderMobile'
import FilterModal from '@/Components/FilterModal'


export default function MobileHeader() {
  const [userName, setUserName] = useState<string>('')
  const [location, setLocation] = useState('')
  const [order, setOrder] = useState('price')
  const [showTopBar, setShowTopBar] = useState(true)
  const [isFixed, setIsFixed] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showFilter, setShowFilter] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsFixed(true)
        setShowTopBar(false)
      } else {
        setIsFixed(false)
        setShowTopBar(true)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const fetchUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.name || user.email)
      }
    }
    fetchUserName()
  }, [])

  return (
    <>
      <div
        className={`
          lg:hidden flex flex-col gap-4 w-full px-4 py-3 bg-white z-50
          transition-all duration-500
          ${isFixed ? 'fixed top-0 left-0 shadow-lg' : ''}
        `}
      >
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
            <Button variant="ghost" className="relative">
              <ShoppingCartIcon className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full px-1">01</span>
            </Button>

            {/* Saudação e menu */}
            <div className="flex items-center gap-2 ">
              <span className="text-gray-700">
                Olá, <span className="font-semibold text-orange-600">{userName}</span>
              </span>
              <Button variant="ghost" size="icon">
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
                  disabled
                  onChange={e => setLocation(e.target.value)}
                  onFocus={() => setShowModal(true)}
                />
              </div>
              <Search className="w-5 h-5 text-gray-500 cursor-pointer lg:hidden" />
            </div>
          </div>

          <div className='w-full flex items-center justify-between gap-6'>
            {/* Ordenar */}
            <Select value={order} onValueChange={setOrder}>
              <SelectTrigger className="w-28 bg-gray-50 rounded-lg px-3 py-2">
                <SelectValue placeholder="ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Ordenar</SelectItem>
              </SelectContent>
            </Select>
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
        <ModalHeaderMobile onClose={() => setShowModal(false)} />
      )}

      {/* Modal de filtro */}
      <FilterModal open={showFilter} onClose={() => setShowFilter(false)} />
    </>
  )
}
