"use client"

// (home)/trainers.tsx
import React from "react";
import Image from "next/image";
import { api } from "@/trpc/react";

const Trainers = () => {
  // Fetch active personal trainers using public endpoint
  const { data: trainers, isLoading } = api.personalTrainer.getActiveTrainers.useQuery();

  if (isLoading) {
    return (
      <section className="bg-black py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-[#BFFF00]">
            Explore Our Personal Trainer
          </h2>
          <div className="flex overflow-x-auto space-x-6 pb-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="animate-pulse flex-shrink-0 w-[300px]">
                <div className="bg-gray-800 h-[400px] rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-black py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-12 text-[#BFFF00]">
          Explore Our Personal Trainer
        </h2>
        
        <div className="flex overflow-x-auto space-x-6 pb-4">
          {trainers?.map((trainer) => (
            <div key={trainer.id} className="group relative overflow-hidden rounded-lg flex-shrink-0 w-[300px]">
              <div className="aspect-w-3 aspect-h-4 relative h-[400px]">
                <Image
                  src={trainer.image || trainer.user.image || "/images/default-trainer.jpg"}
                  alt={trainer.user.name || "Personal Trainer"}
                  fill
                  sizes="(max-width: 300px) 100vw, 300px"
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  unoptimized={true}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
              </div>
              <div className="absolute bottom-0 p-4 w-full">
                <h3 className="text-xl font-bold text-white mb-2">{trainer.user.name}</h3>
                <p className="text-gray-200 text-sm italic">"{trainer.description || 'No description available'}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Trainers;