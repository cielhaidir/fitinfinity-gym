"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
      <p className="text-lg text-center mb-8">
        You don't have permission to access this page.
      </p>
      <Button onClick={() => router.push("/")} className="bg-infinity">
        Return to Dashboard
      </Button>
    </div>
  );
}