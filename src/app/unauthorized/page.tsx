"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
      <h1 className="text-6xl font-bold mb-4">401</h1>
      <p className="text-xl mb-8">You don't have permission to access this page.</p>
      <Button onClick={() => router.push("/")} className="bg-infinity">
        Return to Dashboard
      </Button>
    </div>
  );
}
