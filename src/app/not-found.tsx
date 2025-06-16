"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-xl mb-8">This page could not be found.</p>
      <Button onClick={() => router.push("/")} className="bg-infinity">
        Back to Home
      </Button>
    </div>
  );
}