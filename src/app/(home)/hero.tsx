import React from "react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative h-screen">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: "url('/assets/landingpage-hero.png')",
          filter: "brightness(0.7)"
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center items-start container mx-auto px-6">
        <div className="max-w-2xl">
          <h1 className="text-6xl font-bold mb-4 text-white">
            FORCE YOUR
            <br />
            <span className="text-[#BFFF00]">LEGACY</span>
          </h1>
          <p className="text-lg text-gray-200 mb-8">
            "Your legacy awaits. Are you ready to forge it?"
          </p>
          <Button 
            className="bg-[#BFFF00] text-black hover:bg-[#9FDF00] px-8 py-6 text-lg font-semibold"
          >
            Get Started
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
