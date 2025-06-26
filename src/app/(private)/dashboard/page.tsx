'use client'

import React, { useState } from 'react'
import ModalCreateAnuncios from '@/Components/ModalCreateAnuncios'
import NavBarAdmin from '@/Components/NavBarAdmin'
import AnunciosAdminView from '@/Components/AnunciosAdminView'

const Page = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className='h-screen flex md:gap-8'>
      <NavBarAdmin mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <AnunciosAdminView />
    </div>
  )
}

export default Page
