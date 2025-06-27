'use client'

import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';

export default function HeaderPrice() {
  const { produtos } = useCart();
  const router = useRouter();

  const quantidade = produtos.reduce((acc, p) => acc + p.quantidade, 0);
  const valor = produtos.reduce((acc, p) => acc + p.preco * p.quantidade, 0);

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