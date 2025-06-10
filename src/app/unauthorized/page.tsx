"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-4 text-3xl font-bold">Access Denied</h1>
      <p className="mb-8 text-center text-lg">
        You don't have permission to access this page.
      </p>
      <Button onClick={() => router.push("/")} className="bg-infinity">
        Return to Dashboard
      </Button>
    </div>
  );
}
