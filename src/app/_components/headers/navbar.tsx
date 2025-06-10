"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { ModeToggle } from "../mode-toggle";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { NavUser } from "./nav-user";
import Image from "next/image";
import { LayoutDashboard } from "lucide-react";

export default function Navbar({ user }: { user?: any }) {
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

  // Base navigation links
  const baseNavLinks = [
    { name: "Home", href: "#home" },
    { name: "About", href: "#about" },
    { name: "Classes", href: "#classes" },
    { name: "Trainers", href: "#trainers" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <nav
      className={`fixed top-0 z-50 w-full bg-gradient-to-b from-black to-transparent transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/assets/fitinfinity-lime.png"
                alt="FIT INFINITY"
                width={120}
                height={40}
                className="object-contain"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center space-x-8 md:flex">
            {baseNavLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="font-medium text-white transition-colors hover:text-[#BFFF00]"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden items-center space-x-4 md:flex">
            {user ? (
              <NavUser user={user} />
            ) : (
              <div className="flex space-x-4">
                {/* Login Button */}
                <div className="relative flex items-center">
                  <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-none rounded-br-[5px] rounded-tl-none rounded-tr-[5px] bg-[#C9D953]" />
                  <Button
                    variant="outline"
                    className="relative transform overflow-hidden rounded-md border-2 border-[#C9D953] bg-transparent px-5 py-3 font-bold text-[#C9D953] transition duration-200 hover:scale-105 hover:border-[#b6c940] hover:text-[#b6c940] hover:shadow-xl"
                    asChild
                  >
                    <Link href="/api/auth/signin" className="relative z-10">
                      Log in
                    </Link>
                  </Button>
                  <span className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-[5px] rounded-br-none rounded-tl-[5px] rounded-tr-none bg-[#C9D953]" />
                </div>
                {/* Register Button */}
                <div className="relative flex items-center">
                  <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-none rounded-br-[5px] rounded-tl-none rounded-tr-[5px] bg-[#C9D953]" />
                  <Button
                    variant="outline"
                    className="relative transform overflow-hidden rounded-md border-2 border-[#C9D953] bg-transparent px-5 py-3 font-bold text-[#C9D953] transition duration-200 hover:scale-105 hover:border-[#b6c940] hover:text-[#b6c940] hover:shadow-xl"
                    asChild
                  >
                    <Link href="/auth/signup" className="relative z-10">
                      Register
                    </Link>
                  </Button>
                  <span className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-[5px] rounded-br-none rounded-tl-[5px] rounded-tr-none bg-[#C9D953]" />
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-4 md:hidden">
            {user && (
              <Link
                href="/member/dashboard"
                className="rounded-lg bg-[#BFFF00] p-2 text-black hover:bg-[#9FDF00]"
              >
                <LayoutDashboard size={20} />
              </Link>
            )}
            <Button
              onClick={toggleDrawer}
              variant="ghost"
              className="text-white"
            >
              ☰
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <Drawer open={isDrawerOpen} onClose={toggleDrawer}>
        <DrawerContent className="bg-black p-6">
          <div className="mb-8 flex items-center justify-between">
            <span className="text-xl font-bold text-[#BFFF00]">Menu</span>
            <DrawerClose onClick={toggleDrawer} className="text-white">
              &times;
            </DrawerClose>
          </div>
          <div className="flex flex-col space-y-4">
            {baseNavLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="py-2 text-white transition-colors hover:text-[#BFFF00]"
                onClick={toggleDrawer}
              >
                {link.name}
              </Link>
            ))}
            {!user && (
              <div className="flex flex-col space-y-4 pt-4">
                <Button
                  variant="outline"
                  className="w-full border-[#BFFF00] text-[#BFFF00] hover:bg-[#BFFF00] hover:text-black"
                  asChild
                >
                  <Link href="/api/auth/signin">Log in</Link>
                </Button>
                <Button
                  className="w-full bg-[#BFFF00] text-black hover:bg-[#9FDF00]"
                  asChild
                >
                  <Link href="/auth/signup">Register</Link>
                </Button>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </nav>
  );
}
