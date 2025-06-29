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

const durations = [
  { label: '2 semanas', value: '2' },
  { label: '4 semanas', value: '4' },
  { label: '24 semanas', value: '24' },
]

const orderOptions = [
  { label: '$ menor para maior', value: 'price-asc' },
  { label: '$ maior para menor', value: 'price-desc' },
  { label: 'distância', value: 'distance' },
  { label: 'alfabética', value: 'alphabetical' },
]

// Certifique-se de que este tipo corresponde ao tipo Produto usado em ModalCartTotten
type Produto = {
  id: string
  name: string
  image: string
  address: string
  price: number
  quantity: number
  duration: string
  screens: number
  // Adicione outros campos conforme necessário para corresponder ao ModalCartTotten
}

export const HeaderResume = () => {
  const [userName, setUserName] = useState<string>('')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [showFilter, setShowFilter] = useState(false)
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { produtos } = useCart()
  const totalNoCarrinho = produtos.reduce((acc, p) => acc + p.quantidade, 0)
  const [showMenuModal, setShowMenuModal] = useState(false)

  useEffect(() => {
    const fetchUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.name || user.email)
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }
    }
    fetchUserName()
  }, [])

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
    <div className="border-b w-full px-4 lg:px-12 py-2 flex top-0 left-0 right-0 z-50 justify-between items-center gap-4 ">

      <Image
        src={logoImg}
        alt="Logo"
        className='w-20'
      />

      {/* Pesquisa de localização */}
      <div className=' flex flex-col gap-4  md:flex-col lg:flex-row lg:items-center justify-center'>




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

        {/* Saudação e menu - só aparece se autenticado */}
        {isAuthenticated && (
          <div className="flex items-center gap-2 ">
            <span className="text-gray-700">
              Olá, <span className="font-semibold text-orange-600">{userName}</span>
            </span>
            <Button variant="ghost" size="icon" onClick={() => setShowMenuModal(true)}>
              <MenuIcon className="w-6 h-6" />
            </Button>
          </div>
        )}
      </div>

      {/* Modal de filtro */}
      <FilterModal open={showFilter} onClose={() => setShowFilter(false)} />
      <ModalMenu open={showMenuModal} onClose={() => setShowMenuModal(false)} />
    </div>
    </div>
  )
}