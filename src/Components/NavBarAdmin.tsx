'use client'

import { useState, useEffect } from 'react'
import { FiLogOut, FiMap, FiList } from 'react-icons/fi'
import { ChevronLeft, ChevronRight, CheckCircle, RefreshCw, Repeat } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type NavBarAdminProps = {
  onLogout?: () => void
  mobileOpen: boolean
  setMobileOpen: (value: boolean) => void
  selectedMenu: string
  setSelectedMenu: (value: string) => void
}
type NavBarAdminComponentProps = {
  onLogout?: () => void
  mobileOpen: boolean
  setMobileOpen: (value: boolean) => void
}

export default function NavBarAdmin({ onLogout, mobileOpen, setMobileOpen, selectedMenu, setSelectedMenu }: NavBarAdminProps) {
  const [open, setOpen] = useState(true)
  const [userName, setUserName] = useState<string>('Usuário Admin')

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const isExpanded = isMobile ? mobileOpen : open

  const handleToggle = () => {
    if (isMobile) setMobileOpen(!mobileOpen)
    else setOpen(!open)
  }

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
    <>
      {/* Overlay no mobile */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <nav
        className={`
          flex flex-col justify-between bg-white border-r h-screen
          transition-all duration-300 top-0 left-0 z-50
          ${isMobile
            ? isExpanded
              ? 'fixed w-64'
              : 'w-0'
            : isExpanded
              ? 'relative w-64'
              : 'relative w-20'
          }
        `}
      >
        {/* Botão de expandir/retrair */}
        <button
          className={`absolute top-3 transition-all z-50 bg-white rounded-full shadow md:shadow-none p-1
            ${isExpanded ? 'right-3' : 'left-3 md:left-5'}
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
              <span className="text-2xl font-semibold text-orange-600">Dashboard</span>
            )}
          </div>

          {/* Boas-vindas */}
          {isExpanded && (
            <div className="px-6 pb-4">
              <span className="text-gray-600">Bem-vindo,</span>
              <div className="font-semibold text-2xl text-orange-600 pl-5">{userName}</div>
            </div>
          )}

          {/* Links */}
          <ul className="flex flex-col gap-3 mt-5">
            <li>
              <a href="#" onClick={() => setSelectedMenu('anuncios')} className={`flex items-center gap-3 font-semibold px-6 py-3 text-orange-600 hover:bg-orange-50 rounded transition ${selectedMenu === 'anuncios' ? 'bg-orange-100' : ''}`}>
                <FiList size={22} />
                {isExpanded && <span>Anúncios</span>}
              </a>
            </li>
            <li>
              <a href="#" onClick={() => setSelectedMenu('mapa')} className={`flex items-center gap-3 font-semibold px-6 py-3 text-orange-600 hover:bg-orange-50 rounded transition ${selectedMenu === 'mapa' ? 'bg-orange-100' : ''}`}>
                <FiMap size={22} />
                {isExpanded && <span>Mapa</span>}
              </a>
            </li>
            <li>
              <a href="#" onClick={() => setSelectedMenu('aprovacao')} className={`flex items-center gap-3 font-semibold px-6 py-3 text-orange-600 hover:bg-orange-50 rounded transition ${selectedMenu === 'aprovacao' ? 'bg-orange-100' : ''}`}>
                <CheckCircle size={22} />
                {isExpanded && <span>Aprovação</span>}
              </a>
            </li>
            <li>
              <a href="#" onClick={() => setSelectedMenu('andamento')} className={`flex items-center gap-3 font-semibold px-6 py-3 text-orange-600 hover:bg-orange-50 rounded transition ${selectedMenu === 'andamento' ? 'bg-orange-100' : ''}`}>
                <RefreshCw size={22} />
                {isExpanded && <span>Andamento</span>}
              </a>
            </li>
            <li>
              <a href="#" onClick={() => setSelectedMenu('substituicao')} className={`flex items-center gap-3 font-semibold px-6 py-3 text-orange-600 hover:bg-orange-50 rounded transition ${selectedMenu === 'substituicao' ? 'bg-orange-100' : ''}`}>
                <Repeat size={22} />
                {isExpanded && <span>Substituição</span>}
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
    </>
  )
}
