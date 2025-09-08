'use client'

import { useState, useEffect } from 'react'
import { FiLogOut, FiMap, FiList } from 'react-icons/fi'
import { ChevronLeft, ChevronRight, CheckCircle, RefreshCw, Repeat, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'




type NavBarAdminProps = {
  onLogout?: () => void
  mobileOpen: boolean
  setMobileOpen: (value: boolean) => void
  selectedMenu: string
  setSelectedMenu: (value: string) => void
}

export default function NavBarAdmin({ onLogout, mobileOpen, setMobileOpen, selectedMenu, setSelectedMenu }: NavBarAdminProps) {
  const [open, setOpen] = useState(true)
  const [userName, setUserName] = useState<string>('Usuário Admin')
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const isExpanded = isMobile ? mobileOpen : open

  const handleToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen)
    } else {
      setOpen(!open)
    }
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
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Botão de toggle para mobile */}
      {isMobile && !mobileOpen && (
        <button
          className="fixed top-4 left-4 z-50 bg-white rounded-full shadow-lg p-2 md:hidden"
          onClick={handleToggle}
          aria-label="Abrir menu"
          type="button"
        >
          <ChevronRight size={20} />
        </button>
      )}

      <nav
        className={`
          flex flex-col justify-between bg-white border-r h-screen
          transition-all duration-300 ease-in-out z-50
          ${isMobile
            ? mobileOpen
              ? 'fixed top-0 left-0 w-64 transform translate-x-0'
              : 'fixed top-0 left-0 w-64 transform -translate-x-full'
            : open
              ? 'relative w-64'
              : 'relative w-20'
          }
        `}
      >
        {/* Botão de expandir/retrair (apenas desktop) */}
        {!isMobile && (
          <button
            className={`absolute top-3 transition-all z-50 bg-white rounded-full shadow p-1
              ${open ? 'right-3' : 'left-3'}
            `}
            onClick={handleToggle}
            aria-label="Abrir/fechar menu"
            type="button"
          >
            {open ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        )}

        {/* Botão de fechar no mobile */}
        {isMobile && mobileOpen && (
          <button
            className="absolute top-3 right-3 z-50 bg-white rounded-full shadow p-1 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            type="button"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Topo */}
        <div>
          <div className="flex items-center gap-4 px-4 py-6">
            {isExpanded && (
              <span className="text-xl md:text-2xl font-semibold text-orange-600">Dashboard</span>
            )}
          </div>

          {/* Boas-vindas */}
          {isExpanded && (
            <div className="px-6 pb-4">
              <span className="text-gray-600 text-sm md:text-base">Bem-vindo,</span>
              <div className="font-semibold text-lg md:text-2xl text-orange-600 pl-5">{userName}</div>
            </div>
          )}

          {/* Links */}
          <ul className="flex flex-col gap-2 md:gap-3 mt-5">
            <li>
              <a 
                href="#" 
                onClick={() => {
                  setSelectedMenu('anuncios')
                  if (isMobile) setMobileOpen(false)
                }} 
                className={`flex items-center gap-3 font-semibold px-4 md:px-6 py-2 md:py-3 text-orange-600 hover:bg-orange-50 rounded transition ${selectedMenu === 'anuncios' ? 'bg-orange-100' : ''}`}
              >
                <FiList size={20} />
                {isExpanded && <span className="text-sm md:text-base">Anúncios</span>}
              </a>
            </li>
            <li>
              <a 
                href="#" 
                onClick={() => {
                  setSelectedMenu('mapa')
                  if (isMobile) setMobileOpen(false)
                }} 
                className={`flex items-center gap-3 font-semibold px-4 md:px-6 py-2 md:py-3 text-orange-600 hover:bg-orange-50 rounded transition ${selectedMenu === 'mapa' ? 'bg-orange-100' : ''}`}
              >
                <FiMap size={20} />
                {isExpanded && <span className="text-sm md:text-base">Mapa</span>}
              </a>
            </li>
            <li>
              <a 
                href="#" 
                onClick={() => {
                  setSelectedMenu('aprovacao')
                  if (isMobile) setMobileOpen(false)
                }} 
                className={`flex items-center gap-3 font-semibold px-4 md:px-6 py-2 md:py-3 text-orange-600 hover:bg-orange-50 rounded transition ${selectedMenu === 'aprovacao' ? 'bg-orange-100' : ''}`}
              >
                <CheckCircle size={20} />
                {isExpanded && <span className="text-sm md:text-base">Aprovação</span>}
              </a>
            </li>
            <li>
              <a 
                href="#" 
                onClick={() => {
                  setSelectedMenu('andamento')
                  if (isMobile) setMobileOpen(false)
                }} 
                className={`flex items-center gap-3 font-semibold px-4 md:px-6 py-2 md:py-3 text-orange-600 hover:bg-orange-50 rounded transition ${selectedMenu === 'andamento' ? 'bg-orange-100' : ''}`}
              >
                <RefreshCw size={20} />
                {isExpanded && <span className="text-sm md:text-base">Andamento</span>}
              </a>
            </li>
            <li>
              <a 
                href="#" 
                onClick={() => {
                  setSelectedMenu('substituicao')
                  if (isMobile) setMobileOpen(false)
                }} 
                className={`flex items-center gap-3 font-semibold px-4 md:px-6 py-2 md:py-3 text-orange-600 hover:bg-orange-50 rounded transition ${selectedMenu === 'substituicao' ? 'bg-orange-100' : ''}`}
              >
                <Repeat size={20} />
                {isExpanded && <span className="text-sm md:text-base">Substituição</span>}
              </a>
            </li>
          </ul>
        </div>

        {/* Inferior: Voltar aos resultados e Logout */}
        <div className="mb-6 space-y-2">
          <Link
            href="/results"
            className="flex font-semibold cursor-pointer
            items-center gap-3 px-4 md:px-6 py-2 w-full rounded transition text-gray-600"
          >
            <ArrowLeft size={20} />
            {isExpanded && <span className="text-xs md:text-base">Voltar</span>}
          </Link>
          <button
          // {{change 3}}
            className="flex font-semibold cursor-pointer
            items-center gap-3 px-4 md:px-6 py-2 w-full hover:bg-orange-100 rounded transition text-red-600"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/');
            }}
          >
            <FiLogOut size={20} />
            {isExpanded && <span className="text-sm md:text-base">Sair</span>}
          </button>
        </div>
      </nav>
    </>
  )
}
