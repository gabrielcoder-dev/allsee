'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar } from '@/Components/ui/calendar'
import { Button } from '@/Components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { CalendarIcon } from 'lucide-react'

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
}

export default function ModalHeaderMobile({ 
  onClose, 
  onDurationChange, 
  selectedDuration = '2',
  onSearch 
}: ModalHeaderMobileProps) {
  const [location, setLocation] = useState('')
  const [duration, setDuration] = useState(selectedDuration)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [showCalendar, setShowCalendar] = useState(false)

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
    if (onDurationChange) {
      onDurationChange(value)
    }
  }

  const handleSearch = () => {
    if (onSearch) {
      onSearch(location, duration, startDate)
    }
    onClose()
  }

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
          {/* Endereço */}
          <input
            type="text"
            placeholder="Ex.: Bairro Castelândia"
            className="border border-gray-200 rounded-lg px-3 py-2 outline-none text-base"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
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
            <div className="relative w-full flex justify-center">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between border border-gray-200 rounded-lg px-3 py-2 text-base"
                onClick={() => setShowCalendar(true)}
              >
                <span className={startDate ? "text-gray-900" : "text-gray-500"}>
                  {startDate
                    ? startDate.toLocaleDateString('pt-BR')
                    : 'início'}
                </span>
                <CalendarIcon className="w-4 h-4 ml-2 text-gray-500" />
              </Button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            id="calendar-modal"
            className="bg-white rounded-2xl shadow-xl p-4"
            onClick={e => e.stopPropagation()}
          >
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={date => {
                setStartDate(date)
                setShowCalendar(false)
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