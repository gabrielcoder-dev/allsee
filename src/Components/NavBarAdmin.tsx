'use client'

import { useState, useEffect } from 'react'
import { FiMenu, FiLogOut, FiMap, FiList } from 'react-icons/fi'
import { FaRegSmile } from 'react-icons/fa'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'


type NavBarAdminProps = {
  onLogout?: () => void
}

export default function NavBarAdmin({ onLogout }: NavBarAdminProps) {
  const [open, setOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userName, setUserName] = useState<string>('Usuario Admin')

  // Detecta se está em mobile (tailwind: < md)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const isExpanded = isMobile ? mobileOpen : open

  // Handler para alternar expansão/retração
  const handleToggle = () => {
    if (isMobile) setMobileOpen(!mobileOpen)
    else setOpen(!open)
  }

  // Buscar nome do usuário do Supabase
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
    <nav
      className={`
        relative flex flex-col justify-between bg-white border-r h-screen
        transition-all duration-300
        top-0 left-0 z-40
        ${isExpanded ? 'w-64' : 'w-20'}
        md:relative md:z-40
      `}
    >
      {/* Botão de expandir/retrair - absoluto no topo */}
      <button
        className={`absolute top-3 transition-all z-50 bg-white rounded-full shadow md:shadow-none p-1
          ${isExpanded ? 'right-3' : 'right-6'}
        `}
        onClick={handleToggle}
        aria-label="Abrir/fechar menu"
        type="button"
      >
        {isExpanded ? <ChevronLeft size={25} /> : <ChevronRight size={25} />}
      </button>

      {/* Topo */}
      <div>
        <div className="flex items-center gap-4 px-4 py-6">
          {isExpanded && (
            <>
              {/* <Image
                src="/logo.png"
                alt="Logo"
                width={70}
                height={50}
                className='hidden md:block'
              /> */}
              <span className="text-2xl font-semibold text-orange-600">Dashboard</span>
            </>
          )}
        </div>
        {/* Boas-vindas */}
        {isExpanded && (
          <div className="px-6 pb-4">
            <span className="text-gray-600">Bem-vindo,</span>
            <div className="font-semibold text-2xl text-orange-600 pl-5">{userName}</div>
          </div>
        )}
        {/* Opções */}
        <ul className="flex flex-col gap-3 mt-5">
          <li>
            <a href="#" className="flex items-center gap-3 font-semibold px-6 py-3 text-orange-600 hover:bg-orange-50 rounded transition">
              <FiList size={22} />
              {isExpanded && <span>Anúncios</span>}
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-3 font-semibold px-6 py-3 text-orange-600 hover:bg-orange-50 rounded transition">
              <FiMap size={22} />
              {isExpanded && <span>Mapa</span>}
            </a>
          </li>
        </ul>
      </div>
      {/* Inferior: Logout */}
      <div className="mb-6">
        <button
          className="flex font-semibold cursor-pointer
           items-center gap-3 px-6 py-2 w-full hover:bg-orange-100 rounded transition text-red-600"
          onClick={onLogout}
        >
          <FiLogOut size={22} />
          {isExpanded && <span>Sair</span>}
        </button>
      </div>
    </nav>
  )
}