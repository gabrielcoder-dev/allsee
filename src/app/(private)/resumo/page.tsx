'use client'

import React from 'react'
import HeaderResultsDesktop from '@/Components/HeaderResultsDesktop'
import HeaderResultsMobile from '@/Components/HeaderResultsMobile'
import CartResume from '@/Components/CartResume'
import { ArrowLeft } from 'lucide-react'
import { HeaderResume } from '@/Components/HeaderResume'
import { useRouter } from 'next/navigation'

const page = () => {
  const router = useRouter();
  return (
    <div className='h-screen flex flex-col'>
      <HeaderResume />
      <CartResume />
      <div className="flex items-center justify-between p-5 border-t border-gray-200">
        <p
          className='flex items-center gap-2 text-orange-500 cursor-pointer font-semibold'
          onClick={() => router.push('/results')}
        >
          <ArrowLeft /> Continuar Comprando
        </p>
        <button className='bg-orange-500 text-white px-4 py-2 rounded-md cursor-pointer'>Avançar</button>
      </div>
    </div>
  )
}

export default page
