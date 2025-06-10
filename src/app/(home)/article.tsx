import React from "react";
import Cards from "@/components/cards/article_cards/cards";

const Article = () => {
  return (
    <section className="container mx-auto px-4">
      <div className="my-12">
        <div className="my-12 px-12">
          <div className="flex flex-col items-center justify-center text-center md:items-start md:justify-start">
            <h2 className="text-3xl font-bold">Artikel dan Edukasi</h2>
          </div>
        </div>

        <div className="flex space-x-4 overflow-x-auto md:grid md:grid-cols-4 md:gap-8 md:px-24">
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
