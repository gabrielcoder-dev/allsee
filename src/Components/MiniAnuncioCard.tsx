import React from 'react';
import { ShoppingCartIcon, TrashIcon } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function MiniAnuncioCard({ anuncio, actionButton }: { anuncio: any, actionButton?: React.ReactNode }) {
  const { adicionarProduto, removerProduto, produtos } = useCart();
  // Checa se já está no carrinho
  const estaNoCarrinho = produtos.some((p) => p.id === (anuncio.id?.toString() || anuncio.id));
  // Duração padrão para MiniAnuncioCard
  const selectedDuration = '2';

  // Preço e campos mínimos
  const preco = anuncio.price || anuncio.preco || 0;
  const precoMultiplicado = preco; // Sem desconto para 2 semanas

  // Handler do botão
  const handleClick = () => {
    if (estaNoCarrinho) {
      removerProduto(anuncio.id?.toString() || anuncio.id);
    } else {
      adicionarProduto({
        id: anuncio.id?.toString() || anuncio.id,
        nome: anuncio.name || anuncio.nome,
        preco: preco,
        precoMultiplicado: precoMultiplicado,
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
    <div className="bg-white rounded-xl shadow border border-gray-100 p-2 flex flex-col gap-1 w-[250px] min-w-[200px] max-w-[270px]">
      <div className="rounded-lg overflow-hidden h-16 flex items-center justify-center bg-gray-100 mb-1">
        <img
          src={anuncio.image}
          alt={anuncio.name || anuncio.nome}
          className="object-cover w-full h-16"
        />
      </div>
      <div className="flex gap-2 mb-1">
        {anuncio.type_screen?.toLowerCase() === 'impresso' ? (
          <span className="bg-green-600 text-white text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
            impresso
          </span>
        ) : (
          <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
            digital
          </span>
        )}
      </div>
      <h3 className="font-bold text-base line-clamp-2 mb-1">{anuncio.name || anuncio.nome}</h3>
      <div className="text-gray-500 text-xs mb-1 break-words">{anuncio.address || anuncio.adress || anuncio.endereco}</div>
      <div className="flex gap-4 mb-1">
        <div className="flex flex-col items-start">
          <span className="text-[10px] text-gray-500 font-medium lowercase">exibições</span>
          <span className="font-bold text-sm">{anuncio.display || anuncio.screens || '1'}</span>
        </div>
        <div className="flex flex-col items-start">
          <span className="text-[10px] text-gray-500 font-medium lowercase">alcance</span>
          <span className="font-bold text-sm">{anuncio.views || anuncio.alcance || '-'}</span>
        </div>
      </div>
      <div className="text-xs text-gray-800 mb-1 font-bold">Telas: {anuncio.screens || 1}</div>
      <div className="text-base font-bold mb-1 text-green-700">R$ {Number(anuncio.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
      <div className="text-xs text-gray-500 mb-1">/ 2 semanas</div>
      <button
        className={`w-full cursor-pointer flex items-center justify-center gap-2 border rounded-lg py-1 text-sm font-semibold transition ${estaNoCarrinho ? 'border-red-400 text-red-600 hover:bg-red-50' : 'border-green-400 text-green-600 hover:bg-green-50'}`}
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
      {actionButton && <div className="mt-2">{actionButton}</div>}
    </div>
  );
} 