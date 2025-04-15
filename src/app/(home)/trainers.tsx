// (home)/trainers.tsx
import React from "react";
import Image from "next/image";

const Trainers = () => {
  const trainers = [
    {
      name: "Christopher Azwar",
      quote: "Stronger every day, one rep at a time.",
      image: "/images/trainer-1.jpg"
    },
    {
      name: "Leo Blaze",
      quote: "The only limit is the one you refuse to break.",
      image: "/images/trainer-2.jpg"
    },
    {
      name: "Zane Titan",
      quote: "Train hard, stay consistent, see results.",
      image: "/images/trainer-3.jpg"
    },
    {
      name: "Taylor Key",
      quote: "Sweat, grind, conquer.",
      image: "/images/trainer-4.jpg"
    },
    {
      name: "Mason Steel",
      quote: "Discipline builds strength, strength builds character.",
      image: "/images/trainer-5.jpg"
    }
  ];

  return (
    <section className="bg-black py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-12 text-[#BFFF00]">
          Explore Our Personal Trainer
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {trainers.map((trainer, index) => (
            <div key={index} className="group relative overflow-hidden rounded-lg">
              <div className="aspect-w-3 aspect-h-4 relative h-[400px]">
                <Image
                  src={trainer.image}
                  alt={trainer.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
              </div>
              <div className="absolute bottom-0 p-4 w-full">
                <h3 className="text-xl font-bold text-white mb-2">{trainer.name}</h3>
                <p className="text-gray-200 text-sm italic">"{trainer.quote}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Trainers;