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
      className={`fixed top-0 z-50 w-full transition-transform duration-300 bg-gradient-to-b from-black to-transparent ${
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
          <div className="hidden md:flex items-center space-x-8">
            {baseNavLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-white hover:text-[#BFFF00] transition-colors font-semibold"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <NavUser user={user} />
            ) : (
              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  className="border-[#BFFF00] text-[#BFFF00] hover:bg-[#BFFF00] hover:text-black"
                  asChild
                >
                  <Link href="/api/auth/signin">Log in</Link>
                </Button>
                <Button
                  className="bg-[#BFFF00] text-black hover:bg-[#9FDF00]"
                  asChild
                >
                  <Link href="/register">Register</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            {user && (
              <Link
                href="/member/dashboard"
                className="bg-[#BFFF00] text-black p-2 rounded-lg hover:bg-[#9FDF00]"
              >
                <LayoutDashboard size={20} />
              </Link>
            )}
            <Button onClick={toggleDrawer} variant="ghost" className="text-white">
              ☰
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <Drawer open={isDrawerOpen} onClose={toggleDrawer}>
        <DrawerContent className="bg-black p-6">
          <div className="flex items-center justify-between mb-8">
            <span className="text-xl font-bold text-[#BFFF00]">Menu</span>
            <DrawerClose onClick={toggleDrawer} className="text-white">&times;</DrawerClose>
          </div>
          <div className="flex flex-col space-y-4">
            {baseNavLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-white hover:text-[#BFFF00] transition-colors py-2"
                onClick={toggleDrawer}
              >
                {link.name}
              </Link>
            ))}
            {!user && (
              <div className="flex flex-col space-y-4 pt-4">
                <Button
                  variant="outline"
                  className="border-[#BFFF00] text-[#BFFF00] hover:bg-[#BFFF00] hover:text-black w-full"
                  asChild
                >
                  <Link href="/api/auth/signin">Log in</Link>
                </Button>
                <Button
                  className="bg-[#BFFF00] text-black hover:bg-[#9FDF00] w-full"
                  asChild
                >
                  <Link href="/register">Register</Link>
                </Button>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </nav>
  );
}
