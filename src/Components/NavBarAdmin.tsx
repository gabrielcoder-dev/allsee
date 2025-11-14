'use client'

import { useState, useEffect } from 'react'
import { FiLogOut, FiMap, FiList } from 'react-icons/fi'
import { ChevronLeft, ChevronRight, Megaphone, RefreshCw, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/context/NotificationContext'




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
  const { counts } = useNotifications()

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
          className="fixed top-4 left-4 z-50 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl border border-gray-200/50 p-2.5 hover:bg-white hover:scale-105 transition-all duration-200 md:hidden"
          onClick={handleToggle}
          aria-label="Abrir menu"
          type="button"
        >
          <ChevronRight size={18} className="text-gray-700" />
        </button>
      )}

      <nav
        className={`
          flex flex-col justify-between bg-gradient-to-b from-gray-50 to-white border-r border-gray-200/50 h-screen
          transition-all duration-300 ease-in-out z-50 backdrop-blur-sm
          ${isMobile
            ? mobileOpen
              ? 'fixed top-0 left-0 w-64 transform translate-x-0 shadow-2xl'
              : 'fixed top-0 left-0 w-64 transform -translate-x-full'
            : open
              ? 'relative w-64 shadow-xl'
              : 'relative w-20 shadow-lg'
          }
        `}
      >
        {/* Botão de expandir/retrair (apenas desktop) */}
        {!isMobile && (
          <button
            className={`absolute top-3 transition-all z-50 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl border border-gray-200/50 p-1.5 hover:bg-white hover:scale-105
              ${open ? 'right-3' : 'left-3'}
            `}
            onClick={handleToggle}
            aria-label="Abrir/fechar menu"
            type="button"
          >
            {open ? <ChevronLeft size={18} className="text-gray-700" /> : <ChevronRight size={18} className="text-gray-700" />}
          </button>
        )}

        {/* Botão de fechar no mobile */}
        {isMobile && mobileOpen && (
          <button
            className="absolute top-3 right-3 z-50 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl border border-gray-200/50 p-1.5 hover:bg-white hover:scale-105 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            type="button"
          >
            <ChevronLeft size={18} className="text-gray-700" />
          </button>
        )}

        {/* Topo */}
        <div>
          <div className="flex items-center gap-4 px-4 py-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent rounded-r-2xl"></div>
            {isExpanded && (
              <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent relative z-10">
                Dashboard
              </span>
            )}
          </div>

          {/* Boas-vindas */}
          {isExpanded && (
            <div className="px-6 pb-4 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent rounded-r-xl"></div>
              <span className="text-gray-600 text-sm md:text-base relative z-10">Bem-vindo,</span>
              <div className="font-bold text-lg md:text-2xl bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent pl-5 relative z-10">
                {userName}
              </div>
            </div>
          )}

          {/* Links */}
          <ul className="flex flex-col gap-1 md:gap-2 mt-5 px-2">
            <li>
              <a 
                href="#" 
                onClick={() => {
                  setSelectedMenu('totens')
                  if (isMobile) setMobileOpen(false)
                }} 
                className={`flex items-center gap-3 font-semibold px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-all duration-200 relative group ${
                  selectedMenu === 'totens' 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25' 
                    : 'text-orange-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:shadow-md'
                }`}
              >
                <div className={`absolute inset-0 rounded-xl ${selectedMenu === 'totens' ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-transparent group-hover:bg-gradient-to-r group-hover:from-orange-50 group-hover:to-orange-100'} transition-all duration-200`}></div>
                <FiList size={20} className="relative z-10" />
                {isExpanded && <span className="text-sm md:text-base relative z-10">Totens</span>}
              </a>
            </li>
            <li>
              <a 
                href="#" 
                onClick={() => {
                  setSelectedMenu('mapa')
                  if (isMobile) setMobileOpen(false)
                }} 
                className={`flex items-center gap-3 font-semibold px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-all duration-200 relative group ${
                  selectedMenu === 'mapa' 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25' 
                    : 'text-orange-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:shadow-md'
                }`}
              >
                <div className={`absolute inset-0 rounded-xl ${selectedMenu === 'mapa' ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-transparent group-hover:bg-gradient-to-r group-hover:from-orange-50 group-hover:to-orange-100'} transition-all duration-200`}></div>
                <FiMap size={20} className="relative z-10" />
                {isExpanded && <span className="text-sm md:text-base relative z-10">Mapa</span>}
              </a>
            </li>
            <li>
              <a 
                href="#" 
                onClick={() => {
                  setSelectedMenu('aprovacao')
                  if (isMobile) setMobileOpen(false)
                }} 
                className={`flex items-center gap-3 font-semibold px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-all duration-200 relative group ${
                  selectedMenu === 'aprovacao' 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25' 
                    : 'text-orange-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:shadow-md'
                }`}
              >
                <div className={`absolute inset-0 rounded-xl ${selectedMenu === 'aprovacao' ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-transparent group-hover:bg-gradient-to-r group-hover:from-orange-50 group-hover:to-orange-100'} transition-all duration-200`}></div>
                <div className="relative z-10 flex items-center">
                  <Megaphone size={20} />
                </div>
                {isExpanded && (
                  <span className="text-sm md:text-base relative z-10">
                    Campanhas
                    {counts.approvals > 0 && (
                      <span className="absolute -top-1 right-[-24px] bg-red-500 text-white text-xs rounded-full px-1 min-w-[18px] h-[18px] flex items-center justify-center">
                        {counts.approvals > 99 ? '99+' : counts.approvals}
                      </span>
                    )}
                  </span>
                )}
              </a>
            </li>
            <li>
              <a 
                href="#" 
                onClick={() => {
                  setSelectedMenu('andamento')
                  if (isMobile) setMobileOpen(false)
                }} 
                className={`flex items-center gap-3 font-semibold px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-all duration-200 relative group ${
                  selectedMenu === 'andamento' 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25' 
                    : 'text-orange-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:shadow-md'
                }`}
              >
                <div className={`absolute inset-0 rounded-xl ${selectedMenu === 'andamento' ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-transparent group-hover:bg-gradient-to-r group-hover:from-orange-50 group-hover:to-orange-100'} transition-all duration-200`}></div>
                <RefreshCw size={20} className="relative z-10" />
                {isExpanded && <span className="text-sm md:text-base relative z-10">Andamento</span>}
              </a>
            </li>
          </ul>
        </div>

        {/* Inferior: Voltar aos resultados e Logout */}
        <div className="mb-6 space-y-1 px-2">
          <Link
            href="/results"
            className="flex font-semibold cursor-pointer items-center gap-3 px-3 md:px-4 py-2.5 w-full rounded-xl transition-all duration-200 text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:shadow-md group relative"
          >
            <div className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-gradient-to-r group-hover:from-gray-50 group-hover:to-gray-100 transition-all duration-200"></div>
            <ArrowLeft size={18} className="relative z-10" />
            {isExpanded && <span className="text-xs md:text-sm relative z-10">Voltar</span>}
          </Link>
          <button
            className="flex font-semibold cursor-pointer items-center gap-3 px-3 md:px-4 py-2.5 w-full rounded-xl transition-all duration-200 text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:shadow-md group relative"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/');
            }}
          >
            <div className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-gradient-to-r group-hover:from-red-50 group-hover:to-red-100 transition-all duration-200"></div>
            <FiLogOut size={18} className="relative z-10" />
            {isExpanded && <span className="text-xs md:text-sm relative z-10">Sair</span>}
          </button>
        </div>
      </nav>
    </>
  )
}
