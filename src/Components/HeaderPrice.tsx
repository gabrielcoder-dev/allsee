'use client'

import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';

export default function HeaderPrice() {
  const { produtos, selectedDurationGlobal } = useCart();
  const router = useRouter();

  const quantidade = produtos.reduce((acc, p) => acc + p.quantidade, 0);

  // Calcular valor total considerando a duração (igual CartResume)
  const durationsTrue = (p: any) => [p.duration_2, p.duration_4, p.duration_12, p.duration_24].filter(Boolean).length;
  const getPrecoMultiplicado = (p: any, duration: string) => {
    let preco = p.preco;
    // Lógica de desconto por semanas
    const descontos: { [key: string]: number } = {
      '4': 20,
      '12': 60,
      '24': 120,
    };
    let desconto = 0;
    if (durationsTrue(p) > 1) {
      if (duration === "4") {
        preco = p.preco * 2;
        desconto = descontos['4'];
      }
      if (duration === "12") {
        preco = p.preco * 6;
        desconto = descontos['12'];
      }
      if (duration === "24") {
        preco = p.preco * 12;
        desconto = descontos['24'];
      }
    }
    preco = preco - desconto;
    
    console.log(`getPrecoMultiplicado - produto: ${p.nome}, duration: ${duration}, preco original: ${p.preco}, preco calculado: ${preco}, desconto: ${desconto}`);
    
    return preco;
  };

  // Usar a duração global selecionada
  const duration = selectedDurationGlobal || "2";
  
  console.log('HeaderPrice - selectedDurationGlobal:', selectedDurationGlobal);
  console.log('HeaderPrice - duration:', duration);

  const valor = produtos.reduce((acc, p) => acc + getPrecoMultiplicado(p, duration) * p.quantidade, 0);

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
        <span className="mx-2 text-gray-400">|</span>
        <span className="text-sm text-gray-600">Duração da campanha: <span className="font-bold">{duration} semana(s)</span></span>
      </div>
      <div className="flex justify-end w-full md:w-auto pr-6 md:pr-0">
        <button
          className="bg-orange-600 cursor-pointer hover:bg-orange-700 text-white rounded-lg px-6 py-2 font-medium transition disabled:bg-orange-300 disabled:cursor-not-allowed"
          disabled={quantidade === 0}
          onClick={() => quantidade > 0 && router.push('/resumo')}
        >
          continuar
        </button>
      </div>
    </div>
  );
}