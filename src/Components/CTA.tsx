export default function Cta() {
  return (
    <section
      className="w-full mb-12 mt-10 bg-white py-12"
      id="contato"
    >
      <div className="landing-container flex justify-center">
        <div className="text-center bg-orange-50 w-full max-w-2xl md:max-w-3xl lg:max-w-4xl py-10 md:py-16 px-4 sm:px-8 md:px-10 lg:px-16 rounded-lg flex flex-col items-center gap-6 shadow">
        {/* Subtítulo */}
        <p className="text-orange-600 uppercase font-semibold tracking-widest text-center text-sm md:text-base lg:text-lg mb-3">
          Anuncie na maior empresa de Marketing Indoor de Primavera do Leste
        </p>

        {/* Título */}
        <h2 className="text-lg md:text-3xl lg:text-5xl font-bold text-black mb-6">
          Gostou e quer saber mais informações? Fale com a gente.
        </h2>

        {/* Botão */}
        <a
          href="https://wa.me/5566999999999"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-orange-600 w-full max-w-xs md:max-w-md lg:max-w-lg text-center text-xl hover:bg-orange-500 text-white font-semibold py-4 md:py-5 px-4 md:px-10 rounded-3xl transition duration-300 cursor-pointer"
        >
          Fale com a gente pelo WhatsApp
        </a>
        </div>
      </div>
    </section>
  );
}
