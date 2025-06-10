import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const Services = () => {
  return (
    <main className="container mx-auto">
      <div className="m-4 p-4">
        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="mb-6 text-center text-4xl font-bold">
            Layanan Khusus
          </h1>
          <p className="mb-8 text-center text-lg">
            We'd love to hear from you. Please fill out the form below or use
            our contact information.
          </p>
        </div>

        <div className="mt-12 flex justify-center">
          <div className="grid md:grid-cols-2 md:gap-96">
            <div className="items-center text-center">
              <div className="rounded-xl border-2 border-secondary px-24 py-16">
                <Image
                  src={"/img/Chart.svg"}
                  alt="chart"
                  width={"120"}
                  height={"120"}
                />
              </div>
              <Button className="font-inter my-8 rounded-xl border-secondary bg-gray-900 px-12 py-6 text-white dark:bg-white dark:text-gray-900">
                Konsultasi Statistik
              </Button>
            </div>
            <div className="items-center text-center">
              <div className="rounded-xl border-2 border-secondary px-24 py-16">
                <Image
                  src={"/img/visual.svg"}
                  alt="chart"
                  width={"120"}
                  height={"120"}
                />
              </div>
              <Button className="font-inter my-8 rounded-xl border-secondary bg-gray-900 px-12 py-6 text-white dark:bg-white dark:text-gray-900">
                Analisis Data
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center text-center">
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
