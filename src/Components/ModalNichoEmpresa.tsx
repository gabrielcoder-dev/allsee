'use client'

import { useState } from "react"
import { createClient } from '@supabase/supabase-js'
import { toast } from "sonner"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type NichoOption = 'restaurante' | 'academia' | 'comercio' | 'outro'

interface ModalNichoEmpresaProps {
  isOpen: boolean
  onNichoSelected: () => void
}

export default function ModalNichoEmpresa({ isOpen, onNichoSelected }: ModalNichoEmpresaProps) {
  const [selectedNicho, setSelectedNicho] = useState<NichoOption | null>(null)
  const [loading, setLoading] = useState(false)

  const nichoOptions = [
    { id: 'restaurante', label: 'Restaurante' },
    { id: 'academia', label: 'Academia' },
    { id: 'comercio', label: 'Comércio' },
    { id: 'outro', label: 'Outro' }
  ] as const

  const handleNichoSelect = (nicho: NichoOption) => {
    setSelectedNicho(nicho)
  }

  const handleContinue = async () => {
    if (!selectedNicho) {
      toast.error("Por favor, escolha um nicho")
      return
    }

    setLoading(true)
    try {
      // Pegar o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        toast.error("Erro ao identificar usuário")
        return
      }

      // Verificar se já existe um profile para este usuário
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (existingProfile) {
        // Atualizar o nicho existente
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ nicho: selectedNicho })
          .eq('id', user.id)

        if (updateError) {
          console.error('Erro ao atualizar nicho:', updateError)
          toast.error("Erro ao salvar nicho")
          return
        }
      } else {
        // Criar novo profile com nicho
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            nicho: selectedNicho
          }])

        if (insertError) {
          console.error('Erro ao criar profile:', insertError)
          toast.error("Erro ao salvar nicho")
          return
        }
      }

      toast.success("Nicho salvo com sucesso!")
      onNichoSelected()
    } catch (error) {
      console.error('Erro:', error)
      toast.error("Erro ao salvar nicho")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-md relative flex flex-col p-8 shadow-lg w-96 max-w-full mx-4">
        <h2 className="text-xl font-semibold mb-6 text-center">
          Escolha o nicho da sua empresa
        </h2>
        
        <div className="space-y-3 mb-6">
          {nichoOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleNichoSelect(option.id)}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                selectedNicho === option.id
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleContinue}
          disabled={!selectedNicho || loading}
          className="w-full bg-orange-600 text-white font-semibold py-3 rounded-lg hover:bg-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Salvando..." : "Continuar"}
        </button>
      </div>
    </div>
  )
} 