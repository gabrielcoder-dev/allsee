'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface MarkerAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: string) => void;
  initialAddress?: string;
  mode: 'add' | 'edit';
}

const MarkerAddressModal: React.FC<MarkerAddressModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialAddress = '',
  mode
}) => {
  const [address, setAddress] = useState(initialAddress);

  // Atualizar o estado quando o initialAddress mudar
  useEffect(() => {
    setAddress(initialAddress);
  }, [initialAddress]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (address.trim()) {
      onSave(address.trim());
      setAddress('');
      onClose();
    }
  };

  const handleClose = () => {
    setAddress('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 cursor-pointer p-2 hover:bg-gray-100 rounded-full transition"
          onClick={handleClose}
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold mb-4">
          {mode === 'add' ? 'Adicionar Endereço' : 'Editar Endereço'}
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Endereço do Ponto
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Digite o endereço do ponto"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              }
            }}
          />
        </div>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!address.trim()}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              address.trim()
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {mode === 'add' ? 'Concluir' : 'Atualizar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarkerAddressModal;

