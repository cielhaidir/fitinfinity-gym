"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";


export default function UnauthorizedPage() {
  const router = useRouter();

  const handleLogoutAndClearCache = async () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
          });
        });
      }
    }
      await signOut({ 
      callbackUrl: "/login",
      redirect: true 
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
      <h1 className="text-6xl font-bold mb-4">401</h1>
      <p className="text-xl mb-8">You don't have permission to access this page.</p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button onClick={() => router.push("/")} className="bg-infinity">
          Return to Dashboard
        </Button>
        <Button onClick={handleLogoutAndClearCache} variant="outline">
          Logout & Clear Cache
        </Button>
      </div>
    </div>
  );
}
