'use client';

import React, { useState, useEffect } from 'react';
import ModalCreateAnuncios from '@/Components/ModalCreateAnuncios';
import NavBarAdmin from '@/Components/NavBarAdmin';
import AnunciosAdminView from '@/Components/AnunciosAdminView';
import dynamic from 'next/dynamic';
import ProgressAdmin from '@/Components/ProgressAdmin';
import ReplacementAdmin from '@/Components/ReplacementAdmin';
import AproveitionAdmin from '@/Components/AproveitionAdmin';

const MapAdmin = dynamic(() => import('@/Components/MapAdmin'), { ssr: false });

const DashboardPage = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('anuncios');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
    <div className='h-screen flex overflow-hidden'>
      <NavBarAdmin 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
        selectedMenu={selectedMenu}
        setSelectedMenu={setSelectedMenu}
      />
      <main className={`flex-1 overflow-y-auto transition-all duration-300 ${
        isMobile ? 'w-full' : 'ml-0'
      }`}>
        {ContentComponent}
      </main>
    </div>
  )
}

export default DashboardPage; 