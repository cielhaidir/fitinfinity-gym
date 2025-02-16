import type * as React from "react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SearchForm } from "./search-form";
import { VersionSwitcher } from "./version-switcher";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

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

// This is sample data.
const data = {
  versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
  navMain: [
    {
      title: "Management",
      url: "#",
      items: [
        {
          title: "Personal Trainer",
          url: "/management/personal-trainer",
        },
        {
          title: "Role",
          url: "#",
        },
      ],
    },
    {
      title: "Admin",
      url: "/admin/dashboard",
      items: [
        {
          title: "Dashboard",
          url: "/admin/dashboard",
        },
        {
          title: "Users",
          url: "/admin/users",
        },
        {
          title: "Settings",
          url: "/admin/settings",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const handleLogout = () => {
    signOut();
  };

  return (
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
        <SearchForm />
      </SidebarHeader>
      <SidebarContent>
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
                      <Link href={subItem.url}>{subItem.title}</Link>
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
  );
}
