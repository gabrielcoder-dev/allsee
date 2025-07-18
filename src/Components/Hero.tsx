import Image from "next/image";
import heroImg from "@/assets/hero-img.png"

const Hero = () => {
  return (
    <div className='relative flex h-screen justify-between flex-col md:flex-row px-8 md:px-24 items-center' id="home">

      <div className="absolute bg-orange-200 w-96 h-96 -z-10 rounded-full -top-30 -left-30 blur-3xl"></div>
      
      {/* left content */}
      <div className='w-full flex mt-32 md:mt-24 flex-col gap-8 md:w-xl'>
        <button className='border border-orange-600 p-2 w-full md:w-72 rounded-3xl text-orange-600 font-semibold'>
          Anuncie com nossos Totens
        </button>

        <h2 className='text-3xl md:text-5xl font-semibold'>
          Seja visto por mais de <span className='text-orange-600'>36% da População de </span>Primavera do Leste - MT
        </h2>

        <p className='text-gray-400 w-96'>
          Produzindo maior engajamento com seu público e sendo lembrado por onde passar!
        </p>

        <a className='bg-orange-600 p-2 w-full md:w-44 rounded-3xl text-white text-center cursor-pointer hover:bg-orange-500 transition duration-300'>
          Anunciar Agora!
        </a>
      </div>

      {/* right content - remover ou completar */}
     <Image 
     src={heroImg}
      alt="Hero Image"
      className="w-xl mt-24"
     />
    </div>
  );
};

export default Hero;
