"use client"

import { useState, useEffect } from "react"
import { User } from "lucide-react"
import Image from "next/image"
import logoheader from "@/assets/logo.png"
import ModalLogin from "./ModalLogin"
import { useRouter } from "next/navigation"

export default function HeaderPolTerm() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${
          scrolled ? "bg-white shadow" : "bg-white"
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

            {/* Botões */}
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300 border border-orange-600 text-orange-600 hover:bg-orange-50 text-sm md:text-base cursor-pointer"
                onClick={() => setShowModal(true)}
              >
                <User size={18} /> Entrar
              </button>
              <button
                className="px-6 py-2 rounded-full font-medium transition-all duration-300 bg-orange-600 text-white hover:bg-orange-500 cursor-pointer"
                onClick={() => router.push('/results')}
              >
                Anunciar Agora!
              </button>
            </div>
          </div>
        </div>
      </header>
      {showModal && (
        <ModalLogin onClose={() => setShowModal(false)} />
      )}
    </>
  )
}