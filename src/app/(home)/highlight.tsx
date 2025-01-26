import React from "react";
import Cards from "@/components/cards/hightlight_card/cards";

const Highlight = () => {
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="my-24">
        <div className="flex flex-col justify-center items-center text-center">
          <h1 className="text-4xl font-bold text-center mb-6">
            Rekomendasi Konsultan
          </h1>
          <p className="text-center text-lg mb-8">
            We'd love to hear from you. Please fill out the form below or use
            our contact information.
          </p>
        </div>

        <div className="flex md:grid md:grid-cols-4 md:gap-8 overflow-x-auto space-x-4">
          <Cards />
          <Cards />
          <Cards />
          <Cards />
        </div>
      </div>
    </section>
  );
};

export default Highlight;
