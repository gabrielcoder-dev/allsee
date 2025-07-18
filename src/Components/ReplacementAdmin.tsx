import React from "react";
import Image from "next/image";
import ImageAprove from "@/assets/restaurante-2.jpg";

const ReplacementAdmin = () => {
  return (
    <div className="w-full h-full p-3 md:p-6">
      <h2 className="text-2xl md:text-3xl font-bold text-orange-600 mb-4 md:mb-6">Solicitações de Substituição</h2>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 justify-between border border-gray-300 rounded-xl md:rounded-2xl p-4 md:p-6 bg-white shadow-sm">
          <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
            <Image
              src={ImageAprove}
              alt="Aprove"
              className="w-16 h-16 md:w-24 md:h-24 rounded-lg md:rounded-xl object-cover flex-shrink-0"
            />
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 min-w-0 flex-1">
              <div className="flex items-center gap-2 md:gap-4">
                <button className="text-gray-500 hover:text-orange-600 text-sm md:text-base font-medium transition-colors">
                  Baixar
                </button>
                <button className="text-gray-500 hover:text-orange-600 text-sm md:text-base font-medium transition-colors">
                  Assistir
                </button>
              </div>
              <div className="text-sm md:text-base">
                <p className="font-bold text-gray-800">Restaurante Exemplo</p>
                <p className="text-gray-500">Solicitação de substituição</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <button className="bg-green-500 hover:bg-green-600 cursor-pointer text-white rounded-lg md:rounded-xl px-3 py-2 font-bold text-xs md:text-sm transition-colors min-w-[70px]">
              Aceitar
            </button>
            <button className="bg-red-500 hover:bg-red-600 cursor-pointer text-white rounded-lg md:rounded-xl px-3 py-2 font-bold text-xs md:text-sm transition-colors min-w-[70px]">
              Recusar
            </button>
          </div>
        </div>

        {/* Card adicional para demonstração */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 justify-between border border-gray-300 rounded-xl md:rounded-2xl p-4 md:p-6 bg-white shadow-sm">
          <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
            <Image
              src={ImageAprove}
              alt="Aprove"
              className="w-16 h-16 md:w-24 md:h-24 rounded-lg md:rounded-xl object-cover flex-shrink-0"
            />
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 min-w-0 flex-1">
              <div className="flex items-center gap-2 md:gap-4">
                <button className="text-gray-500 hover:text-orange-600 text-sm md:text-base font-medium transition-colors">
                  Baixar
                </button>
                <button className="text-gray-500 hover:text-orange-600 text-sm md:text-base font-medium transition-colors">
                  Assistir
                </button>
              </div>
              <div className="text-sm md:text-base">
                <p className="font-bold text-gray-800">Loja de Roupas</p>
                <p className="text-gray-500">Solicitação de substituição</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <button className="bg-green-500 hover:bg-green-600 cursor-pointer text-white rounded-lg md:rounded-xl px-3 py-2 font-bold text-xs md:text-sm transition-colors min-w-[70px]">
              Aceitar
            </button>
            <button className="bg-red-500 hover:bg-red-600 cursor-pointer text-white rounded-lg md:rounded-xl px-3 py-2 font-bold text-xs md:text-sm transition-colors min-w-[70px]">
              Recusar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplacementAdmin;
