"use client";

import React, { useState } from "react";
import { X, Monitor, Printer } from "lucide-react";
import { useCart } from "@/context/CartContext";

interface ModalSelecionarArteProps {
  open: boolean;
  onClose: () => void;
}

export default function ModalSelecionarArte({
  open,
  onClose,
}: ModalSelecionarArteProps) {
  const { produtos, updateFormData, formData } = useCart();
  const [selectedAnuncio, setSelectedAnuncio] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!open) return null;

  // Separar produtos por tipo
  const produtosDigitais = produtos.filter(
    (p) => p.type_screen?.toLowerCase() === "digital"
  );
  const produtosImpressos = produtos.filter(
    (p) => p.type_screen?.toLowerCase() === "impresso"
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFile(file);
      
      // Criar URL de preview
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleConcluir = () => {
    if (file) {
      // Salvar arquivo selecionado no contexto
      updateFormData({
        selectedImage: file,
        previewUrl: previewUrl,
        isArtSelected: true
      });
    }
    onClose();
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-hidden">
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div>
            <h2 className="text-xl font-bold">Arquivos</h2>
            <div className="text-xs text-gray-500 mt-1">0/1 concluído</div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Side - Lista de totens */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto p-6">
            <div className="space-y-4">
              {/* Seção Digital */}
              {produtosDigitais.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    Digital
                  </h3>
                  <div className="space-y-2">
                    {produtosDigitais.map((produto) => (
                      <div
                        key={produto.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedAnuncio?.id === produto.id
                            ? "border-orange-500 bg-orange-50 shadow-sm"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedAnuncio(produto)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">
                              {produto.nome}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {produto.endereco}
                            </div>
                          </div>
                          <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded">
                            digital
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seção Impresso */}
              {produtosImpressos.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    Impresso
                  </h3>
                  <div className="space-y-2">
                    {produtosImpressos.map((produto) => (
                      <div
                        key={produto.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedAnuncio?.id === produto.id
                            ? "border-orange-500 bg-orange-50 shadow-sm"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedAnuncio(produto)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">
                              {produto.nome}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {produto.endereco}
                            </div>
                          </div>
                          <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded">
                            impresso
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Preview */}
          <div className="flex-1 flex flex-col bg-gray-50">
            {/* Header do preview */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">
                  Personalize seu anúncio
                </h3>
                <span className="text-xs text-gray-400">
                  {produtos.length} totens selecionados
                </span>
              </div>
              
              {selectedAnuncio && (
                <div className="flex items-center gap-2">
                  <span className="text-xs px-3 py-1 rounded bg-orange-100 text-orange-600 font-medium inline-flex items-center gap-1">
                    {selectedAnuncio.type_screen === 'digital' ? (
                      <>
                        <Monitor className="w-3 h-3" />
                        Digital
                      </>
                    ) : (
                      <>
                        <Printer className="w-3 h-3" />
                        Impresso
                      </>
                    )}
                  </span>
                  <span className="text-xs text-gray-500">
                    {selectedAnuncio.nome}
                  </span>
                </div>
              )}
            </div>

            {/* Preview Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="relative w-full max-w-2xl">
                {/* Monitor/TV Frame Container */}
                <div className="relative mx-auto" style={{ width: '500px', height: 'auto' }}>
                  {/* Monitor Frame */}
                  <div className="relative">
                    {/* SVG Monitor Bezel */}
                    <svg
                      viewBox="0 0 500 700"
                      className="w-full h-auto drop-shadow-2xl"
                      style={{ filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.3))' }}
                    >
                      {/* Monitor Base */}
                      <rect x="50" y="640" width="400" height="50" rx="15" fill="#1a1a1a" />
                      <path d="M 70 640 Q 70 600 140 600 L 360 600 Q 430 600 430 640" fill="#0f0f0f" />
                      
                      {/* Monitor Bezel/Frame */}
                      <rect x="100" y="80" width="300" height="480" rx="8" fill="#2d2d2d" stroke="#1a1a1a" strokeWidth="4" />
                      
                      {/* Screen Border */}
                      <rect x="120" y="120" width="260" height="420" rx="6" fill="#000000" stroke="#0a0a0a" strokeWidth="2" />
                    </svg>
                    
                    {/* Screen Content - Absolute positioned over SVG */}
                    <div 
                      className="absolute"
                      style={{
                        left: '120px',
                        top: '120px',
                        width: '260px',
                        height: '420px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: previewUrl ? 'transparent' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                      }}
                    >
                      {previewUrl ? (
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                          <img
                            src={previewUrl}
                            alt="Preview"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                          />
                          {/* Remove button */}
                          <button
                            onClick={handleRemoveFile}
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm transition-colors"
                          >
                            ✕
                          </button>
                          
                          {/* Branding overlay */}
                          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded flex items-center gap-1">
                            <Monitor className="w-3 h-3 text-orange-500" />
                            <span className="text-[10px] text-white font-semibold">ALL SEE</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
                          <div className="bg-white/10 backdrop-blur-sm rounded-full w-16 h-16 flex items-center justify-center mb-4">
                            <Monitor className="w-8 h-8 opacity-50" />
                          </div>
                          <p className="text-xs font-medium opacity-90 mb-2">
                            Selecione um arquivo para visualizar
                          </p>
                          <p className="text-[10px] opacity-60">
                            Proporção: 1080x1920 px
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload Button */}
                  <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
                    <label className="cursor-pointer inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/mov"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Monitor className="w-5 h-5" />
                      enviar arquivo +
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Dicas */}
            <div className="px-6 py-4 border-t border-gray-200 bg-white">
              <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600 transition-colors">
                <span className="text-lg">💡</span>
                Ver dicas
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConcluir}
            disabled={!previewUrl}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}

