'use client'

import React, { useState } from 'react'
import HeaderResultsDesktop from '@/Components/HeaderResultsDesktop'
import MobileHeader from '@/Components/HeaderResultsMobile'
import HeaderPrice from '@/Components/HeaderPrice'
import dynamic from 'next/dynamic'
import GetAnunciosResults from '@/Components/GetAnunciosResults'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const Mapbox = dynamic(() => import('@/Components/MapboxClient'), { ssr: false })

const page = () => {
  const [produtos, setProdutos] = useState<any[]>([])

  // Função para adicionar produto ao carrinho
  function handleAdicionarProduto(produto: any) {
    setProdutos(prev => [...prev, produto])
    toast.success('Produto adicionado ao carrinho!')
  }

  return (
    <div className="flex flex-col h-screen">
      <HeaderResultsDesktop />
      <MobileHeader />
      {/* Área principal com scroll controlado */}
      <div className="flex flex-1 min-h-0 overflow-hidden xl:pl-16 justify-center xl:justify-between">
        <GetAnunciosResults onAdicionarProduto={handleAdicionarProduto} />
        <Mapbox />
      </div>

      <HeaderPrice />

      <ToastContainer />
    </div>
  )
}

export default page
