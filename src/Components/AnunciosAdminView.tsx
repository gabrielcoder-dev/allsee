import React, { useState, useRef } from 'react'
import ModalCreateAnuncios from './ModalCreateAnuncios'
import GetAnunciosAdmin from './GetAnunciosAdmin'

const AnunciosAdminView = () => {

  const [showModal, setShowModal] = useState(false)
  const fetchAnunciosRef = useRef<(() => Promise<void>) | null>(null)

  const handleAnuncioSaved = () => {
    // Chama a função de atualização se ela existir
    if (fetchAnunciosRef.current) {
      fetchAnunciosRef.current()
    }
  }

  return (
    <div className='relative w-full flex flex-col gap-6 md:gap-12 p-3 md:p-6 min-h-screen bg-gradient-to-br from-gray-50/50 to-white'>
      <div className="relative pl-2 md:pl-6">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent rounded-2xl"></div>
        <h2 className='text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent relative z-10'>
          Totens
        </h2>
      </div>
      <div className='flex-1'>
        <GetAnunciosAdmin onFetchAnunciosRef={(ref) => { fetchAnunciosRef.current = ref }} />
      </div>
      <button 
        onClick={() => setShowModal(true)}
        className='fixed bottom-4 md:bottom-6 right-4 md:right-14 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white px-3 md:px-4 py-2 md:py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 text-sm md:text-base z-40 hover:scale-105 backdrop-blur-sm border border-orange-500/20'
      >
        <span className="hidden sm:inline">Adicionar</span> Toten
      </button>
      <ModalCreateAnuncios 
        open={showModal} 
        onClose={() => setShowModal(false)} 
        onSaved={handleAnuncioSaved}
      />
    </div>
  )
}

export default AnunciosAdminView
