'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar } from '@/Components/ui/calendar'
import { Button } from '@/Components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { CalendarIcon } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover'
import { useAddressSearch } from '@/hooks/useAddressSearch'
import AddressAutocomplete from '@/Components/AddressAutocomplete'

const durations = [
  { label: '2 semanas', value: '2' },
  { label: '4 semanas', value: '4' },
  { label: '12 semanas', value: '12' },
  { label: '24 semanas', value: '24' },
]

type ModalHeaderMobileProps = {
  onClose: () => void;
  onDurationChange?: (value: string) => void;
  selectedDuration?: string;
  onSearch?: (location: string, duration: string, startDate: Date | undefined) => void;
  onTipoMidiaChange?: (tipo: string | null, bairros: string[]) => void;
  onCityFound?: (coords: { lat: number; lng: number; totemId?: number }) => void;
  onSpecificTotemFound?: (totemId: number) => void;
}

export default function ModalHeaderMobile({ 
  onClose, 
  onDurationChange, 
  selectedDuration = '2',
  onSearch,
  onTipoMidiaChange,
  onCityFound,
  onSpecificTotemFound
}: ModalHeaderMobileProps) {
  const [duration, setDuration] = useState(selectedDuration)
  const [showCalendar, setShowCalendar] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)

  // Hook de busca de endereços com autocomplete
  const {
    query,
    setQuery,
    suggestions,
    isLoading,
    isOpen,
    error,
    selectAddress,
    closeDropdown
  } = useAddressSearch({ debounceMs: 300, minLength: 2 })

  const { formData, updateFormData, setSelectedDurationGlobal } = useCart();
  // const startDate = formData.startDate ? new Date(formData.startDate) : undefined; // This line is removed as startDate is now a state variable

  // Atualiza a duração quando selectedDuration muda
  useEffect(() => {
    setDuration(selectedDuration)
  }, [selectedDuration])

  // Fecha o calendário ao clicar fora dele
  useEffect(() => {
    if (!showCalendar) return
    function handle(e: MouseEvent) {
      const calendar = document.getElementById('calendar-modal')
      if (calendar && !calendar.contains(e.target as Node)) {
        setShowCalendar(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showCalendar])

  const handleDurationChange = (value: string) => {
    setDuration(value)
    // NÃO chamar onDurationChange aqui - apenas atualizar estado local
    // O recarregamento acontecerá apenas quando clicar em "buscar"
  }

  const handleSearch = () => {
    if (startDate) {
      updateFormData({ startDate: startDate.toISOString().slice(0, 10) });
    }
    
    // Usar o query do autocomplete como location
    const locationToSearch = query.trim();
    
    console.log('🔍 Busca mobile iniciada:', { locationToSearch, duration, startDate });
    
    // Fechar o modal primeiro
    onClose();
    
    // Chamar as funções de callback igual ao desktop
    if (onTipoMidiaChange) {
      console.log('🔄 Chamando onTipoMidiaChange com endereço:', locationToSearch);
      onTipoMidiaChange(null, locationToSearch ? [locationToSearch] : []);
    }
    
    if (onDurationChange) {
      console.log('⏱️ Chamando onDurationChange com duração:', duration);
      onDurationChange(duration);
    }
    
    if (onSearch) {
      console.log('🔍 Chamando onSearch');
      onSearch(locationToSearch, duration, startDate);
    }
  }

  // Função para lidar com seleção de endereço no autocomplete (apenas preencher input)
  const handleAddressSelect = (address: any) => {
    const selectedAddress = selectAddress(address);
    console.log('📝 Endereço selecionado no mobile (apenas preenchido):', selectedAddress.address);
    // NÃO chamar as funções de callback aqui - apenas preencher o input
    // A busca acontecerá apenas quando clicar em "buscar"
  }

  // Função para criar string UTC yyyy-MM-ddT00:00:00Z
  function toUTCDateString(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T00:00:00Z`;
  }
  // Função para criar string yyyy-MM-dd
  function toYMD(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
  // Função para parsear string yyyy-MM-dd para Date
  function parseLocalDateString(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const today = new Date();
  const twoDaysFromNow = new Date(today);
  twoDaysFromNow.setDate(today.getDate() + 2);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-2 mt-8"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-2 leading-tight">
          Anuncie onde os seus clientes moram, trabalham e passam.
        </h2>
        <p className="text-gray-600 mb-4 text-sm">
          Milhares já anunciaram. Sua vez de atrair clientes, comece agora.
        </p>
        <div className="flex flex-col gap-3">
          {/* Endereço com Autocomplete */}
          <div className="relative">
            <AddressAutocomplete
              query={query}
              setQuery={setQuery}
              suggestions={suggestions}
              isLoading={isLoading}
              isOpen={isOpen}
              error={error}
              onSelectAddress={handleAddressSelect}
              onCloseDropdown={closeDropdown}
              placeholder="Ex.: Bairro Castelândia"
              className="w-full"
            />
          </div>
          {/* Duração e Início */}
          <div className="flex gap-2">
            {/* Duração */}
            <Select value={duration} onValueChange={handleDurationChange}>
              <SelectTrigger className="w-1/2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-base">
                <SelectValue placeholder="duração" />
              </SelectTrigger>
              <SelectContent>
                {durations.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Início */}
            <div className="flex-col w-full">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 shadow-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 text-base font-normal text-gray-700"
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <CalendarIcon className="w-5 h-5 text-orange-500" />
                    <span className={startDate ? "text-gray-900" : "text-gray-500"}>
                      {startDate ? startDate.toLocaleDateString('pt-BR') : 'início'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border border-gray-200 rounded-lg shadow-lg mt-2">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                     disabled={date => date < twoDaysFromNow}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {/* Botão buscar */}
          <Button
            className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-2 text-base"
            onClick={handleSearch}
          >
            buscar
          </Button>
        </div>
      </div>

      {/* Calendar modal centralizado */}
      {showCalendar && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div
            id="calendar-modal"
            className="bg-white rounded-2xl shadow-xl p-4"
            onClick={e => e.stopPropagation()}
          >
            <Calendar
              mode="single"
              selected={typeof startDate === 'string' ? parseLocalDateString(startDate) : undefined}
              onSelect={date => {
                if (date) updateFormData({ startDate: toYMD(date) });
                setShowCalendar(false);
              }}
              className="rounded-lg"
              captionLayout="dropdown"
              fromYear={2024}
              toYear={2030}
            />
          </div>
        </div>
      )}
    </div>
  )
}