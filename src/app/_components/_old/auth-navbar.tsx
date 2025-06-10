"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "../mode-toggle";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { useSession, signOut } from "next-auth/react";
import { SidebarTrigger } from "../ui/sidebar";

export default function AuthNavbar() {
  const { data: session } = useSession();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const router = useRouter();
  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const handleLogin = () => {
    router.push("/login");
  };

  const handleLogout = () => {
    signOut();
  };

  return (
    <nav className="z-0 bg-white p-4 shadow-md dark:bg-slate-900">
      <div className="container mx-auto flex items-center justify-between">
        {/* Mode Toggle */}
        <div className="hidden items-center space-x-4 md:flex">
          {/* <SidebarTrigger /> */}
        </div>

        {/* Login/Logout Button */}
        <div className="hidden items-center space-x-4 md:flex">
          {session ? (
            <Button
              onClick={handleLogout}
              className="rounded border border-gray-300 text-gray-100"
            >
              Logout
            </Button>
          ) : (
            <Button
              onClick={handleLogin}
              className="rounded border border-gray-300 text-gray-100"
            >
              Login
            </Button>
          )}
          <ModeToggle />
        </div>

        {/* Hamburger Menu for Mobile */}
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
      </div>

      {/* Mobile Sidebar Drawer */}
      <Drawer open={isDrawerOpen} onClose={toggleDrawer}>
        <DrawerContent>
          <div className="flex items-center justify-between p-4">
            <div className="text-xl font-bold">Menu</div>
            <DrawerClose onClick={toggleDrawer}>&times;</DrawerClose>
          </div>
          <div className="space-y-4 p-4">
            <a
              href="/layanan"
              className="block text-gray-600 hover:text-gray-800"
            >
              Layanan
            </a>
            <a
              href="/konsultan"
              className="block text-gray-600 hover:text-gray-800"
            >
              Konsultan
            </a>
            <a
              href="/artikel"
              className="block text-gray-600 hover:text-gray-800"
            >
              Artikel
            </a>
            <a
              href="/kontak"
              className="block text-gray-600 hover:text-gray-800"
            >
              Kontak
            </a>
            {session ? (
              <>
                <span className="block text-gray-600 dark:text-gray-200">
                  Welcome, User
                </span>
                <Button
                  onClick={handleLogout}
                  className="w-full rounded border border-gray-300 text-gray-100"
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button
                onClick={handleLogin}
                className="w-full rounded border border-gray-300 text-gray-100"
              >
                Login
              </Button>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </nav>
  );
}
