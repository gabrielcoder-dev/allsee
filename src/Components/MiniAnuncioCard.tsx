import React from 'react';
import { ShoppingCartIcon, TrashIcon } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function MiniAnuncioCard({ anuncio, actionButton, hideAddButton }: { anuncio: any, actionButton?: React.ReactNode, hideAddButton?: boolean }) {
  const { adicionarProduto, removerProduto, produtos, selectedDurationGlobal } = useCart();
  
  // Debug: verificar se o anuncio tem imagem
  console.log('🔍 MiniAnuncioCard - anuncio:', {
    id: anuncio.id,
    name: anuncio.name || anuncio.nome,
    image: anuncio.image,
    hasImage: !!anuncio.image
  });
  
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
      removerProduto(anuncio.id?.toString() || anuncio.id);
    } else {
      adicionarProduto({
        id: anuncio.id?.toString() || anuncio.id,
        nome: anuncio.name || anuncio.nome,
        preco: precoOriginal,
        precoMultiplicado: precoCalculado,
        selectedDuration: selectedDuration,
        quantidade: 1,
        image: anuncio.image,
        endereco: anuncio.address || anuncio.adress || anuncio.endereco,
        screens: anuncio.screens,
        display: anuncio.display,
        views: anuncio.views,
        duration_2: anuncio.duration_2,
        duration_4: anuncio.duration_4,
        duration_12: anuncio.duration_12,
        duration_24: anuncio.duration_24,
        type_screen: anuncio.type_screen && anuncio.type_screen.trim() ? anuncio.type_screen : 'digital',
      });
    }
  };

  return (
    <div
      className="bg-white rounded-xl shadow border border-gray-100 p-1.5 flex flex-col gap-1 w-[200px] min-w-[160px] max-w-[220px] cursor-pointer"
    >
      <div className="rounded-lg overflow-hidden h-12 flex items-center justify-center bg-gray-100 mb-1 relative">
        <img
          src={anuncio.image}
          alt={anuncio.name || anuncio.nome}
          className="object-cover w-full h-12"
          onError={(e) => {
            console.error('❌ Erro ao carregar imagem:', anuncio.image);
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
          onLoad={() => {
            console.log('✅ Imagem carregada com sucesso:', anuncio.image);
          }}
        />
        <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-500 text-xs">
          Sem imagem
        </div>
      </div>
      <div className="flex gap-2 mb-1">
        {anuncio.type_screen?.toLowerCase() === 'impresso' ? (
          <span className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
            impresso
          </span>
        ) : (
          <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
            digital
          </span>
        )}
      </div>
      <h3 className="font-bold text-sm line-clamp-2 mb-1">{anuncio.name || anuncio.nome}</h3>
      <div className="text-gray-500 text-xs mb-1 break-words">{anuncio.address || anuncio.adress || anuncio.endereco}</div>
      <div className="flex gap-4 mb-1">
        <div className="flex flex-col items-start">
          <span className="text-[9px] text-gray-500 font-medium lowercase">exibições</span>
          <span className="font-bold text-xs">{anuncio.display || anuncio.screens || '1'}</span>
        </div>
        <div className="flex flex-col items-start">
          <span className="text-[9px] text-gray-500 font-medium lowercase">alcance</span>
          <span className="font-bold text-xs">{anuncio.views || anuncio.alcance || '-'}</span>
        </div>
      </div>
      <div className="text-[11px] text-gray-800 mb-1 font-bold">Telas: {anuncio.screens || 1}</div>
      {/* Preço original riscado e preço com desconto */}
      <div className="mb-1 flex flex-col gap-1">
        {precoOriginal !== precoCalculado && (
          <span className="text-xs text-gray-400 line-through">R$ {Number(precoOriginal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{selectedDuration !== '2' && ` x${selectedDuration === '4' ? 2 : selectedDuration === '12' ? 6 : selectedDuration === '24' ? 12 : 1}`}</span>
        )}
        <span className="text-sm font-bold text-green-700">R$ {Number(precoCalculado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="text-[11px] text-gray-500 mb-1">/ {selectedDuration} semana{Number(selectedDuration) > 1 ? 's' : ''}</div>
      {!hideAddButton && (
        <button
          className={`w-full cursor-pointer flex items-center justify-center gap-2 border rounded-lg py-1 text-xs font-semibold transition ${estaNoCarrinho ? 'border-red-400 text-red-600 hover:bg-red-50' : 'border-green-400 text-green-600 hover:bg-green-50'}`}
          onClick={handleClick}
        >
          {estaNoCarrinho ? (
            <>
              remover ponto <TrashIcon className="inline w-4 h-4 mr-1" />
            </>
          ) : (
            <>
              adicionar ponto <ShoppingCartIcon className="inline w-4 h-4 mr-1" />
            </>
          )}
        </button>
      )}
      {actionButton && <div className="mt-2">{actionButton}</div>}
    </div>
  );
} 