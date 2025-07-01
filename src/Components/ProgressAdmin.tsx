import React from "react";
import Image from "next/image";
import ImageAprove from "@/assets/restaurante-2.jpg";

const ProgressAdmin = () => {
  return (
    <div className="w-full h-full p-2 md:p-10">
      <div className="flex flex-row flex-wrap items-center gap-2 justify-between border border-gray-300 rounded-2xl p-2">
        <div className="flex gap-2 items-center min-w-[120px]">
          <Image
            src={ImageAprove}
            alt="Aprove"
            className="w-20 sm:w-24 md:w-32 rounded-2xl object-cover"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 xl:gap-32">
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

        <p className="mx-2 my-2 md:my-0 text-center md:text-left min-w-[80px] text-bold cursor-pointer">
          Detalhes
        </p>
      </div>
    </div>
  );
};

export default ProgressAdmin;
