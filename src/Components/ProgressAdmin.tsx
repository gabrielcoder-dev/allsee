import React from "react";
import Image from "next/image";
import ImageAprove from "@/assets/restaurante-2.jpg";

const ProgressAdmin = () => {
  return (
    <div className="w-full h-full p-3 md:p-6">
      <h2 className="text-2xl md:text-3xl font-bold text-orange-600 mb-4 md:mb-6">Anúncios em Andamento</h2>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 border border-gray-300 rounded-xl md:rounded-2xl p-4 md:p-6 bg-white shadow-sm">
          {/* Imagem + Detalhes */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-3 md:gap-4 flex-shrink-0">
            <Image
              src={ImageAprove}
              alt="Aprove"
              className="w-20 h-20 md:w-32 md:h-32 rounded-xl md:rounded-2xl object-cover"
            />
            <div className="text-center md:text-left">
              <p className="font-bold text-gray-800 text-sm md:text-base">Restaurante Exemplo</p>
              <p className="text-gray-500 text-xs md:text-sm">Localização: Centro</p>
            </div>
          </div>
          
          {/* Dados */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-700 font-bold text-sm md:text-base">Exibições</p>
              <p className="text-gray-500 text-lg md:text-xl font-semibold">500</p>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-700 font-bold text-sm md:text-base">Visualizações</p>
              <p className="text-gray-500 text-lg md:text-xl font-semibold">5,5 mil</p>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-700 font-bold text-sm md:text-base">Tempo Restante</p>
              <p className="text-gray-500 text-lg md:text-xl font-semibold">61 dias</p>
            </div>
          </div>
        </div>

        {/* Card adicional para demonstração */}
        <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 border border-gray-300 rounded-xl md:rounded-2xl p-4 md:p-6 bg-white shadow-sm">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-3 md:gap-4 flex-shrink-0">
            <Image
              src={ImageAprove}
              alt="Aprove"
              className="w-20 h-20 md:w-32 md:h-32 rounded-xl md:rounded-2xl object-cover"
            />
            <div className="text-center md:text-left">
              <p className="font-bold text-gray-800 text-sm md:text-base">Loja de Roupas</p>
              <p className="text-gray-500 text-xs md:text-sm">Localização: Shopping</p>
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-700 font-bold text-sm md:text-base">Exibições</p>
              <p className="text-gray-500 text-lg md:text-xl font-semibold">750</p>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-700 font-bold text-sm md:text-base">Visualizações</p>
              <p className="text-gray-500 text-lg md:text-xl font-semibold">8,2 mil</p>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-700 font-bold text-sm md:text-base">Tempo Restante</p>
              <p className="text-gray-500 text-lg md:text-xl font-semibold">45 dias</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressAdmin;
