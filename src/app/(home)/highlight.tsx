import React from "react";
import Cards from "@/components/cards/hightlight_card/cards";

const Highlight = () => {
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="my-24">
        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="mb-6 text-center text-4xl font-bold">
            Rekomendasi Konsultan
          </h1>
          <p className="mb-8 text-center text-lg">
            We'd love to hear from you. Please fill out the form below or use
            our contact information.
          </p>
        </div>

        <div className="flex space-x-4 overflow-x-auto md:grid md:grid-cols-4 md:gap-8">
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
