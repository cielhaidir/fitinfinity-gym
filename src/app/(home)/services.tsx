import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const Services = () => {
  return (
    <main className="container mx-auto">
      <div className="m-4 p-4">
        <div className="flex flex-col justify-center items-center text-center">
          <h1 className="text-4xl font-bold text-center mb-6">
            Layanan Khusus
          </h1>
          <p className="text-center text-lg mb-8">
            We'd love to hear from you. Please fill out the form below or use
            our contact information.
          </p>
        </div>

        <div className="flex justify-center mt-12">
          <div className="grid md:grid-cols-2 md:gap-96">
            <div className=" items-center text-center">
              <div className="rounded-xl border-secondary border-2 py-16 px-24 ">
                <Image
                  src={"/img/Chart.svg"}
                  alt="chart"
                  width={"120"}
                  height={"120"}
                />
              </div>
              <Button className="rounded-xl border-secondary dark:bg-white bg-gray-900 text-white dark:text-gray-900 font-inter my-8 py-6 px-12">
                Konsultasi Statistik
              </Button>
            </div>
            <div className="items-center text-center">
              <div className="rounded-xl border-secondary py-16 px-24 border-2">
                <Image
                  src={"/img/visual.svg"}
                  alt="chart"
                  width={"120"}
                  height={"120"}
                />
              </div>
              <Button className="rounded-xl border-secondary dark:bg-white bg-gray-900 text-white dark:text-gray-900 font-inter my-8 py-6 px-12">
                Analisis Data
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center items-center text-center">
          <p>
            "Dapatkan bimbingan profesional dalam analisis data, penanganan
            statistik, dan konsultasi berbasis data untuk penelitian, bisnis,
            dan pengambilan keputusan."
          </p>
        </div>
      </div>
    </main>
  );
};

export default Services;
