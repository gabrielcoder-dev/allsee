import React from "react";
import Image from "next/image";
import ImageAprove from "@/assets/restaurante-2.jpg";

const ReplacementAdmin = () => {
  return (
    <div className="w-full h-full p-2 md:p-10">
      <div className="flex flex-row flex-wrap items-center gap-2 justify-between border border-gray-300 rounded-2xl p-2">
        <div className="flex gap-2 items-center min-w-[120px]">
          <Image
            src={ImageAprove}
            alt="Aprove"
            className="w-20 sm:w-24 md:w-32 rounded-2xl object-cover"
          />
          <div className="flex items-center gap-2 sm:gap-4">
            <p className="text-gray-500 cursor-pointer hover:text-orange-600 text-xl sm:text-sm md:text-base">
              Baixar
            </p>
            <p className="text-gray-500 cursor-pointer hover:text-orange-600 text-xl sm:text-sm md:text-base">
              Assistir
            </p>
          </div>
        </div>
        {/* <div className="flex flex-col gap-1">
          <p className="text-gray-700 font-bold">Exibições</p>
          <p className="text-gray-500">500</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-gray-700 font-bold">Restaurante</p>
          <p className="text-gray-500">5,5 mil</p>
        </div> */}

        <div className="flex items-center gap-2 sm:gap-4 p-2 min-w-[160px] w-auto justify-center">
          <p className="mx-2 my-2 md:my-0 text-center md:text-left min-w-[80px] text-bold cursor-semibold">
            Detalhes
          </p>
          <button className="bg-green-500 cursor-pointer text-white rounded-2xl px-3 py-2 font-bold text-xs sm:text-sm md:text-base min-w-[70px]">
            Aceitar
          </button>
          <button className="bg-red-500 cursor-pointer text-white rounded-2xl px-3 py-2 font-bold text-xs sm:text-sm md:text-base min-w-[70px]">
            Recusar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReplacementAdmin;
