import React from "react";
import Image from "next/image";
import ImageAprove from "@/assets/restaurante-2.jpg";

const ProgressAdmin = () => {
  return (
    <div className="w-full h-full p-2 md:p-10">
      <div className="flex flex-row flex-wrap items-start gap-2 md:gap-8 border border-gray-300 rounded-2xl p-2 md:p-6 bg-white shadow-sm">
        {/* Imagem + Detalhes (coluna no mobile, row no desktop) */}
        <div className="flex flex-col items-center min-w-[90px] md:min-w-[120px] md:flex-row md:items-start">
          <Image
            src={ImageAprove}
            alt="Aprove"
            className="w-20 sm:w-24 md:w-32 rounded-2xl object-cover"
          />
          <p className="mt-2 md:mt-0 md:ml-4 text-center md:text-left min-w-[80px] font-bold cursor-pointer text-black md:self-center">
            Detalhes
          </p>
        </div>
        {/* Dados */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-12">
          <div className="flex flex-col gap-1">
            <p className="text-gray-700 font-bold">Exibições</p>
            <p className="text-gray-500">500</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-gray-700 font-bold">Visualizações</p>
            <p className="text-gray-500">5,5 mil</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-gray-700 font-bold">Tempo Restante</p>
            <p className="text-gray-500">61</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressAdmin;
