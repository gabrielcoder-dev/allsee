'use client'

type HeaderPriceProps = {
  quantidade: number
  valor: number
  onContinuar?: () => void
}

export default function HeaderPrice({ quantidade, valor, onContinuar }: HeaderPriceProps) {
  return (
    <div
      id="header-price"
      className="fixed flex items-center justify-between bottom-0 z-1 w-full border-t border-solid border-neutral-high-light bg-white lg:sticky py-6 actions-bar-results !text-lg lg:bottom-0 lg:right-0 lg:px-[80px]"
    >
      <div className="hidden md:block text-base md:text-lg">
        <span className="font-bold">{quantidade} produto{quantidade > 1 ? 's' : ''}</span>
        <span> em seu carrinho</span>
        <span className="mx-2 text-gray-400">|</span>
        <span>Investimento: <span className="font-bold">R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
      </div>
      <button
        className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-6 py-2 font-medium transition"
        onClick={onContinuar}
      >
        continuar
      </button>
    </div>
  )
}