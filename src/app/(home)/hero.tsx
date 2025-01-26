import React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const Hero = () => {
  return (
    <>
      <section className="relative text-gray-600 dark:text-white py-16 sm:py-24 lg:py-32">
        <div className="container mx-auto px-6 flex flex-col-reverse items-center lg:flex-row lg:items-center lg:justify-between space-y-8 lg:space-y-0 lg:space-x-8">
          {/* Text Section */}
          <div className="text-center lg:text-left lg:w-1/2 space-y-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Selamat Datang di Analytix
            </h1>
            <p className="text-base sm:text-lg lg:text-xl">
              Solusi terbaik untuk konsultasi dan layanan keuangan Anda.
            </p>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
              <Button
                size="lg"
                className="text-white bg-blue-600 hover:bg-gray-200 rounded-xl"
              >
                Mulai Sekarang
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-blue-600 dark:border-white text-blue-600 dark:text-white hover:bg-white hover:text-blue-600 rounded-xl"
              >
                Pelajari Lebih Lanjut
              </Button>
            </div>
          </div>

          {/* Image Section */}
          <div className="lg:w-1/2 justify-center flex">
            <Image
              src="/img/analytik.svg" // path ke gambar hero
              alt="Ilustrasi Hero"
              width={500}
              height={500}
              className="rounded-lg mx-auto lg:mx-0"
              priority
            />
          </div>
        </div>

        {/* Background Decoration */}
      </section>
    </>
  );
};

export default Hero;
