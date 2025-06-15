"use client"

import { useState, useEffect } from "react"
import { Menu, X, User } from "lucide-react"
import Image from "next/image"
import logoheader from "@/assets/logo.png"

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const toggleMobileMenu = () => setIsMobileMenuOpen((open) => !open)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isMobileMenuOpen
          ? "bg-white"
          : scrolled
          ? "bg-white shadow"
          : "bg-transparent"
      }`}
    >
      <div className={`container mx-auto px-4 sm:px-6 lg:px-24 transition-all duration-300
        ${scrolled ? "py-4" : "py-6"}
        md:px-24
      `}>
        <div className={`flex items-center justify-between transition-all duration-300
          ${scrolled ? "h-12 lg:h-16" : "h-16 lg:h-20"}
        `}>
          {/* Logo */}
          <Image
            src={logoheader}
            alt="Logo"
            className="w-24 md:w-32"
            priority
          />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <HeaderLink href="#home" onClick={closeMobileMenu}>Home</HeaderLink>
            <HeaderLink href="#sobre" onClick={closeMobileMenu}>Sobre Nós</HeaderLink>
            <HeaderLink href="#locais" onClick={closeMobileMenu}>Locais</HeaderLink>
            <HeaderLink href="#contato" onClick={closeMobileMenu}>Contato</HeaderLink>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300 border border-orange-600 text-orange-600 hover:bg-orange-50 text-sm md:text-base cursor-pointer">
              <User size={18} /> Entrar
            </button>
            <button className="hidden md:block px-6 py-2 rounded-full font-medium transition-all duration-300 bg-orange-600 text-white hover:bg-orange-500 cursor-pointer">
              Anunciar Agora!
            </button>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 rounded-md transition-colors duration-300 text-gray-700 hover:bg-rose-200 cursor-pointer"
            aria-label="Abrir menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute left-0 right-0 w-full transition-all duration-300 overflow-hidden ${
          isMobileMenuOpen
            ? "max-h-96 opacity-100 z-40"
            : "max-h-0 opacity-0 z-[-1]"
        }`}
      >
        <div className="flex flex-col px-4 py-4 space-y-4 bg-white shadow-lg">
          <HeaderLink href="#home" onClick={closeMobileMenu}>Home</HeaderLink>
          <HeaderLink href="#sobre" onClick={closeMobileMenu}>Sobre Nós</HeaderLink>
          <HeaderLink href="#locais" onClick={closeMobileMenu}>Locais</HeaderLink>
          <HeaderLink href="#contato" onClick={closeMobileMenu}>Contato</HeaderLink>
          <button className="w-full px-6 py-2 rounded-full font-medium transition-all duration-300 bg-orange-600 text-white hover:bg-orange-500 cursor-pointer">
            Anunciar Agora!
          </button>
        </div>
      </div>
    </header>
  )
}

// Componente para links do header
function HeaderLink({ href, children, onClick }: { href: string, children: React.ReactNode, onClick?: () => void }) {
  return (
    <a
      href={href}
      className="font-medium transition-colors duration-300 hover:text-black text-gray-500"
      onClick={onClick}
    >
      {children}
    </a>
  )
}