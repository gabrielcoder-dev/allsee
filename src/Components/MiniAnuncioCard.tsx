import React from 'react';
import { ShoppingCartIcon, TrashIcon, Zap } from 'lucide-react';
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

export default function MiniAnuncioCard({ anuncio, actionButton, hideAddButton, size = 'default' }: { 
  anuncio: AnuncioType, 
  actionButton?: React.ReactNode, 
  hideAddButton?: boolean,
  size?: 'small' | 'default' | 'medium' | 'large'
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

  // Classes baseadas no tamanho
  const containerClasses = size === 'small' 
    ? "bg-white rounded-xl shadow border border-gray-100 p-1 flex flex-col gap-0.5 w-[160px] min-w-[140px] max-w-[180px] cursor-pointer"
    : size === 'medium'
    ? "bg-white rounded-xl shadow border border-gray-100 p-2 flex flex-col gap-1.5 w-[220px] min-w-[200px] max-w-[240px] cursor-pointer"
    : size === 'large'
    ? "bg-white rounded-xl shadow border border-gray-100 p-3 flex flex-col gap-2 w-[280px] min-w-[250px] max-w-[320px] cursor-pointer"
    : "bg-white rounded-xl shadow border border-gray-100 p-2 flex flex-col gap-1.5 w-[240px] min-w-[220px] max-w-[260px] cursor-pointer";

  const imageClasses = size === 'small'
    ? "rounded-lg overflow-hidden h-8 flex items-center justify-center bg-gray-100 mb-0.5 relative"
    : size === 'medium'
    ? "rounded-lg overflow-hidden h-12 flex items-center justify-center bg-gray-100 mb-1.5 relative"
    : size === 'large'
    ? "rounded-lg overflow-hidden h-16 flex items-center justify-center bg-gray-100 mb-2 relative"
    : "rounded-lg overflow-hidden h-12 flex items-center justify-center bg-gray-100 mb-1.5 relative";

  const imageImgClasses = size === 'small'
    ? "object-cover w-full h-8"
    : size === 'medium'
    ? "object-cover w-full h-12"
    : size === 'large'
    ? "object-cover w-full h-16"
    : "object-cover w-full h-12";

  const tagClasses = size === 'small'
    ? "bg-purple-600 text-white text-[8px] px-1 py-0.5 rounded font-medium flex items-center gap-0.5"
    : size === 'medium'
    ? "bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5"
    : size === 'large'
    ? "bg-purple-600 text-white text-xs px-2 py-1 rounded font-medium flex items-center gap-1"
    : "bg-purple-600 text-white text-[9px] px-1 py-0.5 rounded font-medium flex items-center gap-0.5";

  const titleClasses = size === 'small'
    ? "font-bold text-xs line-clamp-1 mb-0.5"
    : size === 'medium'
    ? "font-bold text-sm line-clamp-1 mb-1"
    : size === 'large'
    ? "font-bold text-sm line-clamp-1 mb-1"
    : "font-bold text-xs line-clamp-1 mb-0.5";

  const addressClasses = size === 'small'
    ? "text-gray-500 text-[8px] mb-0.5 break-words line-clamp-2"
    : size === 'medium'
    ? "text-gray-500 text-[10px] mb-1 break-words line-clamp-2"
    : size === 'large'
    ? "text-gray-500 text-xs mb-2 break-words line-clamp-2"
    : "text-gray-500 text-[9px] mb-0.5 break-words line-clamp-2";

  const statsContainerClasses = size === 'small'
    ? "flex gap-1.5 mb-0.5"
    : size === 'medium'
    ? "flex gap-2 mb-1"
    : size === 'large'
    ? "flex gap-3 mb-2"
    : "flex gap-1.5 mb-0.5";

  const statLabelClasses = size === 'small'
    ? "text-[6px] text-gray-500 font-medium lowercase"
    : size === 'medium'
    ? "text-[8px] text-gray-500 font-medium lowercase"
    : size === 'large'
    ? "text-[10px] text-gray-500 font-medium lowercase"
    : "text-[7px] text-gray-500 font-medium lowercase";

  const statValueClasses = size === 'small'
    ? "font-bold text-[7px]"
    : size === 'medium'
    ? "font-bold text-[9px]"
    : size === 'large'
    ? "font-bold text-xs"
    : "font-bold text-[8px]";

  const screensClasses = size === 'small'
    ? "text-[8px] text-gray-800 mb-0.5 font-bold"
    : size === 'medium'
    ? "text-[10px] text-gray-800 mb-1 font-bold"
    : size === 'large'
    ? "text-xs text-gray-800 mb-2 font-bold"
    : "text-[9px] text-gray-800 mb-0.5 font-bold";

  const priceContainerClasses = size === 'small'
    ? "mb-0.5 flex flex-col gap-0.5"
    : size === 'medium'
    ? "mb-1 flex flex-col gap-0.5"
    : size === 'large'
    ? "mb-2 flex flex-col gap-1"
    : "mb-0.5 flex flex-col gap-0.5";

  const originalPriceClasses = size === 'small'
    ? "text-[8px] text-gray-400 line-through"
    : size === 'medium'
    ? "text-[10px] text-gray-400 line-through"
    : size === 'large'
    ? "text-xs text-gray-400 line-through"
    : "text-[9px] text-gray-400 line-through";

  const finalPriceClasses = size === 'small'
    ? "text-xs font-bold text-green-700"
    : size === 'medium'
    ? "text-sm font-bold text-green-700"
    : size === 'large'
    ? "text-lg font-bold text-green-700"
    : "text-xs font-bold text-green-700";

  const durationClasses = size === 'small'
    ? "text-[8px] text-gray-500 mb-0.5"
    : size === 'medium'
    ? "text-[10px] text-gray-500 mb-1"
    : size === 'large'
    ? "text-xs text-gray-500 mb-2"
    : "text-[9px] text-gray-500 mb-0.5";

  const buttonClasses = size === 'small'
    ? "w-full cursor-pointer flex items-center justify-center gap-1 border rounded py-0.5 text-[8px] font-semibold transition"
    : size === 'medium'
    ? "w-full cursor-pointer flex items-center justify-center gap-1 border rounded py-1 text-[10px] font-semibold transition"
    : size === 'large'
    ? "w-full cursor-pointer flex items-center justify-center gap-2 border rounded py-2 text-sm font-semibold transition"
    : "w-full cursor-pointer flex items-center justify-center gap-1 border rounded py-0.5 text-[9px] font-semibold transition";

  return (
    <div className={containerClasses}>
      <div className={imageClasses}>
        <img
          src={anuncio.image}
          alt={anuncio.name || anuncio.nome}
          className={imageImgClasses}
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
          <span className={tagClasses.replace('bg-purple-600', 'bg-green-600')}>
            impresso
          </span>
        ) : (
          <span className={tagClasses}>
            digital
          </span>
        )}
      </div>
      <h3 className={titleClasses}>{anuncio.name || anuncio.nome}</h3>
      <div className={addressClasses}>{anuncio.address || anuncio.adress || anuncio.endereco}</div>
      <div className={statsContainerClasses}>
        <div className="flex flex-col items-start">
          <span className={statLabelClasses}>exibições</span>
          <span className={statValueClasses}>{anuncio.display || anuncio.screens || '1'}</span>
        </div>
        <div className="flex flex-col items-start">
          <span className={statLabelClasses}>alcance</span>
          <span className={statValueClasses}>{anuncio.views || anuncio.alcance || '-'}</span>
        </div>
        <div className="flex flex-col items-start">
          <span className={statLabelClasses}>impacto</span>
          <span className={statValueClasses}>{((anuncio.views || anuncio.alcance || 0) * 3).toLocaleString('pt-BR')}</span>
        </div>
      </div>
      <div className={screensClasses}>Telas: {anuncio.screens || 1}</div>
      {/* Preço original riscado e preço com desconto */}
      <div className={priceContainerClasses}>
        {precoOriginal !== precoCalculado && (
          <span className={originalPriceClasses}>R$ {Number(precoOriginal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{selectedDuration !== '2' && ` x${selectedDuration === '4' ? 2 : selectedDuration === '12' ? 6 : selectedDuration === '24' ? 12 : 1}`}</span>
        )}
        <span className={finalPriceClasses}>R$ {Number(precoCalculado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>
      <div className={durationClasses}>/ {selectedDuration} semana{Number(selectedDuration) > 1 ? 's' : ''}</div>
      {!hideAddButton && (
        <button
          className={`${buttonClasses} ${estaNoCarrinho ? 'border-red-400 text-red-600 hover:bg-red-50' : 'border-green-400 text-green-600 hover:bg-green-50'}`}
          onClick={handleClick}
        >
          {estaNoCarrinho ? (
            <>
              remover ponto <TrashIcon className="inline w-3 h-3" />
            </>
          ) : (
            <>
              adicionar ponto <ShoppingCartIcon className="inline w-3 h-3" />
            </>
          )}
        </button>
      )}
      {actionButton && <div className="mt-1">{actionButton}</div>}
    </div>
  );
} 