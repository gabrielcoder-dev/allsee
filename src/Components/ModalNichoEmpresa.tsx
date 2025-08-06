'use client'

import { useState, useEffect } from "react"
import { createClient } from '@supabase/supabase-js'
import { toast } from "sonner"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type NichoOption = 'restaurante' | 'academia' | 'mercado' | 'padaria' | 'banco' | 'outro' | string

export default function ModalNichoEmpresa({
  open,
  onClose,
  onNichoSelected
}: {
  open: boolean;
  onClose: () => void;
  onNichoSelected: () => void;
}) {
  const [selectedNicho, setSelectedNicho] = useState<NichoOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customNichos, setCustomNichos] = useState<string[]>([]);

  const nichoOptions = [
    { value: 'restaurante' as NichoOption, label: 'Restaurante' },
    { value: 'academia' as NichoOption, label: 'Academia' },
    { value: 'mercado' as NichoOption, label: 'Mercado' },
    { value: 'padaria' as NichoOption, label: 'Padaria' },
    { value: 'banco' as NichoOption, label: 'Banco' },
    { value: 'outro' as NichoOption, label: 'Outro' }
  ];

  // Função para obter nichos organizados (outro sempre por último)
  const getOrganizedNichos = () => {
    const standardNichos = nichoOptions.filter(option => option.value !== 'outro');
    const outroNicho = nichoOptions.find(option => option.value === 'outro');
    const customNichosWithoutOutro = customNichos.filter(nicho => nicho !== 'outro');
    
    return [
      ...standardNichos,
      ...customNichosWithoutOutro.map(nicho => ({ value: nicho as NichoOption, label: nicho, isCustom: true })),
      ...(outroNicho ? [{ ...outroNicho, isCustom: false }] : [])
    ] as Array<{ value: NichoOption; label: string; isCustom: boolean }>;
  };

  // Carregar nichos customizados
  useEffect(() => {
    async function loadCustomNichos() {
      try {
        console.log('🔄 Carregando nichos customizados...')
        const { data, error } = await supabase
          .from('nichos_customizados')
          .select('nome')
          .order('nome');
        
        if (error) {
          console.error('❌ Erro ao carregar nichos customizados:', error);
          return;
        }
        
        if (data) {
          console.log('✅ Nichos customizados carregados:', data.map(item => item.nome))
          setCustomNichos(data.map(item => item.nome));
        } else {
          console.log('📭 Nenhum nicho customizado encontrado')
          setCustomNichos([]);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar nichos customizados:', error);
      }
    }
    
    // Recarregar sempre que o modal abrir
    if (open) {
      loadCustomNichos();
    }
  }, [open]); // Dependência no 'open' para recarregar quando modal abrir

  const handleNichoSelect = (nicho: NichoOption) => {
    setSelectedNicho(nicho)
  }

  const handleContinue = async () => {
    if (!selectedNicho) {
      toast.error("Por favor, escolha um nicho")
      return
    }

    setIsSubmitting(true)
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
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-md relative flex flex-col p-8 shadow-lg w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-4">
        <h2 className="text-xl font-semibold mb-6 text-center">
          Escolha o segmento da sua empresa!
        </h2>
        
        <div className="space-y-3 mb-6 overflow-y-auto max-h-60">
          {getOrganizedNichos().map((option) => (
            <button
              key={option.value}
              onClick={() => handleNichoSelect(option.value)}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                selectedNicho === option.value
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
          disabled={!selectedNicho || isSubmitting}
          className="w-full bg-orange-600 text-white font-semibold py-3 rounded-lg hover:bg-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Salvando..." : "Continuar"}
        </button>
      </div>
    </div>
  )
} 