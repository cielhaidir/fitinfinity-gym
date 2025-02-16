"use client";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "../ui/sidebar";
import { Separator } from "@/components/ui/separator";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DynamicBreadcrumb } from "./dynamic-breadcrumb";

import { ModeToggle } from "../mode-toggle";

export default function AppNavbar() {
  const { data: session } = useSession();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const router = useRouter();
  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const handleLogout = () => {
    signOut();
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <DynamicBreadcrumb />
      {/* Login/Logout Button */}
      <div className="ml-auto flex space-x-4">
        <div className="hidden md:block">
          <Button onClick={handleLogout} className="bg-infinity rounded border">
            Logout
          </Button>
        </div>
        <ModeToggle />
      </div>
    </header>
  );
}
