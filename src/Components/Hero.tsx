import Image from "next/image";
import heroImg from "@/assets/hero-img.png"

const Hero = () => {
  return (
    <section className="relative overflow-hidden pt-32 pb-16 lg:pt-40 lg:pb-24" id="home">
      <div className="landing-container relative flex flex-col-reverse items-center gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-28">
        <div className="pointer-events-none absolute -z-10 w-[380px] h-[380px] -top-24 -left-10 rounded-full bg-orange-200 blur-3xl opacity-60 sm:w-[420px] sm:h-[420px] sm:-left-12 lg:w-[500px] lg:h-[500px] lg:-left-16 xl:w-[540px] xl:h-[540px] xl:-left-12"></div>

        {/* Conteúdo esquerdo */}
        <div className="w-full max-w-[28rem] lg:max-w-[26rem] xl:max-w-[27rem] flex flex-col gap-6">
          <button className="inline-flex w-full items-center justify-center border border-orange-600 px-5 py-3 rounded-3xl text-orange-600 font-semibold text-sm sm:text-base lg:text-base lg:w-auto lg:justify-start lg:px-6 lg:py-2.5">
            Anuncie com nossos Totens
          </button>

          <h2 className="text-3xl sm:text-[2.4rem] lg:text-[2.9rem] xl:text-[3.1rem] font-semibold leading-tight text-gray-900">
            Anuncie onde os seus clientes <span className="text-orange-600">moram, trabalham e passam</span> todos os dias.
          </h2>

          <p className="text-gray-500 text-base sm:text-lg lg:text-base xl:text-lg">
            Produzindo maior engajamento com seu público e sendo lembrado por onde passar!
          </p>

          <a
            href="/results"
            className="inline-flex w-full sm:w-auto items-center justify-center bg-orange-600 px-6 py-3 sm:px-8 sm:py-3.5 lg:px-10 lg:py-4 rounded-3xl text-white text-base sm:text-lg font-semibold cursor-pointer hover:bg-orange-500 transition duration-300 shadow-md"
          >
            Anunciar Agora!
          </a>
        </div>

        {/* Conteúdo direito - imagem hero */}
        <div className="w-full max-w-lg md:max-w-xl lg:max-w-[34rem] xl:max-w-[40rem] 2xl:max-w-[46rem]">
          <Image
            src={heroImg}
            alt="Imagem Hero"
            className="w-full h-auto object-contain drop-shadow-xl"
            priority
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
