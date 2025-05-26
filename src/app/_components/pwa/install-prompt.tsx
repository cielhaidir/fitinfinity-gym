"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react"; // pastikan kamu pakai lucide-react (bawaan shadcn/ui)

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleClose = () => {
    setShowInstallBanner(false);
  };

  if (!showInstallBanner) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white border border-gray-300 rounded-xl p-4 shadow-xl z-50">
      <div className="flex justify-between items-start">
        <div className="text-sm text-gray-700 pr-4">
          Install <strong>Fitinifnity App</strong> untuk pengalaman lebih baik.
        </div>
        <button onClick={handleClose} className="text-gray-500 hover:text-gray-800">
          <X size={18} />
        </button>
      </div>
      <div className="mt-3 text-right">
        <Button
          onClick={handleInstallClick}
          className="bg-infinity text-white px-4 py-2 rounded"
        >
          Pasang Sekarang
        </Button>
      </div>
    </div>
  );
}
