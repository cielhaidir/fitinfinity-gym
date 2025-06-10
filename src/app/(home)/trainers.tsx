"use client";

// (home)/trainers.tsx
import React from "react";
import Image from "next/image";
import { api } from "@/trpc/react";

const Trainers = () => {
  // Fetch active personal trainers using public endpoint
  const { data: trainers, isLoading } =
    api.personalTrainer.getActiveTrainers.useQuery();

  if (isLoading) {
    return (
      <section className="bg-black py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-3xl font-bold text-[#BFFF00]">
            Explore Our Personal Trainer
          </h2>
          <div className="flex space-x-6 overflow-x-auto pb-4">
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                className="w-[300px] flex-shrink-0 animate-pulse"
              >
                <div className="h-[400px] rounded-lg bg-gray-800"></div>
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
        <h2 className="mb-12 text-3xl font-bold text-[#BFFF00]">
          Explore Our Personal Trainer
        </h2>

        <div className="flex space-x-6 overflow-x-auto pb-4">
          {trainers?.map((trainer) => (
            <div
              key={trainer.id}
              className="group relative w-[300px] flex-shrink-0 overflow-hidden rounded-lg"
            >
              <div className="aspect-w-3 aspect-h-4 relative h-[400px]">
                <Image
                  src={
                    trainer.image ||
                    trainer.user.image ||
                    "/images/default-trainer.jpg"
                  }
                  alt={trainer.user.name || "Personal Trainer"}
                  fill
                  sizes="(max-width: 300px) 100vw, 300px"
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  unoptimized={true}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
              </div>
              <div className="absolute bottom-0 w-full p-4">
                <h3 className="mb-2 text-xl font-bold text-white">
                  {trainer.user.name}
                </h3>
                <p className="text-sm italic text-gray-200">
                  "{trainer.description || "No description available"}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Trainers;
