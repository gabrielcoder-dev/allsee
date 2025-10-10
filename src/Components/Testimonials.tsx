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

const Testimonials = () => {
  return (
    <div className="carousel-container my-16">
      <div className="carousel-wrapper flex items-center">
        <div className="carousel-slide flex items-center gap-[150px]">
          <Image alt='allRede' src={allRede} className="carousel-image w-40" />
          <Image alt='atacadao' src={atacadaoImg} className="carousel-image w-40" />
          <Image alt='boraAli' src={boraAli} className="carousel-image rounded-2xl w-20 h-20" />
          <Image alt='oboticario' src={oboticarioImg} className="carousel-image w-40" />
          <Image alt='sicoob' src={sicoobImg} className="carousel-image w-40" />
          <Image alt='transtermat' src={transtermatImg} className="carousel-image w-40" />
          <Image alt='ttImg' src={ttImg} className="carousel-image rounded-2xl w-40" />
          <Image alt='allRede' src={allRede} className="carousel-image w-40" />
          <Image alt='atacadao' src={atacadaoImg} className="carousel-image w-40" />
          <Image alt='boraAli' src={boraAli} className="carousel-image rounded-2xl w-20 h-20" />
          <Image alt='oboticario' src={oboticarioImg} className="carousel-image w-40" />
          <Image alt='sicoob' src={sicoobImg} className="carousel-image w-40" />
          <Image alt='transtermat' src={transtermatImg} className="carousel-image w-40" />
          <Image alt='ttImg' src={ttImg} className="carousel-image rounded-2xl w-40" />
        </div>
      </div>
      <style jsx>{`
        .carousel-container {
          overflow: hidden;
          width: 100%;
        }

        .carousel-wrapper {
          display: flex;
          width: 200%; /* Double the width */
          animation: slide 30s linear infinite; /* Desktop animation */
        }

        .carousel-slide {
          display: flex;
          width: auto;
          gap: 100px; 
        }

        .carousel-image {
          flex-shrink: 0;
          margin: 0 120px;
        }

        @keyframes slide {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%); /* Move by 50% */
          }
        }

        /* Faster animation for mobile */
        @media (max-width: 768px) {
          .carousel-wrapper {
            animation: slide 15s linear infinite; /* Faster for mobile */
          }
          
          .carousel-slide {
            gap: 50px; /* Smaller gap on mobile */
          }
          
          .carousel-image {
            margin: 0 40px; /* Smaller margins on mobile */
          }
        }

        /* Even faster for very small screens */
        @media (max-width: 480px) {
          .carousel-wrapper {
            animation: slide 12s linear infinite; /* Even faster for small mobile */
          }
          
          .carousel-slide {
            gap: 30px; /* Even smaller gap */
          }
          
          .carousel-image {
            margin: 0 20px; /* Even smaller margins */
          }
        }
      `}</style>
    </div>
  );
};

export default Testimonials;
