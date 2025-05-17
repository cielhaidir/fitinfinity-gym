"use client"

import React from "react";
import Image from "next/image";
import { api } from "@/trpc/react";

const PersonalTrainerPage = () => {
  // Fetch active personal trainers using authenticated endpoint
  const { data: trainers, isLoading } = api.personalTrainer.getActiveTrainers.useQuery();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Personal Trainers</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 h-[400px] rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Personal Trainers</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {trainers?.map((trainer) => (
          <div key={trainer.id} className="group relative overflow-hidden rounded-lg shadow-lg transition-all duration-500 hover:shadow-2xl hover:shadow-[#BFFF00]/20">
            <div className="aspect-w-3 aspect-h-4 relative h-[400px]">
              <Image
                src={trainer.image || trainer.user.image || "/images/default-trainer.jpg"}
                alt={trainer.user.name || "Personal Trainer"}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
                unoptimized={true}
              />
              {/* Burning effect layers */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80 transition-all duration-500 group-hover:from-transparent group-hover:via-transparent group-hover:to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-black/90 transition-all duration-500 group-hover:from-transparent group-hover:via-transparent group-hover:to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-100 transition-all duration-500 group-hover:opacity-0" />
              
              {/* Burning glow effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#BFFF00]/0 via-[#BFFF00]/0 to-[#BFFF00]/0 transition-all duration-500 group-hover:from-[#BFFF00]/20 group-hover:via-[#BFFF00]/10 group-hover:to-[#BFFF00]/5" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#BFFF00]/0 via-[#BFFF00]/0 to-[#BFFF00]/0 transition-all duration-500 group-hover:from-[#BFFF00]/20 group-hover:via-[#BFFF00]/10 group-hover:to-[#BFFF00]/5" />
            </div>
            <div className="absolute bottom-0 p-4 w-full transform transition-all duration-500 group-hover:translate-y-[-8px]">
              <h3 className="text-xl font-bold text-white mb-2 transition-all duration-500 group-hover:text-[#BFFF00]">{trainer.user.name}</h3>
              <p className="text-gray-200 text-sm italic mb-3 transition-all duration-500 group-hover:text-white">"{trainer.description || 'No description available'}"</p>
              {trainer.expertise && (
                <p className="text-gray-300 text-sm transition-all duration-500 group-hover:text-white">Expertise: {trainer.expertise}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonalTrainerPage;
