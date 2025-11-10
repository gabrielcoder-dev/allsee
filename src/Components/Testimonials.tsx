"use client";

import React from 'react';
import allRede from "@/assets/allrede.png";
import atacadaoImg from "@/assets/atacadao.png";
import boraAli from "@/assets/boraali.jpeg";
import oboticarioImg from "@/assets/oboticario.png";
import sicoobImg from "@/assets/sicoob.png";
import transtermatImg from "@/assets/transtermat.png";
import ttImg from "@/assets/tt.png";
import Image from "next/image";

const logos = [
  { src: allRede, alt: "allRede", className: "w-40" },
  { src: atacadaoImg, alt: "atacadao", className: "w-40" },
  { src: boraAli, alt: "boraAli", className: "rounded-2xl w-20 h-20" },
  { src: oboticarioImg, alt: "oboticario", className: "w-40" },
  { src: sicoobImg, alt: "sicoob", className: "w-40" },
  { src: transtermatImg, alt: "transtermat", className: "w-40" },
  { src: ttImg, alt: "ttImg", className: "rounded-2xl w-40" },
];

const Testimonials = () => {
  return (
    <section className="py-16">
      <div className="landing-container space-y-8">
        <div className="text-center">
          <h3 className="text-xl md:text-2xl font-semibold text-gray-800">
            Alguns dos nossos clientes
          </h3>
        </div>
        <div className="carousel-container">
          <div className="carousel-track">
            {[...logos, ...logos].map((logo, index) => (
              <Image
                key={`${logo.alt}-${index}`}
                alt={logo.alt}
                src={logo.src}
                className={`carousel-image ${logo.className}`}
                loading={index < logos.length ? "eager" : "lazy"}
              />
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        .carousel-container {
          overflow: hidden;
          width: 100%;
          mask-image: linear-gradient(
            to right,
            transparent 0%,
            rgba(0, 0, 0, 1) 10%,
            rgba(0, 0, 0, 1) 90%,
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            rgba(0, 0, 0, 1) 10%,
            rgba(0, 0, 0, 1) 90%,
            transparent 100%
          );
        }

        .carousel-track {
          display: flex;
          align-items: center;
          gap: clamp(60px, 8vw, 140px);
          width: max-content;
          animation: marquee 22s linear infinite;
        }

        .carousel-track:hover {
          animation-play-state: paused;
        }

        .carousel-image {
          flex-shrink: 0;
          filter: grayscale(100%);
          opacity: 0.85;
          transition: opacity 0.3s ease, filter 0.3s ease, transform 0.3s ease;
        }

        .carousel-image:hover {
          filter: grayscale(0%);
          opacity: 1;
          transform: scale(1.02);
        }

        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @media (max-width: 768px) {
          .carousel-track {
            gap: clamp(40px, 12vw, 80px);
            animation-duration: 16s;
          }
        }

        @media (max-width: 480px) {
          .carousel-track {
            gap: clamp(24px, 10vw, 60px);
            animation-duration: 12s;
          }
        }
      `}</style>
    </section>
  );
};

export default Testimonials;
