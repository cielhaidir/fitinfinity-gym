import React from "react";
import Cards from "@/components/cards/article_cards/cards";

const Article = () => {
  return (
    <section className="container mx-auto px-4 ">
      <div className="my-12">
        <div className="my-12 px-12">
          <div className="flex flex-col md:justify-start justify-center md:items-start items-center text-center">
            <h2 className="text-3xl font-bold">Artikel dan Edukasi</h2>
          </div>
        </div>

        <div className="flex md:grid md:grid-cols-4 md:gap-8 overflow-x-auto space-x-4 md:px-24">
          <Cards />
          <Cards />
          <Cards />
          <Cards />
        </div>
      </div>
    </section>
  );
};

export default Article;
