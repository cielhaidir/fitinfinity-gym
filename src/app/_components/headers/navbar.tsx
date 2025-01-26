"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
// import { Drawer, DrawerContent, DrawerClose } from "";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { ModeToggle } from "../mode-toggle";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { NavUser } from "./nav-user";

export default function Navbar({ user }: { user?: any; }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const handleScroll = () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY > lastScrollY) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }

    setLastScrollY(currentScrollY);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <nav
      className={`fixed top-0 z-50 w-full bg-white p-4 shadow-md transition-transform duration-300 dark:bg-slate-900 ${isVisible ? "translate-y-0 transform" : "-translate-y-full transform"
        }`}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="text-xl font-bold text-gray-600 dark:text-gray-200">
          <a href="/">FIT INFINITY</a>
        </div>

        <div className="hidden space-x-8 md:flex">
          <a
            href="#services"
            className="text-gray-600 hover:text-blue-800 dark:text-gray-200 dark:hover:text-blue-800"
          >
            Layanan
          </a>
          
          {
            user && (
              <a
                href="admin/dashboard"
                className="text-gray-600 hover:text-blue-800 dark:text-gray-200 dark:hover:text-blue-800"
              >
                Dashboard
              </a>
            ) 
          }
        </div>

        <div className="hidden items-center space-x-4 md:flex">
          {user ? <NavUser user={user} /> : (
            <Button
              className="rounded border border-gray-300 text-gray-100"
              asChild
            >
              {/* <Link href="/login">Login</Link> */}
              <Link href="/api/auth/signin">Login</Link>
            </Button>
          )}
          <ModeToggle />
        </div>

        <div className="md:hidden flex items-center space-x-4">
          <Button onClick={toggleDrawer} variant="ghost">
            ☰
          </Button>
          <NavUser user={user} />
        </div>
      </div>

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
            {user ? <></> : (
            <Button
              className="rounded border border-gray-300 text-gray-100"
              asChild
            >
              <Link href="/auth/sign-in">Login</Link>
            </Button>
          )}
          </div>
        </DrawerContent>
      </Drawer>
    </nav>
  );
}
