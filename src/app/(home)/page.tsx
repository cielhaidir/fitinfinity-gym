import Link from "next/link";
import { auth } from "@/server/auth";
import { HydrateClient } from "@/trpc/server";
import Navbar from "@/components/headers/navbar";
import Hero from "./hero";
import Classes from "./clasess";
import Facilities from "./facilities";
import Footer from "@/components/footer/footer";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <main className="bg-black text-white">
        <Navbar user={session?.user ?? undefined}/>
        <Hero />
        <Classes />
        <Facilities />
        <Footer />
      </main>
    </HydrateClient>
  );
}
