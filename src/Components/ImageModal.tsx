import { X } from 'lucide-react';
import React from 'react';

interface ImageModalProps {
  imageUrl: string;
  name: string;
  address: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, name, address, onClose }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay de fundo */}
      <div className="absolute inset-0 bg-gray-500 opacity-50" onClick={onClose}></div>
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-4 sm:p-7 w-full max-w-md sm:max-w-lg md:max-w-2xl mx-4 flex flex-col items-center opacity-100 z-10 min-h-[250px] sm:min-h-0" onClick={e => e.stopPropagation()}>
        <button
          className="absolute top-2 cursor-pointer right-2 text-gray-400 hover:text-gray-700 text-xl font-bold"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X className='w-5' />
        </button>
        <img 
          src={imageUrl} 
          alt={name} 
          className="object-contain w-full max-h-[60vh] rounded mb-4 shadow-lg"
          loading="eager"
          decoding="async"
          style={{
            imageRendering: 'auto',
            imageSmoothingQuality: 'high'
          } as React.CSSProperties}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
        <div className="w-full text-left mt-2">
          <div className="font-semibold text-base mb-1">{name}</div>
          <div className="text-xs text-gray-500">{address}</div>
        </div>
      </div>
    </div>
  );
};

export default ImageModal; 