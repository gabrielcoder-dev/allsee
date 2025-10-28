"use client";

import React, { useState, useRef } from "react";
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
  const [totensArtes, setTotensArtes] = useState<Record<string, { file: File; previewUrl: string }>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  // Separar produtos por tipo
  const produtosDigitais = produtos.filter(
    (p) => p.type_screen?.toLowerCase() === "digital"
  );
  const produtosImpressos = produtos.filter(
    (p) => p.type_screen?.toLowerCase() === "impresso"
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedAnuncio) {
      const file = e.target.files[0];
      
      // Criar URL de preview
      const url = URL.createObjectURL(file);
      
      // Salvar a arte para o totem específico
      setTotensArtes(prev => ({
        ...prev,
        [selectedAnuncio.id]: { file, previewUrl: url }
      }));
    }
  };

  const handleMonitorClick = () => {
    if (selectedAnuncio) {
      fileInputRef.current?.click();
    }
  };

  const handleConcluir = () => {
    // Salvar todas as artes no contexto
    updateFormData({
      totensArtes: totensArtes,
      isArtSelected: Object.keys(totensArtes).length > 0
    });
    onClose();
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedAnuncio) {
      setTotensArtes(prev => {
        const newTotensArtes = { ...prev };
        delete newTotensArtes[selectedAnuncio.id];
        return newTotensArtes;
      });
    }
  };

  // Obter arte do totem selecionado
  const currentTotemArt = selectedAnuncio ? totensArtes[selectedAnuncio.id] : null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-hidden">
      <div className="w-full h-full flex flex-col">

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto">
          {/* Left Side - Lista de totens */}
          <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto p-4 lg:p-6 max-h-[40vh] lg:max-h-none">
            <h2 className="text-lg sm:text-xl font-bold">Arquivos</h2>
            <div className="space-y-4">
              {/* Seção Digital */}
              {produtosDigitais.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    Digital
                  </h3>
                  <div className="space-y-2">
                    {produtosDigitais.map((produto) => {
                      const hasArt = totensArtes[produto.id] !== undefined;
                      return (
                      <div
                        key={produto.id}
                        className={`p-2 sm:p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedAnuncio?.id === produto.id
                            ? "border-orange-500 bg-orange-50 shadow-sm"
                            : hasArt
                            ? "border-green-500 bg-green-50"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedAnuncio(produto)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs sm:text-sm text-gray-900 truncate">
                              {produto.nome}
                            </div>
                            <div className="text-[10px] sm:text-xs text-gray-500 mt-1 line-clamp-2">
                              {produto.endereco}
                            </div>
                          </div>
                          <span className="bg-purple-600 text-white text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap">
                            digital
                          </span>
                        </div>
                      </div>
                    );
                    })}
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
                    {produtosImpressos.map((produto) => {
                      const hasArt = totensArtes[produto.id] !== undefined;
                      return (
                      <div
                        key={produto.id}
                        className={`p-2 sm:p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedAnuncio?.id === produto.id
                            ? "border-orange-500 bg-orange-50 shadow-sm"
                            : hasArt
                            ? "border-green-500 bg-green-50"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedAnuncio(produto)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs sm:text-sm text-gray-900 truncate">
                              {produto.nome}
                            </div>
                            <div className="text-[10px] sm:text-xs text-gray-500 mt-1 line-clamp-2">
                              {produto.endereco}
                            </div>
                          </div>
                          <span className="bg-green-600 text-white text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap">
                            impresso
                          </span>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Preview */}
          <div className="flex-1 flex flex-col bg-gray-50">
            {/* Header do preview */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center justify-between mb-2 gap-2">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-700 truncate">
                  Personalize seu anúncio
                </h3>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {produtos.length} totens
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

            {/* Scrollable Container for Preview */}
            <div className="flex-1">
              {/* Preview Area */}
              <div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="relative w-full max-w-3xl">
                {/* Professional Monitor Design */}
                <div className="relative mx-auto" style={{ width: '100%', maxWidth: '400px', height: 'auto' }}>
                  <svg
                    viewBox="0 0 600 800"
                    className="w-full h-auto"
                    style={{ filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.4))' }}
                  >
                    {/* Shadow Layer */}
                    <ellipse cx="300" cy="780" rx="200" ry="20" fill="rgba(0,0,0,0.3)" />
                    
                    {/* Base Stand - Modern design */}
                    <g transform="translate(200, 660)">
                      {/* Stand */}
                      <rect x="0" y="0" width="200" height="40" rx="20" fill="#1e1e1e" />
                      <ellipse cx="100" cy="0" rx="100" ry="10" fill="#0f0f0f" />
                      
                      {/* Support pillar */}
                      <rect x="90" y="-60" width="20" height="60" fill="#2a2a2a" />
                      <ellipse cx="100" cy="-60" rx="18" ry="8" fill="#1a1a1a" />
                    </g>
                    
                    {/* Monitor Frame - Sleek modern design */}
                    <g transform="translate(80, 40)">
                      {/* Outer bezel - glossy finish */}
                      <rect x="0" y="0" width="440" height="600" rx="25" fill="#2d2d2d" />
                      <rect x="0" y="0" width="440" height="600" rx="25" fill="url(#gloss-gradient)" />
                      
                      {/* Inner bezel - thin border */}
                      <rect x="15" y="15" width="410" height="570" rx="20" fill="#1a1a1a" />
                      
                      {/* Screen area - where the image will appear */}
                      <rect x="40" y="50" width="360" height="500" rx="12" fill="#000000" />
                    </g>
                    
                    {/* Gradient for glossy effect */}
                    <defs>
                      <linearGradient id="gloss-gradient" x1="0%" y1="0%" x2="0%" y2="30%">
                        <stop offset="0%" style={{ stopColor: 'rgba(255,255,255,0.3)', stopOpacity: 0.3 }} />
                        <stop offset="100%" style={{ stopColor: 'rgba(255,255,255,0)', stopOpacity: 0 }} />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/mov"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  {/* Screen Content - positioned inside monitor */}
                  <div 
                    className={`absolute transition-all ${selectedAnuncio ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed'}`}
                    onClick={handleMonitorClick}
                    style={{
                      left: '20%',
                      top: '11.25%',
                      width: '60%',
                      height: '62.5%',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: currentTotemArt ? 'transparent' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                    }}
                  >
                    {currentTotemArt ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <img
                          src={currentTotemArt.previewUrl}
                          alt="Preview"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            pointerEvents: 'none'
                          }}
                        />
                        {/* Remove button */}
                        <button
                          onClick={handleRemoveFile}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-base transition-colors shadow-lg z-10"
                          title="Remover arquivo"
                        >
                          ✕
                        </button>
                        
                        {/* Branding overlay */}
                        <div className="absolute bottom-2 right-2 bg-black/90 px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-lg pointer-events-none">
                          <Monitor className="w-4 h-4 text-orange-500" />
                          <span className="text-[11px] text-white font-bold">ALL SEE</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-white p-8 text-center">
                        <div className="bg-white/15 backdrop-blur-sm rounded-full w-20 h-20 flex items-center justify-center mb-6 shadow-xl">
                          <Monitor className="w-10 h-10 opacity-70" />
                        </div>
                        {selectedAnuncio ? (
                          <>
                            <p className="text-sm font-semibold opacity-95 mb-2">
                              Selecione um arquivo para visualizar
                            </p>
                            <p className="text-xs opacity-70 font-medium">
                              Proporção recomendada: 1080x1920 px
                            </p>
                          </>
                        ) : (
                          <p className="text-sm font-semibold opacity-95">
                            Selecione o totem e escolha uma arte
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 bg-white">
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors text-sm sm:text-base"
          >
            Cancelar
          </button>
          <button
            onClick={handleConcluir}
            disabled={Object.keys(totensArtes).length === 0}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2 rounded-lg font-semibold transition-colors text-sm sm:text-base"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}

