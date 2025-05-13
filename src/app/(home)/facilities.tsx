// (home)/facilities.tsx
import React from "react";
import Image from "next/image";

const Facilities = () => {
  const facilities = [
    {
      name: "Cardio Area",
      description: "Stronger every day, one rep at a time.",
      image: "/assets/facilities/cardio.png"
    },
    {
      name: "Shower Room",
      description: "Stronger every day, one rep at a time.",
      image: "/assets/facilities/shower.png"
    },
    {
      name: "Secure Locker Room",
      description: "Stronger every day, one rep at a time.",
      image: "/assets/facilities/securelock.png"
    },
    {
      name: "Free Weight Room",
      description: "Stronger every day, one rep at a time.",
      image: "/assets/facilities/weight.png"
    }
  ];

  return (
    <section className="bg-black py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-12 text-[#BFFF00]">
          Explore Our Facility
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {facilities.map((facility, index) => (
            <div key={index} className="group relative overflow-hidden rounded-lg">
              <div className="aspect-w-16 aspect-h-9 relative h-[300px]">
                <Image
                  src={facility.image}
                  alt={facility.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              </div>
              <div className="absolute bottom-0 p-4 w-full">
                <h3 className="text-xl font-bold text-white mb-2">{facility.name}</h3>
                <p className="text-gray-200 text-sm">"{facility.description}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Facilities;