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

const durations = [
  { label: '2 semanas', value: '2' },
  { label: '4 semanas', value: '4' },
  { label: '12 semanas', value: '12' },
  { label: '24 semanas', value: '24' },
]

const orderOptions = [
  { label: '$ menor para maior', value: 'price-asc' },
  { label: '$ maior para menor', value: 'price-desc' },
  { label: 'distância', value: 'distance' },
  { label: 'alfabética', value: 'alphabetical' },
]

const ResultsHeader = () => {
  const [userName, setUserName] = useState<string>('')
  const [location, setLocation] = useState('')
  const [duration, setDuration] = useState('2')
  const [startDate, setStartDate] = useState<Date | undefined>(new Date())
  const [order, setOrder] = useState('price')
  const [showFilter, setShowFilter] = useState(false)
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.name || user.email)
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
    <div className="hidden w-full px-16 py-3 lg:flex lg:fixed top-0 left-0 right-0 z-50 justify-between items-center gap-4 ">

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
            </div>

            <input
              type="text"
              placeholder="Ex.: Bairro Castelândia"
              className="bg-transparent outline-none flex-1 w-72 text-sm"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />

          </div>
          <Search className="w-5 h-5 text-gray-500 cursor-pointer lg:hidden" />
          </div>

          {/* Duração */}

          <div className='flex-col hidden md:flex'>
            <span className="text-gray-500 mb-1 font-semibold">Duração</span>
            <Select value={duration} onValueChange={setDuration}>
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
                  {startDate ? startDate.toLocaleDateString('pt-BR') : 'início'}
                </span>
                <ChevronDownIcon className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
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
                order === opt.value ? 'font-semibold text-orange-600' : 'text-gray-900'
              }`}
              onClick={() => {
                setOrder(opt.value)
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
        <Button variant="ghost" className="relative">
          <ShoppingCartIcon className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full px-1">01</span>
        </Button>

        {/* Saudação e menu */}
        <div className="flex items-center gap-2 ">
          <span className="text-gray-700">
            Olá, <span className="font-semibold text-orange-600">{userName}</span>!
          </span>
          <Button variant="ghost" size="icon">
            <MenuIcon className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Modal de filtro */}
      <FilterModal open={showFilter} onClose={() => setShowFilter(false)} />
    </div>
  )
}

const Page = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <ResultsHeader />
      {/* Conteúdo dos resultados vai aqui */}
    </div>
  )
}

export default Page
