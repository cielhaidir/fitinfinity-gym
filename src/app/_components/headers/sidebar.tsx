import * as React from "react";
import Link from "next/link";
import { ChevronDown } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileCog, Bot, UserRoundIcon as UserRoundPen } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const items = [
  {
    title: "Whatsapp",
    url: "/admin/whatsapp",
    icon: Bot,
  },
  {
    title: "Feature",
    url: "/admin/feature",
    icon: FileCog,
    children: [
      {
        title: "Bot Action",
        url: "/admin/feature/trigger",
      }
    ]
  },
];

interface MenuItem {
  title: string;
  url: string;
  icon?: React.ElementType;
  children?: MenuItem[];
}

const MenuItemComponent: React.FC<{ item: MenuItem; depth?: number }> = ({ item, depth = 0 }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (item.children && item.children.length > 0) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="w-full">
            <div className="flex items-center">
              {depth > 0 && (
                <div className="h-6 w-px bg-sidebar-border" />
              )}
                {item.icon && <item.icon className="mr-4 h-4 w-4" />}
              <span>{item.title}</span>
            </div>
            <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-4 border-l border-sidebar-border">
            {item.children.map((child) => (
              <MenuItemComponent key={child.url} item={child} depth={depth + 1} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild className="w-full">
        <Link href={item.url} className="flex items-center">
          {depth > 0 && (
            <div className=" h-6 w-px bg-sidebar-border" />
          )}
          {item.icon && <item.icon className="mr-2 h-4 w-4" />}
          <span >{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export function AppSidebar({ user }: { user?: any }) {
  return (
    <Sidebar className="shadow-lg">
      <SidebarContent className="dark:bg-slate-800">
        <SidebarGroup>
          <div className="px-2">
            <div className="ms-4 mt-5 text-xl font-semibold text-blue-500">
              <h2>
                <a href="/">Dashboard Geekhub</a>
              </h2>
            </div>
          </div>
          <div className="divider"></div>
          <div className="px-4">
            <div className="flex items-center">
              <Avatar>
                <AvatarImage src={user?.image} alt={user?.name} />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <div className="ml-4">
                <div className="text-sm font-semibold">{user?.name}</div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </div>
            </div>
          </div>
          <div className="divider"></div>
          <div className="px-3">
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <MenuItemComponent key={item.url} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </div>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

