'use client'

import React, { useState } from 'react'
import ModalCreateAnuncios from '@/Components/ModalCreateAnuncios'
import NavBarAdmin from '@/Components/NavBarAdmin'
import AnunciosAdminView from '@/Components/AnunciosAdminView'
import MapAdmin from '@/Components/MapAdmin'
import AproveitionAdmin from '@/Components/AproveitionAdmin'
import ProgressAdmin from '@/Components/ProgressAdmin'
import ReplacementAdmin from '@/Components/ReplacementAdmin'

const Page = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('anuncios');

  let ContentComponent;
  switch (selectedMenu) {
    case 'mapa':
      ContentComponent = <MapAdmin />;
      break;
    case 'aprovacao':
      ContentComponent = <AproveitionAdmin />;
      break;
    case 'andamento':
      ContentComponent = <ProgressAdmin />;
      break;
    case 'substituicao':
      ContentComponent = <ReplacementAdmin />;
      break;
    default:
      ContentComponent = <AnunciosAdminView />;
  }

  return (
    <div className='h-screen flex'>
      <NavBarAdmin 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
        selectedMenu={selectedMenu}
        setSelectedMenu={setSelectedMenu}
      />
      {ContentComponent}
    </div>
  )
}

export default Page
