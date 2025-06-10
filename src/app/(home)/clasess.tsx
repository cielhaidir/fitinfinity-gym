// (home)/classes.tsx
import React from "react";
import Image from "next/image";

const Classes = () => {
  const classes = [
    {
      title: "Regular Gym",
      description: "Join our dream body and the powerful strength",
      image: "/assets/class/regular.png",
    },
    {
      title: "Zumba Class",
      description: "Join our dream body and the powerful strength",
      image: "/assets/class/zumba.png",
    },
    {
      title: "Yoga Class",
      description: "Join our dream body and the powerful strength",
      image: "/assets/class/yoga.png",
    },
    {
      title: "Regular Gym",
      description: "Join our dream body and the powerful strength",
      image: "/assets/class/regular.png",
    },
  ];

  return (
    <section className="bg-black py-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-12 text-3xl font-bold text-[#BFFF00]">
          Explore Our Class
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {classes.map((cls, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-lg"
            >
              <div className="aspect-w-16 aspect-h-9 relative h-[300px]">
                <Image
                  src={cls.image}
                  alt={cls.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              </div>
              <div className="absolute bottom-0 w-full p-4">
                <h3 className="mb-2 text-xl font-bold text-white">
                  {cls.title}
                </h3>
                <p className="text-sm text-gray-200">{cls.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Classes;
