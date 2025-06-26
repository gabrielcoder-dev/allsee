import React, { useState } from 'react'
import GetAnunciosResults from './GetAnunciosResults'
import ModalCreateAnuncios from './ModalCreateAnuncios'

const AnunciosAdminView = () => {

  const [showModal, setShowModal] = useState(false)

  return (
    <div className='relative w-full flex flex-col gap-12 p-6'>
      <h2 className='text-3xl pl-6 md:pl-0 text-orange-600 font-bold'>Tottens</h2>
      <GetAnunciosResults />
      <button onClick={() => setShowModal(true)}
        className='absolute bottom-6 right-14 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-orange-700 transition-all duration-300 flex items-center gap-2'
        >
        Adicionar Totten
      </button>
      <ModalCreateAnuncios open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}

export default AnunciosAdminView
