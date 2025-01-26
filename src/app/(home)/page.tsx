import Link from "next/link";

import { LatestPost } from "@/components/post";
import { auth } from "@/server/auth";
import { api, HydrateClient } from "@/trpc/server";
import Navbar from "@/components/headers/navbar";
import Hero from "./hero";
import Services from "./services";
import Highlight from "./highlight";
import Article from "./article";
import Contact from "./contact";
import Footer from "@/components/footer/footer";


export default async function Home() {

  const session = await auth();

  return (
    <HydrateClient>
      <main className="">
      <Navbar user={session?.user ?? undefined}/>
      <Hero />
      {/* <Services />
      <Highlight />
      <Article />
      <Contact />
      <Footer /> */}
      </main>
    </HydrateClient>
  );
}
