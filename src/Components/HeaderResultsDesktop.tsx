'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/Components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Calendar } from '@/Components/ui/calendar'
import { CalendarIcon, ChevronDownIcon, MapPinIcon, ShoppingCartIcon, MenuIcon, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase' // ajuste o caminho se necessário
import logoImg from "@/assets/logo.png"
import Image from 'next/image'

const durations = [
  { label: '2 semanas', value: '2' },
  { label: '4 semanas', value: '4' },
  { label: '12 semanas', value: '12' },
  { label: '24 semanas', value: '24' },
]

const ResultsHeader = () => {
  const [userName, setUserName] = useState<string>('')
  const [location, setLocation] = useState('')
  const [duration, setDuration] = useState('2')
  const [startDate, setStartDate] = useState<Date | undefined>(new Date())
  const [order, setOrder] = useState('price')

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
    <div className="hidden w-full px-4 py-3 lg:flex justify-between items-center gap-4 ">

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
          <Select value={order} onValueChange={setOrder}>
            <SelectTrigger className="w-28 bg-gray-50 rounded-lg px-3 py-2">
              <SelectValue placeholder="ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price">Ordenar</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtrar */}
          <Button variant="ghost" className="flex items-center gap-1 text-gray-700">
            <span>filtrar</span>
            <ChevronDownIcon className="w-4 h-4" />
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
