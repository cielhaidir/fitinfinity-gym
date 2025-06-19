"use client";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "../ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { NavUser } from "./nav-user";
import { Download } from "lucide-react";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DynamicBreadcrumb } from "./dynamic-breadcrumb";

import { ModeToggle } from "../mode-toggle";

export default function AppNavbar() {
  const { data: session } = useSession();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const handleLogout = () => {
    signOut();
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
      setIsInstallable(false);
    } else {
      console.log("User dismissed the install prompt");
    }

    setDeferredPrompt(null);
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <DynamicBreadcrumb />
      {/* Login/Logout Button */}
      <div className="ml-auto flex items-center space-x-4">
        {isInstallable && (
          <Button
            onClick={handleInstallClick}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Install App</span>
          </Button>
        )}
        {/* Tampilkan NavUser jika user login */}
        {session?.user?.name && session.user.email ? (
          <NavUser
            user={{
              name: session.user.name,
              email: session.user.email,
              image: session.user.image ?? "",
            }}
          />
        ) : (
          <Button onClick={handleLogout} className="rounded border bg-infinity">
            Logout
          </Button>
        )}
        <ModeToggle />
      </div>
    </header>
  );
}
