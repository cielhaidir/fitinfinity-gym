import type * as React from "react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SearchForm } from "./search-form";
import { VersionSwitcher } from "./version-switcher";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { Menu as data } from "@/lib/menu";
import { useRouter } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { title } from "process";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
// This is sample data.


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const handleLogout = () => {
    signOut();
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-center py-5">
          <a href="/">
            <Image
              src="/assets/fitinfinity-lime.png"
              alt="Logo"
              width={150}
              height={150}
            />
          </a>
        </div>
        {/* <VersionSwitcher versions={data.versions} defaultVersion={data.versions[0] || "1.0.0"} /> */}
        {/* <SearchForm /> */}

        <SearchForm setOpen={setOpen} />

      </SidebarHeader>
      <SidebarContent className="ps-4 pe-2">
        {/* We create a SidebarGroup for each parent. */}
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel className="text-gray-400">
              {item.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((subItem) => (
                  <SidebarMenuItem key={subItem.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === subItem.url}
                    >
                      <Link href={subItem.url} className="flex items-center gap-2">
                        {"icon" in subItem && subItem.icon && <subItem.icon className="h-4 w-4" />}
                        <span>{subItem.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="block p-4 md:hidden">
          <Button
            onClick={handleLogout}
            className="bg-infinity w-full rounded border"
          >
            Logout
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
    <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {data.navMain.map((group) => (
            <div key={group.title}>
            <CommandGroup key={group.title} heading={group.title} className="py-4">
              {group.items.map((item) => (
                <CommandItem
                  key={item.title}
                  onSelect={() => runCommand(() => router.push(item.url))}
                >
                  <div className="flex items-center gap-2">
                    {"icon" in item && item.icon && <item.icon className="h-4 w-4" />}
                    <span>{item.title}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
              <CommandSeparator />
              </div>
          ))}
          
        </CommandList>
      </CommandDialog>
    </>
  );
}
