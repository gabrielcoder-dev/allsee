import React from 'react';
import { ShoppingCartIcon, TrashIcon } from 'lucide-react';
import { useCart } from '@/context/CartContext';

type AnuncioType = {
  id: number;
  name?: string;
  nome?: string;
  image?: string;
  address?: string;
  adress?: string;
  endereco?: string;
  price?: number;
  preco?: number;
  duration_2?: boolean;
  duration_4?: boolean;
  duration_12?: boolean;
  duration_24?: boolean;
  type_screen?: string;
  display?: number;
  views?: number;
  screens?: number;
  alcance?: number;
};

export default function MiniAnuncioCard({ anuncio, actionButton, hideAddButton }: { 
  anuncio: AnuncioType, 
  actionButton?: React.ReactNode, 
  hideAddButton?: boolean 
}) {
  const { adicionarProduto, removerProduto, produtos, selectedDurationGlobal } = useCart();
  
  // Checa se já está no carrinho
  const estaNoCarrinho = produtos.some((p) => p.id === (anuncio.id?.toString() || anuncio.id));
  // Duração selecionada global
  const selectedDuration = selectedDurationGlobal || '2';

  // Lógica de desconto por semanas (igual GetAnunciosResults)
  const descontos: { [key: string]: number } = {
    '4': 20,
    '12': 60,
    '24': 120,
  };
  const durationsTrue = [
    anuncio.duration_2,
    anuncio.duration_4,
    anuncio.duration_12,
    anuncio.duration_24
  ].filter(Boolean).length;

  let precoOriginal = anuncio.price || anuncio.preco || 0;
  let precoCalculado = precoOriginal;
  let desconto = 0;
  if (durationsTrue > 1) {
    if (selectedDuration === '4') {
      precoCalculado = precoOriginal * 2;
      desconto = descontos['4'];
    }
    if (selectedDuration === '12') {
      precoCalculado = precoOriginal * 6;
      desconto = descontos['12'];
    }
    if (selectedDuration === '24') {
      precoCalculado = precoOriginal * 12;
      desconto = descontos['24'];
    }
  }
  precoCalculado = precoCalculado - desconto;

  // Handler do botão
  const handleClick = () => {
    if (estaNoCarrinho) {
      console.log('🗑️ Removendo do carrinho:', anuncio.id);
      removerProduto(anuncio.id?.toString() || anuncio.id.toString());
    } else {
      console.log('🛒 Adicionando ao carrinho:', anuncio.id);
      adicionarProduto({
        id: anuncio.id?.toString() || anuncio.id.toString(),
        nome: anuncio.name || anuncio.nome || '',
        preco: precoOriginal,
        precoMultiplicado: precoCalculado,
        selectedDuration: selectedDuration,
        quantidade: 1,
        image: anuncio.image || '',
        endereco: anuncio.address || anuncio.adress || anuncio.endereco || '',
        screens: anuncio.screens || 1,
        display: anuncio.display || 1,
        views: anuncio.views || 0,
        duration_2: anuncio.duration_2 || false,
        duration_4: anuncio.duration_4 || false,
        duration_12: anuncio.duration_12 || false,
        duration_24: anuncio.duration_24 || false,
        type_screen: anuncio.type_screen && anuncio.type_screen.trim() ? anuncio.type_screen : 'digital',
      });
    }
  };

  return (
    <div
      className="bg-white rounded-xl shadow border border-gray-100 p-1 flex flex-col gap-0.5 w-[160px] min-w-[140px] max-w-[180px] cursor-pointer"
    >
      <div className="rounded-lg overflow-hidden h-8 flex items-center justify-center bg-gray-100 mb-0.5 relative">
        <img
          src={anuncio.image}
          alt={anuncio.name || anuncio.nome}
          className="object-cover w-full h-8"
          onError={(e) => {
            console.error('❌ Erro ao carregar imagem:', anuncio.image);
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
          onLoad={() => {
            console.log('✅ Imagem carregada com sucesso:', anuncio.image);
          }}
        />
        <div className="hidden absolute inset-0 items-center justify-center bg-gray-200 text-gray-500 text-[8px]">
          Sem imagem
        </div>
      </div>
      <div className="flex gap-1 mb-0.5">
        {anuncio.type_screen?.toLowerCase() === 'impresso' ? (
          <span className="bg-green-600 text-white text-[8px] px-1 py-0.5 rounded font-medium flex items-center gap-0.5">
            impresso
          </span>
        ) : (
          <span className="bg-purple-600 text-white text-[8px] px-1 py-0.5 rounded font-medium flex items-center gap-0.5">
            digital
          </span>
        )}
      </div>
      <h3 className="font-bold text-xs line-clamp-1 mb-0.5">{anuncio.name || anuncio.nome}</h3>
      <div className="text-gray-500 text-[8px] mb-0.5 break-words line-clamp-2">{anuncio.address || anuncio.adress || anuncio.endereco}</div>
      <div className="flex gap-2 mb-0.5">
        <div className="flex flex-col items-start">
          <span className="text-[7px] text-gray-500 font-medium lowercase">exibições</span>
          <span className="font-bold text-[8px]">{anuncio.display || anuncio.screens || '1'}</span>
        </div>
        <div className="flex flex-col items-start">
          <span className="text-[7px] text-gray-500 font-medium lowercase">alcance</span>
          <span className="font-bold text-[8px]">{anuncio.views || anuncio.alcance || '-'}</span>
        </div>
      </div>
      <div className="text-[8px] text-gray-800 mb-0.5 font-bold">Telas: {anuncio.screens || 1}</div>
      {/* Preço original riscado e preço com desconto */}
      <div className="mb-0.5 flex flex-col gap-0.5">
        {precoOriginal !== precoCalculado && (
          <span className="text-[8px] text-gray-400 line-through">R$ {Number(precoOriginal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{selectedDuration !== '2' && ` x${selectedDuration === '4' ? 2 : selectedDuration === '12' ? 6 : selectedDuration === '24' ? 12 : 1}`}</span>
        )}
        <span className="text-xs font-bold text-green-700">R$ {Number(precoCalculado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="text-[8px] text-gray-500 mb-0.5">/ {selectedDuration} semana{Number(selectedDuration) > 1 ? 's' : ''}</div>
      {!hideAddButton && (
        <button
          className={`w-full cursor-pointer flex items-center justify-center gap-1 border rounded py-0.5 text-[8px] font-semibold transition ${estaNoCarrinho ? 'border-red-400 text-red-600 hover:bg-red-50' : 'border-green-400 text-green-600 hover:bg-green-50'}`}
          onClick={handleClick}
        >
          {estaNoCarrinho ? (
            <>
              remover <TrashIcon className="inline w-3 h-3" />
            </>
          ) : (
            <>
              adicionar <ShoppingCartIcon className="inline w-3 h-3" />
            </>
          )}
        </button>
      )}
      {actionButton && <div className="mt-1">{actionButton}</div>}
    </div>
  );
} 