import React from 'react';

export default function MiniAnuncioCard({ anuncio, actionButton }: { anuncio: any, actionButton?: React.ReactNode }) {
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
      {actionButton && <div className="mt-2">{actionButton}</div>}
    </div>
  );
} 